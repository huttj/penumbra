import { Api } from './api'
import { locateText, resolveQuoteStrict, selectorsFromRange } from './anchor'
import { renderMarkdown } from './markdown'

type Quote = { id: string; selector: any; text: string }
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
    this.renderQuoteHighlights()
  }

  close() {
    this.flushSave()
    if (HL) { const h = (window as any).CSS.highlights; h.delete('penumbra-quote'); h.delete('penumbra-quote-active') }
    this.el?.remove()
    unpushAside()
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
      <textarea class="pen-essay" data-essay placeholder="Write your response. Select text in the page to quote it; paste a passage and Penumbra will try to anchor it to the source."></textarea>
      <div class="pen-preview" data-preview hidden></div>`
    document.body.appendChild(el)
    this.el = el
    pushAside(el.offsetWidth)
    this.ta = el.querySelector('[data-essay]') as HTMLTextAreaElement
    this.ta.value = this.body

    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    el.querySelector('[data-act="mode"]')!.addEventListener('click', () => this.toggleMode())
    el.querySelector('[data-act="submit"]')!.addEventListener('click', () => this.submit())
    this.ta.addEventListener('input', () => { this.body = this.ta.value; this.scheduleSave() })
    this.ta.addEventListener('paste', (e) => this.onPaste(e))
    this.ta.addEventListener('keyup', () => this.amplifyAtCursor())
    this.ta.addEventListener('click', () => this.amplifyAtCursor())
  }

  // ---- quotes ----
  // Append a blockquote of the page selection to the end of the response, and
  // record its anchor so it can be highlighted in the source.
  appendQuote(range: Range) {
    const selectors = selectorsFromRange(range, this.root)
    if (!selectors) return
    const exact = (selectors.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (!exact) return
    if (!this.quotes.some((q) => q.text === exact)) this.quotes.push({ id: `q${++this.seq}`, selector: selectors, text: exact })
    this.body = `${this.ta.value.replace(/\s+$/, '')}\n\n> ${exact.replace(/\n/g, ' ')}\n\n`
    this.ta.value = this.body
    this.ta.selectionStart = this.ta.selectionEnd = this.ta.value.length
    this.ta.focus()
    this.renderQuoteHighlights(); this.scheduleSave()
  }

  private onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain') ?? ''
    // Let the browser insert the text; just try to anchor it in the background.
    setTimeout(() => {
      this.body = this.ta.value; this.scheduleSave()
      const found = locateText(text, this.root)
      if (found) {
        const exact = (found.find((s: any) => s.type === 'TextQuoteSelector') as any).exact
        if (!this.quotes.some((q) => q.text === exact)) { this.quotes.push({ id: `q${++this.seq}`, selector: found, text: exact }); this.renderQuoteHighlights() }
      }
    }, 0)
  }

  private quoteRange(q: Quote): Range | null {
    return resolveQuoteStrict(q.selector, this.root)
  }

  // Every quote that still matches gets a subtle highlight in the source doc.
  private renderQuoteHighlights() {
    if (!HL) return
    const ranges = this.quotes.map((q) => this.quoteRange(q)).filter(Boolean) as Range[]
    const h = (window as any).CSS.highlights
    if (ranges.length) h.set('penumbra-quote', new (globalThis as any).Highlight(...ranges)); else h.delete('penumbra-quote')
  }

  // Emphasize the source highlight for the quote the editor cursor sits in.
  private amplifyAtCursor() {
    const text = this.ta.value, pos = this.ta.selectionStart
    const start = text.lastIndexOf('\n', pos - 1) + 1
    let end = text.indexOf('\n', pos); if (end < 0) end = text.length
    const line = text.slice(start, end).replace(/^>\s?/, '').trim()
    const q = line.length >= 6 ? this.quotes.find((x) => x.text.includes(line) || line.includes(x.text)) : undefined
    this.amplify(q)
  }
  private amplify(q?: Quote) {
    if (!HL) return
    const h = (window as any).CSS.highlights
    const range = q ? this.quoteRange(q) : null
    if (range) h.set('penumbra-quote-active', new (globalThis as any).Highlight(range)); else h.delete('penumbra-quote-active')
  }

  // ---- preview ----
  private toggleMode() {
    this.mode = this.mode === 'write' ? 'preview' : 'write'
    const pv = this.el.querySelector('[data-preview]') as HTMLElement
    const btn = this.el.querySelector('[data-act="mode"]') as HTMLElement
    if (this.mode === 'preview') {
      pv.innerHTML = renderMarkdown(this.composeMarkdown())
      // hovering a quoted passage in the preview amplifies it in the source
      pv.querySelectorAll('blockquote').forEach((bq) => {
        const t = (bq.textContent ?? '').trim()
        const q = this.quotes.find((x) => x.text.includes(t) || t.includes(x.text))
        if (q) {
          bq.addEventListener('mouseenter', () => this.amplify(q))
          bq.addEventListener('mouseleave', () => this.amplify(undefined))
        }
      })
      pv.hidden = false; this.ta.hidden = true; btn.textContent = 'Edit'
    } else { pv.hidden = true; this.ta.hidden = false; btn.textContent = 'Preview' }
  }

  // The committed doc is just the essay — quotes are inline blockquotes already.
  composeMarkdown(): string {
    return this.body.trim()
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
    pushAside(el.offsetWidth)
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

// Push the page aside so a panel docks beside content instead of overlapping it.
function pushAside(px: number) {
  document.body.classList.add('pen-panel-open')
  document.body.style.transition = 'margin-right .2s ease'
  document.body.style.marginRight = `${px}px`
}
function unpushAside() {
  document.body.classList.remove('pen-panel-open')
  document.body.style.marginRight = ''
}
