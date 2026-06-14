// Lazily-loaded rich-text editor bundle (TipTap/ProseMirror). The core loads this
// on demand the first time the response panel is opened, so readers who never
// write a response don't pay for ~600KB of editor code.
import { Api } from './api'
import { locateText, resolveQuoteStrict, selectorsFromRange } from './anchor'
import { extractBlockquotes } from './markdown'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'

type Opts = { api: Api; root: HTMLElement; source: string; commitSha: string | null; userName: string; onClose: () => void }

const HL = !!(window as any).CSS?.highlights && typeof (globalThis as any).Highlight !== 'undefined'

export class ResponsePanel {
  private api: Api
  private root: HTMLElement
  private source: string
  private commitSha: string | null
  private onClose: () => void

  private el!: HTMLElement
  private editor!: Editor
  private body = ''
  private saveTimer: any = null
  private hoverRaf = false
  private mounted = false
  private lastMd = ''

  constructor(o: Opts) {
    this.api = o.api; this.root = o.root; this.source = o.source
    this.commitSha = o.commitSha; this.onClose = o.onClose
  }

  async open() {
    this.body = (await this.api.getResponse(this.source).catch(() => null))?.body ?? ''
    this.build()
    this.renderQuoteHighlights()
  }

  close() {
    document.removeEventListener('mousemove', this.onSourceHover)
    this.flushSave()
    if (HL) { const h = (window as any).CSS.highlights; h.delete('penumbra-quote'); h.delete('penumbra-quote-active') }
    this.editor?.destroy()
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
        <button class="pen-tbtn" data-act="close" title="Hide">⇥</button>
      </div>
      <div class="pen-editor" data-editor></div>`
    document.body.appendChild(el)
    this.el = el
    document.body.classList.add('pen-panel-open')

    this.editor = new Editor({
      element: el.querySelector('[data-editor]') as HTMLElement,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener' } }),
        Image.configure({ inline: false }),
        Markdown.configure({ html: false, linkify: true, breaks: true, transformPastedText: true }),
      ],
      content: this.body,
      editorProps: {
        attributes: { class: 'pen-prose', spellcheck: 'true' },
        handlePaste: (_view, event) => this.handleImagePaste(event),
      },
      onUpdate: () => {
        if (!this.mounted) return // ignore the initial content-parse update
        const md = (this.editor.storage as any).markdown.getMarkdown()
        if (md === this.lastMd) return
        this.lastMd = md
        this.body = md
        this.renderQuoteHighlights(); this.scheduleSave()
      },
      onSelectionUpdate: () => this.amplifyAtCursor(),
    })
    this.mounted = true
    this.lastMd = (this.editor.storage as any).markdown.getMarkdown()

    // Delegated hover (survives ProseMirror re-renders): hovering a blockquote in
    // the editor emphasizes its source highlight; off a quote, falls back to cursor.
    const mount = el.querySelector('[data-editor]') as HTMLElement
    mount.addEventListener('mouseover', (e) => {
      this.flashBlockquote(null)
      const bq = (e.target as HTMLElement).closest('blockquote')
      if (bq) this.amplify((bq.textContent ?? '').trim()); else this.amplifyAtCursor()
    })
    mount.addEventListener('mouseleave', () => this.amplifyAtCursor())
    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    document.addEventListener('mousemove', this.onSourceHover, { passive: true })
    setTimeout(() => this.editor.commands.focus('end'), 0)
  }

  appendQuote(range: Range) {
    const exact = (selectorsFromRange(range, this.root)?.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (!exact) return
    const doc = this.editor.state.doc
    const last = doc.lastChild
    const lastEmpty = !!last && last.type.name === 'paragraph' && last.content.size === 0
    const blockquote = { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: exact }] }] }
    if (lastEmpty) {
      // reuse the existing trailing blank line; the cursor lands on it, after the quote
      this.editor.chain().insertContentAt(doc.content.size - last!.nodeSize, blockquote).focus('end').run()
    } else {
      // add the quote plus one fresh blank line; cursor on the new line
      this.editor.chain().insertContentAt(doc.content.size, [blockquote, { type: 'paragraph' }]).focus('end').run()
    }
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

  private rangeFor(text: string): Range | null {
    return resolveQuoteStrict([{ type: 'TextQuoteSelector', exact: text } as any], this.root)
  }
  private renderQuoteHighlights() {
    if (!HL) return
    const ranges = extractBlockquotes(this.body).map((t) => this.rangeFor(t)).filter(Boolean) as Range[]
    const h = (window as any).CSS.highlights
    if (ranges.length) h.set('penumbra-quote', new (globalThis as any).Highlight(...ranges)); else h.delete('penumbra-quote')
  }
  // Emphasize the source quote at OR before the cursor: if the cursor sits in a
  // blockquote, that one; otherwise the nearest blockquote above it.
  private amplifyAtCursor() {
    const pos = this.editor.state.selection.from
    let text: string | null = null
    this.editor.state.doc.descendants((node, p) => {
      if (node.type.name === 'blockquote' && p <= pos) text = node.textContent.trim()
    })
    this.amplify(text)
  }
  private amplify(text: string | null) {
    if (!HL) return
    const h = (window as any).CSS.highlights
    const r = text && text.length >= 6 ? this.rangeFor(text) : null
    if (r) h.set('penumbra-quote-active', new (globalThis as any).Highlight(r)); else h.delete('penumbra-quote-active')
  }
  private onSourceHover = (e: MouseEvent) => {
    if (this.hoverRaf) return
    this.hoverRaf = true
    requestAnimationFrame(() => {
      this.hoverRaf = false
      if ((e.target as HTMLElement)?.closest?.('[data-pen-ui]')) return // over the editor: handled there
      let hit: string | null = null
      for (const t of extractBlockquotes(this.body)) {
        const r = this.rangeFor(t)
        if (r && [...r.getClientRects()].some((rc) => e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom)) { hit = t; break }
      }
      if (hit) { this.amplify(hit); this.flashBlockquote(hit) }
      else { this.flashBlockquote(null); this.amplifyAtCursor() }
    })
  }
  private flashBlockquote(text: string | null) {
    const target = text == null ? null : text.replace(/\s+/g, ' ').trim()
    let hit: HTMLElement | null = null
    this.el.querySelectorAll<HTMLElement>('.pen-prose blockquote').forEach((bq) => {
      const on = target != null && (bq.textContent ?? '').replace(/\s+/g, ' ').trim() === target
      bq.classList.toggle('pen-bq-active', on)
      if (on) hit = bq
    })
    if (hit) (hit as HTMLElement).scrollIntoView({ block: 'nearest' })
  }

  private scheduleSave() {
    this.setSave('saving…')
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flushSave(), 800)
  }
  private async flushSave() {
    clearTimeout(this.saveTimer)
    const quotes = extractBlockquotes(this.body).map((text, i) => ({
      id: `q${i}`, text, selector: locateText(text, this.root) ?? [{ type: 'TextQuoteSelector', exact: text }],
    }))
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
export function createMiniEditor(mount: HTMLElement, markdown: string, opts: { onChange: (md: string) => void; uploadImage?: (f: File) => Promise<string> }) {
  let mounted = false
  let last = markdown
  const editor = new Editor({
    element: mount,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener' } }),
      Image.configure({ inline: false }),
      Markdown.configure({ html: false, linkify: true, breaks: true, transformPastedText: true }),
    ],
    content: markdown,
    editorProps: {
      attributes: { class: 'pen-prose pen-mini', spellcheck: 'true' },
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
      const md = (editor.storage as any).markdown.getMarkdown()
      if (md === last) return
      last = md
      opts.onChange(md)
    },
  })
  mounted = true
  last = (editor.storage as any).markdown.getMarkdown() // baseline against the normalized init content
  return {
    destroy: () => editor.destroy(),
    getMarkdown: () => (editor.storage as any).markdown.getMarkdown(),
    focus: () => editor.commands.focus('end'),
  }
}

;(window as any).__PenumbraResponsePanel = ResponsePanel
;(window as any).__PenumbraMiniEditor = createMiniEditor
