import { Api } from './api'
import { locateText, resolveQuoteStrict, selectorsFromRange } from './anchor'
import { renderMarkdown } from './markdown'

type Quote = { id: string; selector: any; text: string; dismissed?: boolean }
type Opts = { api: Api; root: HTMLElement; source: string; commitSha: string | null; userName: string; onClose: () => void }

const HL = !!(window as any).CSS?.highlights && typeof (globalThis as any).Highlight !== 'undefined'

// A reader's evolving response document for the current page: a markdown essay
// plus anchored quotes of the source. Private to the reader (server-enforced).
export class ResponsePanel {
  private api: Api
  private root: HTMLElement
  private source: string
  private commitSha: string | null
  private userName: string
  private onClose: () => void

  private el!: HTMLElement
  private ta!: HTMLTextAreaElement
  private body = ''
  private quotes: Quote[] = []
  private mode: 'write' | 'preview' = 'write'
  private seq = 0
  private saveTimer: any = null
  private savedAt = ''

  constructor(o: Opts) {
    this.api = o.api; this.root = o.root; this.source = o.source
    this.commitSha = o.commitSha; this.userName = o.userName; this.onClose = o.onClose
  }

  async open() {
    const existing = await this.api.getResponse(this.source).catch(() => null)
    if (existing) { this.body = existing.body ?? ''; this.quotes = existing.quotes ?? []; this.savedAt = existing.updated ?? '' }
    this.build()
    this.renderRefs()
    this.renderQuoteHighlights()
  }

  close() {
    this.flushSave()
    if (HL) { const h = (window as any).CSS.highlights; h.delete('penumbra-quote'); h.delete('penumbra-quote-active') }
    this.el?.remove()
    this.onClose()
  }

  // ---- build DOM ----
  private build() {
    const el = document.createElement('div')
    el.className = 'pen-panel'
    el.setAttribute('data-pen-ui', '')
    el.innerHTML = `
      <div class="pen-panel-head">
        <strong>Your response</strong>
        <span class="pen-savestate" data-save></span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="mode" title="Toggle preview">Preview</button>
        <button class="pen-btn" data-act="submit" title="Commit this response to the author's repo">Submit</button>
        <button class="pen-tbtn" data-act="close" title="Close">✕</button>
      </div>
      <div class="pen-panel-tools">
        <button class="pen-btn ghost" data-act="quote">＋ Insert quote from selection</button>
      </div>
      <div class="pen-refs" data-refs></div>
      <textarea class="pen-essay" data-essay placeholder="Write your response. Quote the text, then build your own argument…  Paste a passage and Penumbra will try to anchor it back to the source."></textarea>
      <div class="pen-preview" data-preview hidden></div>`
    document.body.appendChild(el)
    this.el = el
    this.ta = el.querySelector('[data-essay]') as HTMLTextAreaElement
    this.ta.value = this.body

    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    el.querySelector('[data-act="mode"]')!.addEventListener('click', () => this.toggleMode())
    el.querySelector('[data-act="submit"]')!.addEventListener('click', () => this.submit())
    el.querySelector('[data-act="quote"]')!.addEventListener('click', () => this.insertQuoteFromSelection())
    this.ta.addEventListener('input', () => { this.body = this.ta.value; this.scheduleSave() })
    this.ta.addEventListener('paste', (e) => this.onPaste(e))
  }

  // ---- quotes ----
  insertQuoteFromSelection() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim() || !this.root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      this.setSave('select text in the page first'); return
    }
    const range = sel.getRangeAt(0)
    const selectors = selectorsFromRange(range, this.root)
    if (!selectors) return
    const exact = (selectors.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (this.quotes.some((q) => q.text === exact)) { this.setSave('already quoted'); return }
    const id = `q${++this.seq}-${Date.now() % 100000}`
    this.quotes.push({ id, selector: selectors, text: exact, dismissed: false })
    this.insertAtCursor(`\n> ${exact.replace(/\n/g, ' ')}\n\n`)
    sel.removeAllRanges()
    this.renderRefs(); this.renderQuoteHighlights(); this.scheduleSave()
  }

  private onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain') ?? ''
    // Let the browser insert the text; we just try to anchor it in the background.
    setTimeout(() => {
      this.body = this.ta.value; this.scheduleSave()
      const found = locateText(text, this.root)
      if (found) {
        const exact = (found.find((s: any) => s.type === 'TextQuoteSelector') as any).exact
        if (!this.quotes.some((q) => q.text === exact)) {
          this.quotes.push({ id: `q${++this.seq}-${Date.now() % 100000}`, selector: found, text: exact, dismissed: false })
          this.renderRefs(); this.renderQuoteHighlights()
        }
      }
    }, 0)
  }

  private insertAtCursor(text: string) {
    const s = this.ta.selectionStart, e = this.ta.selectionEnd
    this.ta.value = this.ta.value.slice(0, s) + text + this.ta.value.slice(e)
    this.ta.selectionStart = this.ta.selectionEnd = s + text.length
    this.body = this.ta.value
    this.ta.focus()
  }

  private quoteRange(q: Quote): Range | null {
    return resolveQuoteStrict(q.selector, this.root)
  }

  private renderRefs() {
    const wrap = this.el.querySelector('[data-refs]') as HTMLElement
    if (!this.quotes.length) { wrap.innerHTML = ''; return }
    wrap.innerHTML = `<div class="pen-refs-title">References</div>` + this.quotes.map((q) => {
      const present = !!this.quoteRange(q)
      const stale = !present || q.dismissed
      return `<div class="pen-ref ${stale ? 'stale' : ''}" data-q="${q.id}">
        <span class="pen-ref-dot ${present ? (q.dismissed ? 'dim' : 'ok') : 'gone'}"></span>
        <span class="pen-ref-text">${escapeHtml(q.text)}</span>
        <span class="pen-ref-acts">
          ${!present ? '<em title="The source text changed here">source changed</em>' : ''}
          <a data-ref-act="toggle" data-id="${q.id}">${q.dismissed ? 'restore' : 'dismiss'}</a>
        </span></div>`
    }).join('')
    wrap.querySelectorAll('[data-ref-act="toggle"]').forEach((a) =>
      a.addEventListener('click', (e) => { e.stopPropagation(); this.toggleDismiss((a as HTMLElement).dataset.id!) }))
    wrap.querySelectorAll('.pen-ref').forEach((r) =>
      r.addEventListener('click', () => this.focusQuote((r as HTMLElement).dataset.q!)))
  }

  private toggleDismiss(id: string) {
    const q = this.quotes.find((x) => x.id === id); if (!q) return
    q.dismissed = !q.dismissed
    this.renderRefs(); this.renderQuoteHighlights(); this.scheduleSave()
  }

  private focusQuote(id: string) {
    const q = this.quotes.find((x) => x.id === id); if (!q) return
    const range = this.quoteRange(q); if (!range) return
    if (HL) (window as any).CSS.highlights.set('penumbra-quote-active', new (globalThis as any).Highlight(range))
    const r = range.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' })
  }

  private renderQuoteHighlights() {
    if (!HL) return
    const ranges = this.quotes.filter((q) => !q.dismissed).map((q) => this.quoteRange(q)).filter(Boolean) as Range[]
    const h = (window as any).CSS.highlights
    if (ranges.length) h.set('penumbra-quote', new (globalThis as any).Highlight(...ranges)); else h.delete('penumbra-quote')
  }

  // ---- preview ----
  private toggleMode() {
    this.mode = this.mode === 'write' ? 'preview' : 'write'
    const pv = this.el.querySelector('[data-preview]') as HTMLElement
    const btn = this.el.querySelector('[data-act="mode"]') as HTMLElement
    if (this.mode === 'preview') {
      pv.innerHTML = renderMarkdown(this.composeMarkdown()); pv.hidden = false; this.ta.hidden = true; btn.textContent = 'Write'
    } else { pv.hidden = true; this.ta.hidden = false; btn.textContent = 'Preview' }
  }

  // The doc as it would be committed: essay body + a trailing references block.
  composeMarkdown(): string {
    let md = this.body.trim()
    const live = this.quotes.filter((q) => !q.dismissed)
    if (live.length) {
      md += '\n\n---\n\n**Quoting:**\n\n' + live.map((q) => `> ${q.text.replace(/\n/g, ' ')}`).join('\n>\n')
    }
    return md
  }

  // ---- save ----
  private scheduleSave() {
    this.setSave('saving…')
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flushSave(), 800)
  }
  private async flushSave() {
    clearTimeout(this.saveTimer)
    try {
      const res = await this.api.saveResponse(this.source, this.body, this.quotes, this.commitSha)
      this.savedAt = res.updated ?? ''; this.setSave('saved')
    } catch (e: any) { this.setSave('save failed') }
  }
  private setSave(s: string) {
    const el = this.el?.querySelector('[data-save]'); if (el) el.textContent = s
  }

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
      alert(notReady
        ? "Submitting to the repo isn't enabled yet — the author needs to add a GitHub token. Your draft is saved."
        : 'Submit failed: ' + e.message)
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
            <div class="pen-md">${renderMarkdown(r.body || '_(quotes only — no writing yet)_')}</div>
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
    this.el?.remove(); this.onClose()
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
const fmtDate = (iso: string): string => { try { return new Date(iso).toLocaleDateString() } catch { return '' } }
const trunc = (s: string, n = 60): string => (s.length > n ? s.slice(0, n) + '…' : s)
