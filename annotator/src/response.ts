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
  private mode: 'write' | 'preview' = 'write'
  private saveTimer: any = null
  private savedAt = ''

  constructor(o: Opts) {
    this.api = o.api; this.root = o.root; this.source = o.source
    this.commitSha = o.commitSha; this.userName = o.userName; this.onClose = o.onClose
  }

  async open() {
    const existing = await this.api.getResponse(this.source).catch(() => null)
    if (existing) { this.body = existing.body ?? ''; this.savedAt = existing.updated ?? '' }
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
    pushAside()
    this.ta = el.querySelector('[data-essay]') as HTMLTextAreaElement
    this.ta.value = this.body

    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close())
    el.querySelector('[data-act="mode"]')!.addEventListener('click', () => this.toggleMode())
    el.querySelector('[data-act="submit"]')!.addEventListener('click', () => this.submit())
    this.ta.addEventListener('input', () => { this.body = this.ta.value; this.renderQuoteHighlights(); this.scheduleSave() })
    this.ta.addEventListener('paste', () => this.onPaste())
    this.ta.addEventListener('keyup', () => this.amplifyAtCursor())
    this.ta.addEventListener('click', () => this.amplifyAtCursor())
  }

  // ---- quotes: derived ENTIRELY from the essay text (the single source) ----
  // Append a blockquote of the page selection to the end of the response.
  appendQuote(range: Range) {
    const sels = selectorsFromRange(range, this.root)
    const exact = (sels?.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (!exact) return
    this.body = `${this.ta.value.replace(/\s+$/, '')}\n\n> ${exact.replace(/\n/g, ' ')}\n\n`
    this.ta.value = this.body
    this.ta.selectionStart = this.ta.selectionEnd = this.ta.value.length
    this.ta.focus()
    this.renderQuoteHighlights(); this.scheduleSave()
  }

  private onPaste() {
    setTimeout(() => { this.body = this.ta.value; this.renderQuoteHighlights(); this.scheduleSave() }, 0)
  }

  // Pull blockquote passages from the essay (consecutive '>' lines = one quote).
  private extractQuotes(): string[] {
    const out: string[] = []; let cur: string[] = []
    for (const ln of this.ta.value.split('\n')) {
      if (/^\s*>/.test(ln)) cur.push(ln.replace(/^\s*>\s?/, ''))
      else if (cur.length) { out.push(cur.join(' ').trim()); cur = [] }
    }
    if (cur.length) out.push(cur.join(' ').trim())
    return out.filter((t) => t.length >= 6)
  }

  private rangeFor(text: string): Range | null {
    return resolveQuoteStrict([{ type: 'TextQuoteSelector', exact: text } as any], this.root)
  }

  // Highlights derive from the current blockquotes, so editing or deleting a
  // quote moves/removes its source highlight to match — no drift.
  private renderQuoteHighlights() {
    if (!HL) return
    const ranges = this.extractQuotes().map((t) => this.rangeFor(t)).filter(Boolean) as Range[]
    const h = (window as any).CSS.highlights
    if (ranges.length) h.set('penumbra-quote', new (globalThis as any).Highlight(...ranges)); else h.delete('penumbra-quote')
  }

  // Emphasize the source for the quote that owns the cursor — whether the cursor
  // is on the blockquote line or in the prose beneath it (up to the prior quote).
  private amplifyAtCursor() {
    const lines = this.ta.value.split('\n')
    const li = this.ta.value.slice(0, this.ta.selectionStart).split('\n').length - 1
    let i = li
    while (i >= 0 && !/^\s*>/.test(lines[i] ?? '')) i--
    if (i < 0) return this.amplify(null)
    let s = i, e = i
    while (s > 0 && /^\s*>/.test(lines[s - 1])) s--
    while (e < lines.length - 1 && /^\s*>/.test(lines[e + 1])) e++
    this.amplify(lines.slice(s, e + 1).map((l) => l.replace(/^\s*>\s?/, '')).join(' ').trim())
  }
  private amplify(text: string | null) {
    if (!HL) return
    const h = (window as any).CSS.highlights
    const r = text && text.length >= 6 ? this.rangeFor(text) : null
    if (r) h.set('penumbra-quote-active', new (globalThis as any).Highlight(r)); else h.delete('penumbra-quote-active')
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
        bq.addEventListener('mouseenter', () => this.amplify(t))
        bq.addEventListener('mouseleave', () => this.amplify(null))
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
    // Quote anchors are derived from the essay text at save time (no drift).
    const quotes = this.extractQuotes().map((text, i) => ({
      id: `q${i}`, text, selector: locateText(text, this.root) ?? [{ type: 'TextQuoteSelector', exact: text }],
    }))
    try {
      const res = await this.api.saveResponse(this.source, this.body, quotes, this.commitSha)
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

// Push the page aside so a panel docks beside content instead of overlapping it.
function pushAside() {
  document.body.classList.add('pen-panel-open')
}
function unpushAside() {
  document.body.classList.remove('pen-panel-open')
}
