import { Api } from './api'
import { resolveQuoteStrict } from './anchor'
import { renderMarkdown } from './markdown'

// Author-only: every reader's response to this page, collected. Read-only — no
// TipTap here, so it stays in the small core bundle (the editor is lazy-loaded).
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
    document.body.classList.add('pen-panel-open')
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
    this.el?.remove()
    document.body.classList.remove('pen-panel-open')
    this.onClose()
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
const fmtDate = (iso: string): string => { try { return new Date(iso).toLocaleDateString() } catch { return '' } }
const trunc = (s: string, n = 60): string => (s.length > n ? s.slice(0, n) + '…' : s)
