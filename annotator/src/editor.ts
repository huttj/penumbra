// Lazily-loaded rich-text editor bundle (TipTap/ProseMirror). The core loads this
// on demand the first time the response panel is opened, so readers who never
// write a response don't pay for ~600KB of editor code.
import { Api } from './api'
import { locateText, occurrenceOf, resolveImageQuote, resolveNthQuote, selectorsFromRange, sourceText } from './anchor'
import { formatQuoteMarker, parseQuoteMarker } from './markdown'
import { syncImageOverlays } from './overlay'
import { Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import Paragraph from '@tiptap/extension-paragraph'
import Blockquote from '@tiptap/extension-blockquote'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'

type Opts = { api: Api; root: HTMLElement; source: string; commitSha: string | null; userName: string; onClose: () => void }

const HL = !!(window as any).CSS?.highlights && typeof (globalThis as any).Highlight !== 'undefined'
const MIN_QUOTE = 6 // a quote shorter than this can't be reliably anchored/highlighted

// Highlight the Nth blockquote via a ProseMirror Decoration — NOT by mutating the
// DOM directly, which fights ProseMirror's MutationObserver (it reverts the node,
// so a hand-set class flickers on/off and the node looks like it's being re-rendered).
const bqHlKey = new PluginKey<{ index: number }>('bqHighlight')
const BqHighlight = Extension.create({
  name: 'bqHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin<{ index: number }>({
        key: bqHlKey,
        state: {
          init: () => ({ index: -1 }),
          apply: (tr, value) => tr.getMeta(bqHlKey) ?? value,
        },
        props: {
          decorations(state) {
            const idx = bqHlKey.getState(state)?.index ?? -1
            if (idx < 0) return null
            const decos: Decoration[] = []
            let seen = -1
            state.doc.forEach((node, offset) => {
              if (node.type.name !== 'blockquote') return
              seen++
              if (seen === idx) decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'pen-bq-active' }))
            })
            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },
})

// Markdown can't hold an empty paragraph (blank lines collapse on round-trip), so
// every reader's intentional blank line would vanish. Fix: serialize an empty
// paragraph as a zero-width-space line (which markdown keeps), and strip that
// sentinel back to an empty paragraph on load. Handles middle AND trailing blanks.
const ZWSP = '​'
const KeepBlankParagraphs = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          if (node.content.size === 0) state.write(ZWSP)
          else state.renderInline(node)
          state.closeBlock(node)
        },
        parse: {},
      },
    }
  },
})
// Turn loaded sentinel paragraphs back into genuinely-empty ones (clean to edit).
function clearBlankSentinels(editor: Editor): void {
  const ranges: { from: number; to: number }[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.textContent === ZWSP) ranges.push({ from: pos + 1, to: pos + 1 + node.content.size })
  })
  if (!ranges.length) return
  const tr = editor.state.tr
  for (const r of ranges.reverse()) tr.delete(r.from, r.to)
  editor.view.dispatch(tr.setMeta('addToHistory', false))
}
// A blockquote that carries an occurrence index (which copy of repeated source
// text it quotes). The index isn't a visible part of the text; it round-trips
// through markdown via the `>N text` encoding handled below.
const QuoteBlock = Blockquote.extend({
  addAttributes() {
    return { nth: { default: 1, rendered: false } }
  },
})
// Strip `>N ` markers to plain `> ` before the editor parses (markdown-it doesn't
// know our convention); return the occurrence per blockquote in document order.
function stripQuoteMarkers(body: string): { clean: string; nths: number[] } {
  const nths: number[] = []
  const out: string[] = []
  let inQuote = false
  for (const line of (body ?? '').split('\n')) {
    if (/^\s*>/.test(line)) {
      if (!inQuote) { const pm = parseQuoteMarker(line); nths.push(pm.nth); out.push(`> ${pm.text}`); inQuote = true }
      else out.push(line)
    } else { inQuote = false; out.push(line) }
  }
  return { clean: out.join('\n'), nths }
}
// Re-attach the occurrence indices to the loaded blockquote nodes (same order).
function applyQuoteNths(editor: Editor, nths: number[]): void {
  const tr = editor.state.tr
  let i = 0, changed = false
  editor.state.doc.forEach((node, offset) => {
    if (node.type.name !== 'blockquote') return
    const want = nths[i] ?? 1; i++
    if ((node.attrs.nth ?? 1) !== want) { tr.setNodeAttribute(offset, 'nth', want); changed = true }
  })
  if (changed) editor.view.dispatch(tr.setMeta('addToHistory', false))
}
// TipTap serializes an image NODE inside a blockquote with blank `>` lines and
// stray `\` hard-breaks, which corrupts the quote. Collapse every blockquote run
// back to ONE clean line (text + inline `![](src)`), dropping blank lines, the
// zero-width sentinel, and trailing backslashes. Runs on marker-free getMarkdown
// output (the `>N` index is re-applied afterwards from node attrs).
function collapseQuoteBlocks(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    if (/^\s*>/.test(lines[i])) {
      const parts: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        const t = lines[i].replace(/^\s*>\s?/, '').replace(/\\\s*$/, '').replace(/​/g, '').trim()
        if (t) parts.push(t)
        i++
      }
      if (parts.length) out.push('> ' + parts.join(' '))
    } else { out.push(lines[i]); i++ }
  }
  return out.join('\n')
}

// getMarkdown, then re-encode each blockquote's occurrence index as `>N `.
function getMd(editor: Editor): string {
  const md = collapseQuoteBlocks((editor.storage as any).markdown.getMarkdown())
  const nths: number[] = []
  editor.state.doc.forEach((node) => { if (node.type.name === 'blockquote') nths.push(node.attrs.nth ?? 1) })
  if (!nths.some((n) => n > 1)) return md
  const lines = md.split('\n')
  let i = 0, inQuote = false
  for (let k = 0; k < lines.length; k++) {
    if (/^\s*>/.test(lines[k])) {
      if (!inQuote) { const nth = nths[i] ?? 1; i++; if (nth > 1) lines[k] = formatQuoteMarker(nth, parseQuoteMarker(lines[k]).text); inQuote = true }
    } else inQuote = false
  }
  return lines.join('\n')
}

// Comments never keep trailing blank lines (or the zero-width sentinel).
function stripTrailingBlanks(md: string): string {
  return md.replace(/[\s​]+$/, '')
}
// The response DOC: drop trailing blanks and force exactly one EXTRA blank line
// before every quote but the first (i.e. two blank lines) — matches serializeResponse.
function normalizeDocBlanks(md: string): string {
  const lines = stripTrailingBlanks(md).split('\n')
  const out: string[] = []
  let seenQuote = false, inQuote = false
  for (const line of lines) {
    const isQuote = /^\s*>/.test(line)
    if (isQuote && !inQuote) {
      if (seenQuote) {
        while (out.length && out[out.length - 1].replace(/​/g, '').trim() === '') out.pop()
        out.push('', '')
      }
      seenQuote = true
    }
    inQuote = isQuote
    out.push(line)
  }
  return out.join('\n')
}
// On load, insert an empty paragraph before each quote but the first, so the editor
// SHOWS the extra blank line (markdown collapses it on parse).
function ensureBlankBeforeQuotes(editor: Editor): void {
  const positions: number[] = []
  let seenQuote = false, prevEmptyPara = false
  editor.state.doc.forEach((node, offset) => {
    if (node.type.name === 'blockquote') {
      if (seenQuote && !prevEmptyPara) positions.push(offset)
      seenQuote = true
    }
    prevEmptyPara = node.type.name === 'paragraph' && node.content.size === 0
  })
  if (!positions.length) return
  const tr = editor.state.tr
  for (const pos of positions.reverse()) tr.insert(pos, editor.schema.nodes.paragraph.create())
  editor.view.dispatch(tr.setMeta('addToHistory', false))
}

export class ResponsePanel {
  private api: Api
  private root: HTMLElement
  private source: string
  private commitSha: string | null
  private onClose: () => void

  private el!: HTMLElement
  private overlayLayer!: HTMLElement
  private editor!: Editor
  private body = ''
  private saveTimer: any = null
  private hoverRaf = false
  private mounted = false
  private lastMd = ''
  private activeQuote = -1
  private srcText = ''
  private peek = false

  constructor(o: Opts) {
    this.api = o.api; this.root = o.root; this.source = o.source
    this.commitSha = o.commitSha; this.onClose = o.onClose
  }

  private isMobile = () => window.innerWidth <= 720
  // On a phone the panel is full-screen; pin its height to the visual viewport so
  // the editor scroll area sits above the on-screen keyboard instead of behind it.
  private onViewport = () => {
    const vv = window.visualViewport
    if (!vv || !this.el || this.peek) return // peek pins itself to the bottom via CSS
    this.el.style.top = `${vv.offsetTop}px`
    this.el.style.height = `${vv.height}px`
    this.el.style.bottom = 'auto'
  }
  // A resize reflows the source column → image overlay boxes need re-placing.
  private onResize = () => this.renderQuoteHighlights()

  // Peek: collapse the full-screen editor to a bottom bar so the reader can select
  // text in the page behind it. The page's "Quote" button then appends to the
  // response (via appendQuote) without leaving the panel. Mobile-only affordance.
  private enterPeek() {
    this.peek = true
    this.el.classList.add('pen-peek')
    this.el.style.top = ''; this.el.style.height = ''; this.el.style.bottom = '' // let CSS dock it
    ;(this.el.querySelector('[data-peekbar]') as HTMLElement).hidden = false
    this.editor.commands.blur() // drop the keyboard so the page is fully visible
  }
  private exitPeek() {
    this.peek = false
    this.el.classList.remove('pen-peek')
    ;(this.el.querySelector('[data-peekbar]') as HTMLElement).hidden = true
    this.onViewport() // restore the full-screen height
    window.getSelection()?.removeAllRanges()
    if (!this.editor.isDestroyed) this.editor.commands.focus('end')
  }
  private flashPeek(msg: string) {
    const el = this.el?.querySelector('[data-peekmsg]') as HTMLElement | null
    if (!el) return
    el.textContent = msg
    setTimeout(() => { if (this.peek) el.textContent = 'Select text in the page to quote it.' }, 1400)
  }

  async open() {
    this.body = (await this.api.getResponse(this.source).catch(() => null))?.body ?? ''
    this.build()
    this.renderQuoteHighlights()
  }

  close() {
    document.removeEventListener('mousemove', this.onSourceHover)
    document.removeEventListener('click', this.onSourceClick)
    window.visualViewport?.removeEventListener('resize', this.onViewport)
    window.visualViewport?.removeEventListener('scroll', this.onViewport)
    window.removeEventListener('resize', this.onResize)
    this.flushSave()
    if (HL) { const h = (window as any).CSS.highlights; h.delete('penumbra-quote'); h.delete('penumbra-quote-active') }
    this.editor?.destroy()
    this.overlayLayer?.remove()
    this.el?.remove()
    document.body.classList.remove('pen-panel-open')
    this.onClose()
  }

  private build() {
    const el = document.createElement('div')
    el.className = 'pen-panel'
    el.setAttribute('data-pen-ui', '')
    el.innerHTML = `
      <div class="pen-panel-head">
        <strong>Your response</strong>
        <span class="pen-savestate" data-save></span>
        <span style="flex:1"></span>
        <button class="pen-tbtn pen-quotebtn" data-act="quote" title="Quote text from the page">❝ Quote</button>
        <button class="pen-tbtn" data-act="close" title="Hide">⇥</button>
      </div>
      <div class="pen-peekbar" data-peekbar hidden>
        <span data-peekmsg>Select text in the page to quote it.</span>
        <button class="pen-btn" data-act="peekdone">Done</button>
      </div>
      <div class="pen-editor" data-editor></div>`
    document.body.appendChild(el)
    this.el = el
    // Document-anchored layer for image highlight boxes (the panel's analogue of
    // the core UI's overlay layer; images can't be painted by the Highlight API).
    this.overlayLayer = document.createElement('div')
    this.overlayLayer.setAttribute('data-pen-ui', '')
    this.overlayLayer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;'
    document.body.appendChild(this.overlayLayer)
    window.addEventListener('resize', this.onResize, { passive: true })
    document.body.classList.add('pen-panel-open')
    if (this.isMobile()) {
      this.onViewport()
      window.visualViewport?.addEventListener('resize', this.onViewport)
      window.visualViewport?.addEventListener('scroll', this.onViewport)
    }

    this.editor = new Editor({
      element: el.querySelector('[data-editor]') as HTMLElement,
      extensions: [
        StarterKit.configure({ paragraph: false, blockquote: false }),
        KeepBlankParagraphs,
        QuoteBlock,
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener' } }),
        Image.configure({ inline: false }), // block image; inline trapped the cursor and leaked note text into the quote
        Markdown.configure({ html: false, linkify: true, breaks: true, transformPastedText: true }),
        BqHighlight,
      ],
      content: stripQuoteMarkers(this.body).clean,
      editorProps: {
        attributes: { class: 'pen-prose', spellcheck: 'true' },
        handlePaste: (_view, event) => this.handleImagePaste(event),
      },
      onUpdate: () => {
        if (!this.mounted) return // ignore the initial content-parse update
        const md = normalizeDocBlanks(getMd(this.editor))
        if (md === this.lastMd) return
        this.lastMd = md
        this.body = md
        this.renderQuoteHighlights(); this.scheduleSave()
      },
      onSelectionUpdate: () => this.amplifyAtCursor(),
    })
    clearBlankSentinels(this.editor) // turn loaded blank-line sentinels back into empty paragraphs
    ensureBlankBeforeQuotes(this.editor) // show the extra blank line before quotes (markdown collapsed it)
    applyQuoteNths(this.editor, stripQuoteMarkers(this.body).nths) // re-attach occurrence indices
    this.mounted = true
    this.lastMd = normalizeDocBlanks(getMd(this.editor))

    // Delegated hover (survives ProseMirror re-renders): hovering a blockquote in
    // the editor emphasizes its source highlight; off a quote, falls back to cursor.
    const mount = el.querySelector('[data-editor]') as HTMLElement
    mount.addEventListener('mouseover', (e) => {
      this.setActiveQuote(-1)
      const bq = (e.target as HTMLElement).closest('blockquote')
      if (bq) {
        const idx = [...mount.querySelectorAll('blockquote')].indexOf(bq) // DOM order == doc order
        this.amplifyAnchor(idx >= 0 ? this.quoteAnchors()[idx] : null)
      } else this.amplifyAtCursor()
    })
    mount.addEventListener('mouseleave', () => this.amplifyAtCursor())
    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    el.querySelector('[data-act="quote"]')!.addEventListener('click', () => (this.peek ? this.exitPeek() : this.enterPeek()))
    el.querySelector('[data-act="peekdone"]')!.addEventListener('click', () => this.exitPeek())
    document.addEventListener('mousemove', this.onSourceHover, { passive: true })
    document.addEventListener('click', this.onSourceClick)
    setTimeout(() => { if (!this.editor.isDestroyed) this.editor.commands.focus('end') }, 0)

    // The occurrence picker: a tiny "N of M" badge with ‹ › on any quote whose text
    // repeats in the source, to pick which instance it points at.
    this.srcText = sourceText(this.root)
    const self = this
    this.editor.registerPlugin(new Plugin({
      key: new PluginKey('penOcc'),
      props: {
        decorations(state) {
          const decos: Decoration[] = []
          state.doc.forEach((node, offset) => {
            if (node.type.name !== 'blockquote') return
            const text = node.textContent.trim()
            const dim = () => decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'pen-bq-orphan' }))
            // Anything that won't anchor — too short, OR text not found in the source —
            // gets the single "not anchored" colour, and no occurrence picker.
            if (text.length < MIN_QUOTE) { dim(); return }
            const total = self.countOccurrences(text)
            if (total === 0) {
              dim()
            } else if (total > 1) {
              const nth = Math.min(node.attrs.nth ?? 1, total)
              decos.push(Decoration.widget(offset + 1, () => self.makeOccBadge(offset, nth, total), { side: -1, key: `occ-${offset}-${nth}-${total}` }))
            }
          })
          return DecorationSet.create(state.doc, decos)
        },
      },
    }))
  }

  private countOccurrences(text: string): number {
    return text ? this.srcText.split(text).length - 1 : 0
  }
  private makeOccBadge(offset: number, nth: number, total: number): HTMLElement {
    const el = document.createElement('span')
    el.className = 'pen-occ'
    el.innerHTML = `<button class="pen-occ-a" data-d="-1" title="Previous match">‹</button>` +
      `<span class="pen-occ-n">${nth} of ${total}</span>` +
      `<button class="pen-occ-a" data-d="1" title="Next match">›</button>`
    el.querySelectorAll<HTMLButtonElement>('.pen-occ-a').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault()) // keep editor focus
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.setQuoteNth(offset, nth + Number(b.dataset.d), total) })
    })
    return el
  }
  private setQuoteNth(offset: number, nth: number, total: number) {
    const node = this.editor.state.doc.nodeAt(offset)
    if (!node || node.type.name !== 'blockquote') return
    const wrapped = ((nth - 1 + total) % total) + 1 // cycle within 1..total
    this.editor.view.dispatch(this.editor.state.tr.setNodeAttribute(offset, 'nth', wrapped))
    this.editor.commands.focus(null, { scrollIntoView: false })
  }

  appendQuote(range: Range) {
    const exact = (selectorsFromRange(range, this.root)?.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (!exact) return
    const nth = occurrenceOf(range, this.root) // pin which copy of repeated text this is
    const doc = this.editor.state.doc
    const last = doc.lastChild
    const lastEmpty = !!last && last.type.name === 'paragraph' && last.content.size === 0
    const blockquote = { type: 'blockquote', attrs: { nth }, content: [{ type: 'paragraph', content: [{ type: 'text', text: exact }] }] }
    const chain = this.editor.chain()
    if (lastEmpty) {
      // reuse the existing trailing blank line; the cursor lands on it, after the quote
      chain.insertContentAt(doc.content.size - last!.nodeSize, blockquote)
    } else {
      // add the quote plus one fresh blank line; cursor on the new line
      chain.insertContentAt(doc.content.size, [blockquote, { type: 'paragraph' }])
    }
    // While peeking, don't steal focus (that would pop the keyboard and cover the
    // page mid-harvest) — just confirm so the reader can keep selecting more.
    if (this.peek) { chain.run(); this.flashPeek('Quote added ✓') } else chain.focus('end').run()
  }

  private handleImagePaste(e: ClipboardEvent): boolean {
    const items = e.clipboardData?.items
    if (!items) return false
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile()
        if (file) { void insertImage(this.editor, file, (f) => this.api.uploadImage(f)); return true }
      }
    }
    return false
  }

  // The editor's quotes (text + occurrence index), in document order — the
  // canonical list shared by the source ranges, DOM blockquotes, and doc nodes.
  // A blockquote can now interleave text runs and images. Its FIRST text run is the
  // anchor used for hit-testing/amplify (a stable, resolvable handle); the full set
  // of text runs and images is what gets highlighted (see quoteTargets).
  private firstTextRun(node: any): string {
    let run = ''
    let done = false
    node.descendants((child: any) => {
      if (done) return false
      if (child.type.name === 'image') { done = true; return false }
      if (child.isText) run += child.text
      return true
    })
    return run.trim()
  }
  private quoteAnchors(): { text: string; nth: number }[] {
    const out: { text: string; nth: number }[] = []
    this.editor.state.doc.forEach((node) => {
      if (node.type.name === 'blockquote') out.push({ text: this.firstTextRun(node), nth: node.attrs.nth ?? 1 })
    })
    return out
  }
  private rangeForAnchor(a: { text: string; nth: number } | null): Range | null {
    return a && a.text.trim().length >= MIN_QUOTE ? resolveNthQuote(a.text.trim(), a.nth, this.root) : null
  }
  // Every highlightable target across all blockquotes: text runs (resolved to source
  // ranges) and images (resolved to <img> elements for overlay boxes). The owning
  // blockquote's occurrence index pins its first text run; the rest default to 1.
  private quoteTargets(): { ranges: Range[]; imgs: HTMLImageElement[] } {
    const ranges: Range[] = []
    const imgs: HTMLImageElement[] = []
    this.editor.state.doc.forEach((bq) => {
      if (bq.type.name !== 'blockquote') return
      const nth = bq.attrs.nth ?? 1
      let run = ''
      let first = true
      const flush = () => {
        const t = run.trim(); run = ''
        if (t.length < MIN_QUOTE) return
        const r = resolveNthQuote(t, first ? nth : 1, this.root)
        if (r) ranges.push(r)
        first = false
      }
      // descendants() flattens inline AND block images alike into one ordered walk.
      bq.descendants((child: any) => {
        if (child.type.name === 'image') {
          flush()
          const el = child.attrs.src ? resolveImageQuote(`![](${child.attrs.src})`, 1, this.root) : null
          if (el) imgs.push(el)
          return false
        }
        if (child.isText) run += child.text
        return true
      })
      flush()
    })
    return { ranges, imgs }
  }
  private renderQuoteHighlights() {
    if (!HL) return
    const { ranges, imgs } = this.quoteTargets()
    const h = (window as any).CSS.highlights
    if (ranges.length) h.set('penumbra-quote', new (globalThis as any).Highlight(...ranges)); else h.delete('penumbra-quote')
    if (this.overlayLayer) syncImageOverlays(this.overlayLayer, imgs.map((img) => ({ img })))
  }
  // Emphasize the source quote at OR before the cursor: if the cursor sits in a
  // blockquote, that one; otherwise the nearest blockquote above it.
  private amplifyAtCursor() {
    const pos = this.editor.state.selection.from
    let hit: { text: string; nth: number } | null = null
    this.editor.state.doc.forEach((node, offset) => {
      if (node.type.name === 'blockquote' && offset <= pos) hit = { text: this.firstTextRun(node), nth: node.attrs.nth ?? 1 }
    })
    this.amplifyAnchor(hit)
  }
  private amplifyAnchor(a: { text: string; nth: number } | null) {
    if (!HL) return
    const h = (window as any).CSS.highlights
    const r = this.rangeForAnchor(a)
    if (r) h.set('penumbra-quote-active', new (globalThis as any).Highlight(r)); else h.delete('penumbra-quote-active')
  }
  // Which quote (by index) is under this pointer position? -1 if none.
  private hitQuoteIndex(e: MouseEvent): number {
    const anchors = this.quoteAnchors()
    for (let i = 0; i < anchors.length; i++) {
      const r = this.rangeForAnchor(anchors[i])
      if (r && [...r.getClientRects()].some((rc) => e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom)) return i
    }
    return -1
  }
  private onSourceHover = (e: MouseEvent) => {
    if (this.hoverRaf) return
    this.hoverRaf = true
    requestAnimationFrame(() => {
      this.hoverRaf = false
      if ((e.target as HTMLElement)?.closest?.('[data-pen-ui]')) return // over the editor: handled there
      const i = this.hitQuoteIndex(e)
      if (i >= 0) { this.amplifyAnchor(this.quoteAnchors()[i]); this.setActiveQuote(i) }
      else { this.setActiveQuote(-1); this.amplifyAtCursor() }
    })
  }
  // Clicking a source highlight drops the cursor on a blank line at the end of the
  // RESPONSE prose that quote owns (the writing after the blockquote).
  private onSourceClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement)?.closest?.('[data-pen-ui]')) return // clicks inside the editor/UI
    const i = this.hitQuoteIndex(e)
    if (i >= 0) this.cursorToResponse(i)
  }
  // Locate the Nth blockquote node; returns its offset + nodeSize, or null.
  private nthBlockquote(index: number): { offset: number; size: number } | null {
    let seen = -1, fOffset = -1, fSize = -1
    this.editor.state.doc.forEach((node, offset) => {
      if (fOffset >= 0 || node.type.name !== 'blockquote') return
      seen++
      if (seen === index) { fOffset = offset; fSize = node.nodeSize }
    })
    return fOffset >= 0 ? { offset: fOffset, size: fSize } : null
  }
  private cursorToResponse(index: number) {
    const bq = this.nthBlockquote(index)
    if (!bq) return
    const after = bq.offset + bq.size
    let done = false
    let sectionEnd = after // position just after the section's last block
    let lastBlankOffset = -1 // a trailing empty paragraph to reuse, if any
    this.editor.state.doc.forEach((node, offset) => {
      if (done || offset < after) return // skip up to & including the quote
      if (node.type.name === 'blockquote') { done = true; return } // next quote → section ends
      sectionEnd = offset + node.nodeSize
      lastBlankOffset = node.type.name === 'paragraph' && node.content.size === 0 ? offset : -1
    })
    let caret: number
    if (lastBlankOffset >= 0) {
      caret = lastBlankOffset + 1 // reuse the existing trailing blank line
    } else {
      this.editor.chain().insertContentAt(sectionEnd, { type: 'paragraph' }).run() // ensure one
      caret = sectionEnd + 1
    }
    const { state } = this.editor
    const sel = TextSelection.near(state.doc.resolve(Math.min(caret, state.doc.content.size)), 1)
    this.editor.view.dispatch(state.tr.setSelection(sel))
    this.editor.view.focus()
    this.setActiveQuote(index)
    this.scrollToQuote(index)
  }
  // Highlight the Nth blockquote via a Decoration (a no-op transaction that doesn't
  // change the doc) — ProseMirror applies the class itself, so nothing flickers.
  private setActiveQuote(index: number) {
    if (index === this.activeQuote) return
    this.activeQuote = index
    const { state, dispatch } = this.editor.view
    dispatch(state.tr.setMeta(bqHlKey, { index }))
  }
  private scrollToQuote(index: number) {
    const bq = this.nthBlockquote(index)
    const dom = bq && this.editor.view.nodeDOM(bq.offset)
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  private scheduleSave() {
    this.setSave('saving…')
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flushSave(), 800)
  }
  private async flushSave() {
    clearTimeout(this.saveTimer)
    const quotes = this.quoteAnchors().map((a, i) => {
      const text = a.text.trim()
      return { id: `q${i}`, text, selector: locateText(text, this.root) ?? [{ type: 'TextQuoteSelector', exact: text }] }
    })
    try { await this.api.saveResponse(this.source, this.body, quotes, this.commitSha); this.setSave('saved') }
    catch { this.setSave('save failed') }
  }
  private setSave(s: string) { const el = this.el?.querySelector('[data-save]'); if (el) el.textContent = s }

  private async submit() {
    await this.flushSave()
    this.setSave('submitting…')
    try {
      const res = await this.api.submitResponse(this.source)
      this.setSave('submitted ✓')
      if (res.url) window.open(res.url, '_blank')
    } catch (e: any) {
      const notReady = String(e.message).includes('not configured')
      this.setSave(notReady ? 'submit not enabled yet' : 'submit failed')
      alert(notReady ? "Submitting isn't enabled yet — the author needs to add a GitHub token. Your draft is saved." : 'Submit failed: ' + e.message)
    }
  }
}

// Upload the image and insert its URL; fall back to an inline base64 data-URI.
async function insertImage(editor: Editor, file: File, upload?: (f: File) => Promise<string>) {
  if (upload) {
    try { editor.chain().focus().setImage({ src: await upload(file) }).run(); return } catch { /* fall through */ }
  }
  const r = new FileReader()
  r.onload = () => editor.chain().focus().setImage({ src: String(r.result) }).run()
  r.readAsDataURL(file)
}

// A small standalone rich editor for inline margin-card comment editing.
export function createMiniEditor(mount: HTMLElement, markdown: string, opts: { onChange: (md: string) => void; uploadImage?: (f: File) => Promise<string>; onSubmit?: () => void }) {
  let mounted = false
  let last = markdown
  const editor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({ paragraph: false }),
      KeepBlankParagraphs,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener' } }),
      Image.configure({ inline: false }),
      Markdown.configure({ html: false, linkify: true, breaks: true, transformPastedText: true }),
    ],
    content: markdown,
    editorProps: {
      attributes: { class: 'pen-prose pen-mini', spellcheck: 'true' },
      handleKeyDown: (_v, e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { opts.onSubmit?.(); return true }
        return false
      },
      handlePaste: (_v, e) => {
        const items = (e as ClipboardEvent).clipboardData?.items
        if (items) {
          for (const it of items) {
            if (it.type.startsWith('image/')) {
              const f = it.getAsFile()
              if (f) { void insertImage(editor, f, opts.uploadImage); return true }
            }
          }
        }
        return false
      },
    },
    onUpdate: () => {
      if (!mounted) return // the initial content-parse update isn't a real edit
      const md = stripTrailingBlanks(getMd(editor)) // comments never keep trailing blanks
      if (md === last) return
      last = md
      opts.onChange(md)
    },
  })
  clearBlankSentinels(editor) // turn loaded blank-line sentinels back into empty paragraphs
  mounted = true
  last = stripTrailingBlanks(getMd(editor)) // baseline against the normalized init content
  return {
    destroy: () => editor.destroy(),
    getMarkdown: () => stripTrailingBlanks(getMd(editor)),
    focus: () => editor.commands.focus('end'),
    // Re-focus at the EXISTING cursor position without scrolling — used after a
    // reaction tap so the comment editor never loses its place.
    refocus: () => editor.commands.focus(null, { scrollIntoView: false }),
  }
}

;(window as any).__PenumbraResponsePanel = ResponsePanel
;(window as any).__PenumbraMiniEditor = createMiniEditor
