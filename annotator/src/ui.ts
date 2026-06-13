import { Api, type Annotation, type User } from './api'
import { rangeFromSelectors, selectorsFromRange } from './anchor'
import { CSS } from './styles'

type Config = { api: string; source?: string; root?: string; docVersion?: string }

const HL_SUPPORTED = typeof (globalThis as any).Highlight !== 'undefined' && !!(CSS as any).highlights

export class Penumbra {
  private api: Api
  private root: HTMLElement
  private source: string
  private docVersion?: string
  private user: User | null = null
  private items = new Map<string, { anno: Annotation; range: Range | null }>()
  private addBtn?: HTMLButtonElement
  private card?: HTMLElement
  private loginEl?: HTMLElement
  private gutter: HTMLElement[] = []

  constructor(cfg: Config) {
    this.api = new Api(cfg.api)
    this.root = (cfg.root ? document.querySelector(cfg.root) : null) ?? document.body
    this.source = cfg.source ?? location.href
    this.docVersion = cfg.docVersion
  }

  async init() {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)

    if (this.api.captureTokenFromHash()) {/* token stored */}
    this.user = await this.api.me()
    this.renderLogin()

    await this.loadAnnotations()

    document.addEventListener('mouseup', () => setTimeout(() => this.onSelection(), 0))
    document.addEventListener('mousedown', (e) => this.onDocMouseDown(e))
    document.addEventListener('click', (e) => this.onDocClick(e))
    window.addEventListener('scroll', () => this.positionGutter(), { passive: true })
    window.addEventListener('resize', () => this.positionGutter())
  }

  // ---- data ---------------------------------------------------------------

  private async loadAnnotations() {
    const list = await this.api.list(this.source)
    this.items.clear()
    for (const anno of list) {
      const range = rangeFromSelectors(anno.target.selector, this.root)
      this.items.set(anno.id, { anno, range })
      if (!range) console.warn('[penumbra] orphaned annotation (anchor not found):', anno.id)
    }
    this.renderHighlights()
    this.renderGutter()
  }

  // ---- highlights ---------------------------------------------------------

  private renderHighlights() {
    if (!HL_SUPPORTED) return
    const ranges = [...this.items.values()].map((v) => v.range).filter((r): r is Range => !!r)
    ;(CSS as any).highlights.set('penumbra', new (globalThis as any).Highlight(...ranges))
  }

  private setActive(range: Range | null) {
    if (!HL_SUPPORTED) return
    if (range) (CSS as any).highlights.set('penumbra-active', new (globalThis as any).Highlight(range))
    else (CSS as any).highlights.delete('penumbra-active')
  }

  // ---- gutter dots --------------------------------------------------------

  private renderGutter() {
    this.gutter.forEach((d) => d.remove())
    this.gutter = []
    for (const { anno, range } of this.items.values()) {
      if (!range) continue
      const dot = document.createElement('div')
      dot.className = 'pen-gutter-dot'
      dot.setAttribute('data-pen-ui', '')
      dot.title = 'View comment'
      dot.onclick = () => this.openCard(anno.id)
      document.body.appendChild(dot)
      this.gutter.push(Object.assign(dot, { _annoId: anno.id }))
    }
    this.positionGutter()
  }

  private positionGutter() {
    const rootRect = this.root.getBoundingClientRect()
    const left = window.scrollX + rootRect.left - 22
    for (const dot of this.gutter) {
      const item = this.items.get((dot as any)._annoId)
      if (!item?.range) { dot.style.display = 'none'; continue }
      const r = item.range.getBoundingClientRect()
      if (r.height === 0) { dot.style.display = 'none'; continue }
      dot.style.display = ''
      dot.style.left = `${Math.max(4, left)}px`
      dot.style.top = `${window.scrollY + r.top + 2}px`
    }
  }

  // ---- selection → add ----------------------------------------------------

  private onSelection() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { this.removeAddBtn(); return }
    const range = sel.getRangeAt(0)
    if (!this.root.contains(range.commonAncestorContainer)) { this.removeAddBtn(); return }
    if (!sel.toString().trim()) { this.removeAddBtn(); return }

    const rect = range.getBoundingClientRect()
    this.removeAddBtn()
    const btn = document.createElement('button')
    btn.className = 'pen-addbtn'
    btn.setAttribute('data-pen-ui', '')
    btn.textContent = '💬 Comment'
    btn.style.left = `${window.scrollX + rect.left + rect.width / 2}px`
    btn.style.top = `${window.scrollY + rect.top}px`
    btn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation() }
    btn.onclick = () => this.openComposer(range)
    document.body.appendChild(btn)
    this.addBtn = btn
  }

  private removeAddBtn() {
    this.addBtn?.remove()
    this.addBtn = undefined
  }

  private openComposer(range: Range) {
    if (!this.user) { this.removeAddBtn(); this.flashLogin(); return }
    const selectors = selectorsFromRange(range, this.root)
    if (!selectors) { this.removeAddBtn(); return }
    const exact = (selectors.find((s) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    const rect = range.getBoundingClientRect()
    this.removeAddBtn()

    const card = this.makeCard(rect)
    card.innerHTML = `
      <div class="pen-quote">${escapeHtml(exact)}</div>
      <textarea placeholder="Add a comment…"></textarea>
      <div class="pen-row">
        <span class="pen-title" style="font-size:12px;color:#888">${escapeHtml(this.user.name ?? 'you')}</span>
        <span>
          <button class="pen-btn secondary" data-act="cancel">Cancel</button>
          <button class="pen-btn" data-act="post">Comment</button>
        </span>
      </div>`
    const ta = card.querySelector('textarea')!
    ta.focus()
    card.querySelector('[data-act="cancel"]')!.addEventListener('click', () => this.closeCard())
    card.querySelector('[data-act="post"]')!.addEventListener('click', async () => {
      const text = ta.value.trim()
      if (!text) return
      try {
        const anno = await this.api.create({ source: this.source, selector: selectors }, text, this.docVersion)
        const newRange = rangeFromSelectors(anno.target.selector, this.root)
        this.items.set(anno.id, { anno, range: newRange })
        this.renderHighlights()
        this.renderGutter()
        this.closeCard()
        window.getSelection()?.removeAllRanges()
      } catch (err: any) {
        alert('Could not save comment: ' + err.message)
      }
    })
  }

  // ---- comment card -------------------------------------------------------

  private openCard(id: string) {
    const item = this.items.get(id)
    if (!item) return
    const rect = item.range?.getBoundingClientRect() ?? { left: window.innerWidth / 2 - 150, top: 80, width: 0 } as DOMRect
    this.setActive(item.range)
    const card = this.makeCard(rect)
    const a = item.anno
    const exact = (a.target.selector.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    const mine = this.user && a.creator?.id === this.user.id
    const avatar = a.creator?.avatar ? `<img src="${a.creator.avatar}" alt="">` : ''
    card.innerHTML = `
      <div class="pen-quote">${escapeHtml(exact)}</div>
      <div class="pen-comment">
        <div class="pen-meta">${avatar}<span class="pen-name">${escapeHtml(a.creator?.name ?? 'anon')}</span>
          <span>· ${new Date(a.created).toLocaleDateString()}</span></div>
        <div class="pen-body">${escapeHtml(a.body?.[0]?.value ?? '')}</div>
        ${mine ? `<div class="pen-actions">
            <a data-act="resolve">Resolve</a><a data-act="delete">Delete</a></div>` : ''}
      </div>
      <div class="pen-row"><span></span><button class="pen-btn secondary" data-act="close">Close</button></div>`
    card.querySelector('[data-act="close"]')!.addEventListener('click', () => this.closeCard())
    card.querySelector('[data-act="resolve"]')?.addEventListener('click', async () => {
      await this.api.patch(id, { status: 'resolved' })
      this.items.delete(id)            // resolved highlights are hidden by default
      this.renderHighlights(); this.renderGutter(); this.closeCard()
    })
    card.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return
      await this.api.remove(id)
      this.items.delete(id)
      this.renderHighlights(); this.renderGutter(); this.closeCard()
    })
  }

  private makeCard(rect: { left: number; top: number; width: number }): HTMLElement {
    this.closeCard()
    const card = document.createElement('div')
    card.className = 'pen-card'
    card.setAttribute('data-pen-ui', '')
    const left = Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 320)
    card.style.left = `${Math.max(8, left)}px`
    card.style.top = `${window.scrollY + rect.top + 24}px`
    document.body.appendChild(card)
    this.card = card
    return card
  }

  private closeCard() {
    this.card?.remove()
    this.card = undefined
    this.setActive(null)
  }

  // ---- global pointer handling -------------------------------------------

  private onDocMouseDown(e: MouseEvent) {
    const t = e.target as HTMLElement
    if (t.closest('[data-pen-ui]')) return
    if (this.card) this.closeCard()
  }

  private onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement
    if (t.closest('[data-pen-ui]')) return
    // Hit-test the click against highlighted ranges.
    for (const { anno, range } of this.items.values()) {
      if (!range) continue
      for (const r of range.getClientRects()) {
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          this.openCard(anno.id)
          return
        }
      }
    }
  }

  // ---- login widget -------------------------------------------------------

  private renderLogin() {
    this.loginEl?.remove()
    const el = document.createElement('div')
    el.className = 'pen-login'
    el.setAttribute('data-pen-ui', '')
    if (this.user) {
      el.innerHTML = `<span class="pen-title">Signed in as <span class="pen-name">${escapeHtml(this.user.name ?? 'you')}</span></span>
        <a class="pen-btn secondary" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`
      el.querySelector('[data-act="logout"]')!.addEventListener('click', async () => {
        await this.api.logout(); this.user = null; this.renderLogin()
      })
    } else {
      el.innerHTML = `<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers">
          <button class="pen-btn" data-act="github">GitHub</button>
          <button class="pen-btn" data-act="google">Google</button>
        </div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn secondary" data-act="email">Email me a link</button></div>`
      el.querySelector('[data-act="github"]')!.addEventListener('click', () => (location.href = this.api.loginUrl('github')))
      el.querySelector('[data-act="google"]')!.addEventListener('click', () => (location.href = this.api.loginUrl('google')))
      el.querySelector('[data-act="email"]')!.addEventListener('click', async () => {
        const email = (el.querySelector('input') as HTMLInputElement).value.trim()
        if (!email) return
        const res = await this.api.emailLogin(email)
        if (res.link) { alert('Dev mode: opening your magic link.'); location.href = res.link }
        else alert('Check your email for a sign-in link.')
      })
    }
    document.body.appendChild(el)
    this.loginEl = el
  }

  private flashLogin() {
    if (!this.loginEl) return
    this.loginEl.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
      { duration: 400, iterations: 2 }
    )
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
