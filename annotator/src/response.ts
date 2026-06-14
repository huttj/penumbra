import { Api } from './api'
import { locateText, resolveQuoteStrict, selectorsFromRange } from './anchor'
import { extractBlockquotes, renderMarkdown } from './markdown'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'

type Opts = { api: Api; root: HTMLElement; source: string; commitSha: string | null; userName: string; onClose: () => void }

const HL = !!(window as any).CSS?.highlights && typeof (globalThis as any).Highlight !== 'undefined'

// A reader's response doc, edited as rich text (TipTap). Stored as markdown, so it
// stays the single source the page margins are derived from. Blockquotes are the
// anchored quotes; everything else is the reader's writing (links, images, lists…).
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
    unpushAside()
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
        <button class="pen-btn" data-act="submit" title="Commit this response to the author's repo">Submit</button>
        <button class="pen-tbtn" data-act="close" title="Close">✕</button>
      </div>
      <div class="pen-editor" data-editor></div>`
    document.body.appendChild(el)
    this.el = el
    pushAside()

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
        this.body = (this.editor.storage as any).markdown.getMarkdown()
        this.renderQuoteHighlights(); this.wireBlockquoteHover(); this.scheduleSave()
      },
      onSelectionUpdate: () => this.amplifyAtCursor(),
    })

    this.wireBlockquoteHover()
    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    el.querySelector('[data-act="submit"]')!.addEventListener('click', () => this.submit())
    document.addEventListener('mousemove', this.onSourceHover, { passive: true })
    setTimeout(() => this.editor.commands.focus('end'), 0)
  }

  // ---- quotes ----
  // Append a blockquote of the page selection to the end of the response.
  appendQuote(range: Range) {
    const exact = (selectorsFromRange(range, this.root)?.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (!exact) return
    const end = this.editor.state.doc.content.size
    this.editor.chain().focus('end')
      .insertContentAt(end, { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: exact }] }] })
      .insertContentAt(this.editor.state.doc.content.size, { type: 'paragraph' })
      .run()
  }

  private handleImagePaste(e: ClipboardEvent): boolean {
    const items = e.clipboardData?.items
    if (!items) return false
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = () => this.editor.chain().focus().setImage({ src: String(reader.result) }).run()
          reader.readAsDataURL(file) // inline base64 for now (R2 upload later)
          return true
        }
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

  // hover a blockquote in the editor → emphasize its source highlight
  private wireBlockquoteHover() {
    this.el.querySelectorAll<HTMLElement>('.pen-prose blockquote').forEach((bq) => {
      const t = (bq.textContent ?? '').trim()
      bq.onmouseenter = () => this.amplify(t)
      bq.onmouseleave = () => this.amplify(null)
    })
  }

  // cursor inside a blockquote → emphasize its source highlight
  private amplifyAtCursor() {
    const $from = this.editor.state.selection.$from
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'blockquote') return this.amplify($from.node(d).textContent.trim())
    }
    this.amplify(null)
  }

  private amplify(text: string | null) {
    if (!HL) return
    const h = (window as any).CSS.highlights
    const r = text && text.length >= 6 ? this.rangeFor(text) : null
    if (r) h.set('penumbra-quote-active', new (globalThis as any).Highlight(r)); else h.delete('penumbra-quote-active')
  }

  // hover a source highlight → emphasize it + flash the matching blockquote in the editor
  private onSourceHover = (e: MouseEvent) => {
    if (this.hoverRaf) return
    this.hoverRaf = true
    requestAnimationFrame(() => {
      this.hoverRaf = false
      if ((e.target as HTMLElement)?.closest?.('[data-pen-ui]')) return
      for (const t of extractBlockquotes(this.body)) {
        const r = this.rangeFor(t)
        if (r && [...r.getClientRects()].some((rc) => e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom)) {
          this.amplify(t); this.flashBlockquote(t); return
        }
      }
    })
  }
  private flashBlockquote(text: string) {
    let hit: HTMLElement | null = null
    this.el.querySelectorAll<HTMLElement>('.pen-prose blockquote').forEach((bq) => {
      const on = (bq.textContent ?? '').trim() === text
      bq.classList.toggle('pen-bq-active', on)
      if (on) hit = bq
    })
    if (hit) (hit as HTMLElement).scrollIntoView({ block: 'nearest' })
  }

  // ---- save / submit ----
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
    try { const res = await this.api.saveResponse(this.source, this.body, quotes, this.commitSha); this.setSave(res ? 'saved' : 'saved') }
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

// Author-only: every reader's response to this page, collected. Read-only.
export class ReviewsPanel {
  private api: Api
  private root: HTMLElement
  private source: string
  private onClose: () => void
  private el!: HTMLElement
  private reviews: any[] = []

  constructor(o: { api: Api; root: HTMLElement; source: string; onClose: () => void }) {
    this.api = o.api; this.root = o.root; this.source = o.source; this.onClose = o.onClose
  }

  async open() {
    this.reviews = await this.api.getAllResponses(this.source).catch(() => [])
    const el = document.createElement('div')
    el.className = 'pen-panel'
    el.setAttribute('data-pen-ui', '')
    el.innerHTML = `
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">✕</button></div>
      <div class="pen-reviews" data-list></div>`
    const list = el.querySelector('[data-list]') as HTMLElement
    list.innerHTML = this.reviews.length
      ? this.reviews.map((r, ri) => {
          const quotes = (r.quotes ?? []).filter((q: any) => !q.dismissed)
          return `<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${escapeHtml(r.creator?.name ?? 'reader')}</span>
              <span class="pen-savestate">${fmtDate(r.updated)} · ${r.status}</span></div>
            <div class="pen-md">${renderMarkdown(r.body || '_(no writing yet)_')}</div>
            ${quotes.length ? `<div class="pen-review-quotes">${quotes
              .map((q: any, qi: number) => `<a class="pen-qchip" data-ri="${ri}" data-qi="${qi}">“${escapeHtml(trunc(q.text))}”</a>`)
              .join('')}</div>` : ''}
          </div>`
        }).join('')
      : `<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>`

    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    list.querySelectorAll('.pen-qchip').forEach((a) =>
      a.addEventListener('click', () => this.focusQuote(+(a as HTMLElement).dataset.ri!, +(a as HTMLElement).dataset.qi!)))
    document.body.appendChild(el)
    this.el = el
    pushAside()
  }

  private focusQuote(ri: number, qi: number) {
    const q = this.reviews[ri]?.quotes?.[qi]; if (!q) return
    const range = resolveQuoteStrict(q.selector, this.root); if (!range) return
    const h = (window as any).CSS?.highlights
    if (h) h.set('penumbra-quote-active', new (globalThis as any).Highlight(range))
    const r = range.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' })
  }

  close() {
    const h = (window as any).CSS?.highlights; if (h) h.delete('penumbra-quote-active')
    this.el?.remove(); unpushAside(); this.onClose()
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
const fmtDate = (iso: string): string => { try { return new Date(iso).toLocaleDateString() } catch { return '' } }
const trunc = (s: string, n = 60): string => (s.length > n ? s.slice(0, n) + '…' : s)

function pushAside() { document.body.classList.add('pen-panel-open') }
function unpushAside() { document.body.classList.remove('pen-panel-open') }
