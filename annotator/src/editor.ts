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
        <button class="pen-btn" data-act="submit" title="Commit this response to the author's repo">Submit</button>
        <button class="pen-tbtn" data-act="close" title="Close">✕</button>
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
          reader.readAsDataURL(file)
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
  private wireBlockquoteHover() {
    this.el.querySelectorAll<HTMLElement>('.pen-prose blockquote').forEach((bq) => {
      const t = (bq.textContent ?? '').trim()
      bq.onmouseenter = () => this.amplify(t)
      bq.onmouseleave = () => this.amplify(null)
    })
  }
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

;(window as any).__PenumbraResponsePanel = ResponsePanel
