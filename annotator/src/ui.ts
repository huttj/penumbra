import { Api, type Annotation, type User } from './api'
import { rangeFromSelectors, selectorsFromRange } from './anchor'
import { CSS } from './styles'

type Config = { api: string; source?: string; sourceBase?: string; root?: string; docVersion?: string }
type Filter = 'all' | 'unread' | 'mine' | 'author'
type Item = { anno: Annotation; range: Range | null }

const HL = typeof (globalThis as any).Highlight !== 'undefined' && !!(CSS as any) && !!(window as any).CSS?.highlights
const GAP = 10
const QUICK_EMOJI = ['👍', '❤️', '🔥', '😄', '🤔', '🎯']

export class Penumbra {
  private api: Api
  private cfg: Config
  private root: HTMLElement
  private source: string
  private docVersion?: string
  private user: User | null = null
  private isAuthor = false

  private items = new Map<string, Item>()
  private drafts = new Map<string, { selectors: any; range: Range | null; text: string }>()
  private highlightsOn = true
  private filter: Filter = 'all'
  private focused: string | null = null
  private hovered: string | null = null
  private narrow = false
  private composeCtx?: { selectors: any; range: Range; ta: HTMLTextAreaElement; draftId: string | null }
  private draftSeq = 0

  private layer!: HTMLElement // absolute container scrolling with the document
  private toolbar?: HTMLElement
  private loginEl?: HTMLElement
  private compose?: HTMLElement
  private tooltip?: HTMLElement
  private relayoutQueued = false

  constructor(cfg: Config) {
    this.cfg = cfg
    this.api = new Api(cfg.api)
    this.root = this.resolveRoot()
    this.source = this.computeSource()
    this.docVersion = cfg.docVersion
  }

  private resolveRoot(): HTMLElement {
    return (this.cfg.root ? document.querySelector<HTMLElement>(this.cfg.root) : null) ?? document.body
  }
  private computeSource(): string {
    if (this.cfg.source) return this.cfg.source
    if (this.cfg.sourceBase) {
      const path = location.pathname.replace(/\/index\.html?$/i, '/').replace(/\.html?$/i, '').replace(/\/$/, '')
      return this.cfg.sourceBase.replace(/\/$/, '') + path
    }
    return location.href
  }

  async init() {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)

    this.layer = document.createElement('div')
    this.layer.setAttribute('data-pen-ui', '')
    this.layer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;'
    document.body.appendChild(this.layer)

    this.api.captureTokenFromHash()
    const me = await this.api.me()
    this.user = me.user
    this.isAuthor = me.isAuthor

    this.renderToolbar()
    this.renderLogin()
    await this.loadAnnotations()

    document.addEventListener('mouseup', (e) => {
      if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
      setTimeout(() => this.onSelection(), 0)
    })
    document.addEventListener('mousedown', (e) => this.onDocMouseDown(e))
    document.addEventListener('click', (e) => this.onDocClick(e))
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      if (this.compose) this.dismissCompose(false)       // Esc discards the compose box
      else if (this.focused) { this.focused = null; this.renderAll() } // …or deselects
    })
    window.addEventListener('resize', () => this.queueRelayout(), { passive: true })
  }

  async reload() {
    this.dismissCompose()
    this.drafts.clear()
    this.focused = null
    this.hovered = null
    this.root = this.resolveRoot()
    this.source = this.computeSource()
    await this.loadAnnotations()
  }

  // ---- data ----------------------------------------------------------------

  private async loadAnnotations() {
    const list = await this.api.list(this.source)
    this.items.clear()
    for (const anno of list) {
      this.items.set(anno.id, { anno, range: rangeFromSelectors(anno.target.selector, this.root) })
    }
    this.renderAll()
  }

  private kindOf = (a: Annotation): 'comment' | 'emoji' => a['penumbra:kind'] ?? 'comment'
  private acknowledged = (a: Annotation): boolean => !!a['penumbra:acknowledged']
  private repliesOf = (a: Annotation): any[] => a['penumbra:replies'] ?? []
  private docY = (r: Range): number => r.getBoundingClientRect().top + window.scrollY

  private comments(): Item[] {
    return [...this.items.values()].filter((i) => this.kindOf(i.anno) === 'comment')
  }
  private emojis(): Item[] {
    return [...this.items.values()].filter((i) => this.kindOf(i.anno) === 'emoji')
  }

  private passesFilter(a: Annotation): boolean {
    switch (this.filter) {
      case 'unread': return !this.acknowledged(a)
      case 'mine': {
        const me = this.user?.id
        return !!me && (a.creator?.id === me || this.repliesOf(a).some((r) => r.creator?.id === me))
      }
      case 'author': return a.creator?.authored || this.repliesOf(a).some((r) => r.creator?.authored)
      default: return true
    }
  }

  // Comments that are anchored AND pass the active filter, in document order.
  private visibleComments(): Item[] {
    return this.comments()
      .filter((i) => i.range && this.passesFilter(i.anno))
      .sort((a, b) => this.docY(a.range!) - this.docY(b.range!))
  }

  // ---- rendering -----------------------------------------------------------

  private renderAll() {
    this.renderHighlights()
    this.layoutRightRail()
    this.layoutLeftRail()
    this.updateToolbar()
  }

  private queueRelayout() {
    if (this.relayoutQueued) return
    this.relayoutQueued = true
    requestAnimationFrame(() => { this.relayoutQueued = false; this.renderAll() })
  }

  private renderHighlights() {
    if (!HL) return
    const hl = (window as any).CSS.highlights
    const H = (globalThis as any).Highlight
    if (!this.highlightsOn) { hl.delete('penumbra'); hl.delete('penumbra-active'); hl.delete('penumbra-draft'); return }
    const ranges = this.visibleComments().map((i) => i.range!).concat(
      this.emojis().filter((i) => i.range && this.passesFilter(i.anno)).map((i) => i.range!)
    )
    hl.set('penumbra', new H(...ranges))

    // Draft highlights = saved drafts + the currently-open compose's range
    // (so the selection stays visibly highlighted once the textarea steals focus).
    const draftRanges = [...this.drafts.values()].map((d) => d.range)
    if (this.composeCtx?.range) draftRanges.push(this.composeCtx.range)
    const dr = draftRanges.filter(Boolean) as Range[]
    if (dr.length) hl.set('penumbra-draft', new H(...dr)); else hl.delete('penumbra-draft')

    // Active = whatever is hovered, else focused.
    const activeId = this.hovered ?? this.focused
    const a = activeId && this.items.get(activeId)?.range
    if (a) hl.set('penumbra-active', new H(a)); else hl.delete('penumbra-active')
  }

  private layoutRightRail() {
    this.layer.querySelectorAll('.pen-card.rail').forEach((n) => n.remove())
    if (!this.highlightsOn) return

    const rootRect = this.root.getBoundingClientRect()
    this.narrow = window.innerWidth - rootRect.right < 320
    if (this.narrow) return // narrow screens: cards open on click instead

    const list = this.visibleComments()
    if (!list.length) return
    const railLeft = window.scrollX + rootRect.right + 24

    // Build + measure all cards off-screen first.
    const cards = list.map((item) => {
      const card = this.buildCommentCard(item, this.focused === item.anno.id, 'rail')
      card.style.left = `${railLeft}px`
      card.style.top = '-9999px'
      this.layer.appendChild(card)
      return card
    })
    const h = cards.map((c) => c.offsetHeight)
    const anchor = list.map((i) => this.docY(i.range!))
    const pos = anchor.slice()
    const fi = list.findIndex((i) => i.anno.id === this.focused)

    if (fi >= 0) {
      // Pin the focused card at its anchor; flow neighbours away from it.
      pos[fi] = anchor[fi]
      for (let i = fi + 1; i < list.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + h[i - 1] + GAP)
      for (let i = fi - 1; i >= 0; i--) pos[i] = Math.min(anchor[i], pos[i + 1] - h[i] - GAP)
    } else {
      // No focus: pack downward to remove overlaps, each as close to its anchor as it can get.
      for (let i = 1; i < list.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + h[i - 1] + GAP)
    }
    cards.forEach((c, i) => (c.style.top = `${Math.max(0, pos[i])}px`))
  }

  private layoutLeftRail() {
    this.layer.querySelectorAll('.pen-emote').forEach((n) => n.remove())
    if (!this.highlightsOn) return
    const rootRect = this.root.getBoundingClientRect()
    const x = window.scrollX + Math.max(6, rootRect.left - 40)
    let bottom = 0
    for (const item of this.emojis().filter((i) => i.range && this.passesFilter(i.anno))
      .sort((a, b) => this.docY(a.range!) - this.docY(b.range!))) {
      const a = item.anno
      const chip = document.createElement('div')
      chip.className = 'pen-emote'
      chip.setAttribute('data-pen-ui', '')
      chip.textContent = a.body?.[0]?.value ?? '⭐'
      const who = `${a.creator?.name ?? 'someone'} reacted`
      chip.addEventListener('mouseenter', () => this.showTooltip(chip, who))
      chip.addEventListener('mouseleave', () => this.hideTooltip())
      this.layer.appendChild(chip)
      const top = Math.max(this.docY(item.range!), bottom + 6)
      chip.style.left = `${x}px`
      chip.style.top = `${top}px`
      bottom = top + chip.offsetHeight
    }
  }

  private buildCommentCard(item: Item, expanded: boolean, variant: 'rail' | 'floating'): HTMLElement {
    const a = item.anno
    const id = a.id
    const card = document.createElement('div')
    card.className = `pen-card ${variant} ${expanded ? 'focused' : 'compact'}`
    card.setAttribute('data-pen-ui', '')
    card.dataset.annoId = id

    const exact = (a.target.selector.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    const replies = this.repliesOf(a)
    // The unread marker only means something to the author, on someone else's thread.
    const unread = this.isAuthor && !this.acknowledged(a) && !a.creator?.authored

    const commentHtml = (c: any, root: boolean) => {
      const avatar = c.creator?.avatar ? `<img src="${esc(c.creator.avatar)}" alt="">` : ''
      const badge = c.creator?.authored ? `<span class="pen-badge">author</span>` : ''
      const dot = root && unread ? `<span class="pen-unread-dot" title="unread"></span>` : ''
      const value = root ? (a.body?.[0]?.value ?? '') : c.body
      return `<div class="pen-comment">
        <div class="pen-meta">${dot}${avatar}<span class="pen-name">${esc(c.creator?.name ?? 'anon')}</span>${badge}
          <span>· ${fmtDate(root ? a.created : c.created)}</span></div>
        <div class="pen-body">${esc(value)}</div></div>`
    }

    let inner = `<div class="pen-quote">${esc(exact)}</div><div class="pen-thread">`
    inner += commentHtml({ creator: a.creator, created: a.created }, true)
    if (!expanded) {
      if (replies.length) inner += `<div class="pen-more">${replies.length} repl${replies.length === 1 ? 'y' : 'ies'} →</div>`
    } else {
      for (const r of replies) inner += commentHtml(r, false)
    }
    inner += `</div>`

    if (expanded) {
      const mine = this.user && a.creator?.id === this.user.id
      const acts: string[] = []
      if (this.isAuthor && !a.creator?.authored) acts.push(`<a data-act="ack">${this.acknowledged(a) ? 'Mark unread' : 'Acknowledge'}</a>`)
      if (mine) acts.push(`<a data-act="delete">Delete</a>`)
      if (acts.length) inner += `<div class="pen-actions">${acts.join('')}</div>`
      if (this.user) {
        inner += `<div class="pen-reply"><textarea placeholder="Reply…"></textarea>
          <div class="pen-row"><span></span><button class="pen-btn" data-act="send-reply">Reply</button></div></div>`
      } else {
        inner += `<div class="pen-actions"><a data-act="login">Sign in to reply</a></div>`
      }
    }
    card.innerHTML = inner

    card.addEventListener('mouseenter', () => { this.hovered = id; this.renderHighlights() })
    card.addEventListener('mouseleave', () => { this.hovered = null; this.renderHighlights() })

    if (!expanded) {
      card.addEventListener('click', () => this.focus(id))
    } else {
      card.querySelector('[data-act="ack"]')?.addEventListener('click', () => this.toggleAck(id))
      card.querySelector('[data-act="delete"]')?.addEventListener('click', () => this.remove(id))
      card.querySelector('[data-act="login"]')?.addEventListener('click', () => this.flashLogin())
      const ta = card.querySelector('textarea') as HTMLTextAreaElement | null
      const send = () => { if (ta?.value.trim()) this.sendReply(id, ta.value.trim()) }
      card.querySelector('[data-act="send-reply"]')?.addEventListener('click', send)
      ta?.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send() }
      })
    }
    return card
  }

  // ---- focus / navigation --------------------------------------------------

  private focus(id: string, scroll = false) {
    this.focused = id
    const item = this.items.get(id)
    if (scroll && item?.range) {
      window.scrollTo({ top: this.docY(item.range) - 120, behavior: 'smooth' })
    }
    if (this.narrow) this.openFloatingCard(id)
    else this.renderAll()
    this.renderHighlights()
  }

  private nav(delta: number) {
    const list = this.visibleComments()
    if (!list.length) return
    let idx = list.findIndex((i) => i.anno.id === this.focused)
    idx = idx < 0 ? (delta > 0 ? 0 : list.length - 1) : (idx + delta + list.length) % list.length
    this.focus(list[idx].anno.id, true)
  }

  private openFloatingCard(id: string) {
    this.dismissCompose()
    this.layer.querySelectorAll('.pen-card.floating').forEach((n) => n.remove())
    const item = this.items.get(id)
    if (!item) return
    const card = this.buildCommentCard(item, true, 'floating')
    const rect = item.range?.getBoundingClientRect()
    const top = rect ? window.scrollY + rect.bottom + 8 : window.scrollY + 80
    const left = Math.min(window.scrollX + (rect?.left ?? 40), window.scrollX + window.innerWidth - 310)
    card.style.top = `${top}px`
    card.style.left = `${Math.max(8, left)}px`
    this.layer.appendChild(card)
  }

  // ---- actions -------------------------------------------------------------

  private async sendReply(id: string, text: string) {
    try { await this.api.reply(id, text) } catch (e: any) { alert(e.message); return }
    await this.loadAnnotations()
    this.focus(id)
  }
  private async toggleAck(id: string) {
    const a = this.items.get(id)?.anno
    if (!a) return
    await this.api.patch(id, { acknowledged: !this.acknowledged(a) }).catch((e) => alert(e.message))
    await this.loadAnnotations(); this.focus(id)
  }
  private async remove(id: string) {
    if (!confirm('Delete this comment thread?')) return
    await this.api.remove(id)
    this.items.delete(id); this.focused = null; this.renderAll()
  }

  // ---- selection → compose -------------------------------------------------

  private onSelection() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) return
    const range = sel.getRangeAt(0)
    if (!this.root.contains(range.commonAncestorContainer)) return
    this.openCompose(range.cloneRange()) // clone: a stored draft must not move with the selection
  }

  // Close the compose box. With persist=true, a non-empty box is kept as an
  // in-memory draft (shown as a draft highlight, reopenable); empty is discarded.
  private dismissCompose(persist = false) {
    const ctx = this.composeCtx
    this.compose?.remove(); this.compose = undefined; this.composeCtx = undefined
    if (ctx) {
      const text = ctx.ta.value.trim()
      if (persist && text) this.drafts.set(ctx.draftId ?? `draft-${++this.draftSeq}`, { selectors: ctx.selectors, range: ctx.range, text })
      else if (ctx.draftId) this.drafts.delete(ctx.draftId)
    }
    this.renderHighlights()
  }

  private openCompose(range: Range, opts?: { draftId?: string; text?: string }) {
    if (!this.user) return this.promptSignIn(range)
    const selectors = opts?.draftId ? this.drafts.get(opts.draftId)?.selectors : selectorsFromRange(range, this.root)
    if (!selectors) return
    this.dismissCompose() // discard any prior empty compose

    const rect = range.getBoundingClientRect()
    const box = document.createElement('div')
    box.className = 'pen-compose'
    box.setAttribute('data-pen-ui', '')
    box.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 372)}px`
    box.style.top = `${window.scrollY + rect.bottom + 8}px`
    // No quote — you just selected it, you know what it is.
    box.innerHTML = `<textarea placeholder="Comment…  (⌘/Ctrl + ⏎ to send)"></textarea>
      <div class="pen-composebar">
        <div class="pen-emojibar">${QUICK_EMOJI.map((e) => `<button data-emoji="${e}">${e}</button>`).join('')}</div>
        <button class="pen-btn" data-act="post">Comment</button></div>`
    const ta = box.querySelector('textarea') as HTMLTextAreaElement
    if (opts?.text) ta.value = opts.text
    const post = () => { if (ta.value.trim()) this.create(selectors, ta.value.trim(), 'comment') }
    ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); post() } })
    box.querySelectorAll('[data-emoji]').forEach((b) =>
      b.addEventListener('click', () => this.create(selectors, (b as HTMLElement).dataset.emoji!, 'emoji')))
    box.querySelector('[data-act="post"]')!.addEventListener('click', post)
    this.layer.appendChild(box)
    this.compose = box
    this.composeCtx = { selectors, range, ta, draftId: opts?.draftId ?? null }
    this.renderHighlights() // paint the stand-in highlight before focus clears the native selection
    ta.focus()
  }

  private promptSignIn(range: Range) {
    this.dismissCompose()
    const rect = range.getBoundingClientRect()
    const box = document.createElement('div')
    box.className = 'pen-compose'; box.setAttribute('data-pen-ui', '')
    box.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 372)}px`
    box.style.top = `${window.scrollY + rect.bottom + 8}px`
    box.innerHTML = `<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`
    box.querySelector('[data-act="signin"]')!.addEventListener('click', () => { this.dismissCompose(); this.flashLogin() })
    this.layer.appendChild(box); this.compose = box
  }

  private reopenDraft(id: string) {
    const d = this.drafts.get(id)
    if (d?.range) this.openCompose(d.range, { draftId: id, text: d.text })
  }

  private async create(selectors: any, text: string, kind: 'comment' | 'emoji') {
    const draftId = this.composeCtx?.draftId
    try {
      const anno = await this.api.create({ source: this.source, selector: selectors }, text, { kind, docVersion: this.docVersion })
      this.items.set(anno.id, { anno, range: rangeFromSelectors(anno.target.selector, this.root) })
      if (draftId) this.drafts.delete(draftId)
      this.compose?.remove(); this.compose = undefined; this.composeCtx = undefined
      window.getSelection()?.removeAllRanges()
      if (kind === 'comment') this.focused = anno.id
      this.renderAll()
    } catch (e: any) { alert('Could not save: ' + e.message) }
  }

  // ---- pointer handling ----------------------------------------------------

  private onDocMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    this.dismissCompose(true) // keep what you typed as a draft
    this.layer.querySelectorAll('.pen-card.floating').forEach((n) => n.remove())
  }

  private onDocClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    if (window.getSelection()?.toString().trim()) return // a fresh selection — compose is opening
    // Resume a draft if its highlight was clicked.
    for (const [id, d] of this.drafts) if (d.range && this.hitsRange(e, d.range)) return this.reopenDraft(id)
    // Focus a comment if its highlight was clicked.
    for (const item of this.comments()) if (item.range && this.hitsRange(e, item.range)) return this.focus(item.anno.id)
    // Otherwise, clicking the page deselects.
    if (this.focused) { this.focused = null; this.renderAll() }
  }

  private hitsRange(e: MouseEvent, range: Range): boolean {
    for (const r of range.getClientRects())
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return true
    return false
  }

  // ---- toolbar -------------------------------------------------------------

  private renderToolbar() {
    const bar = document.createElement('div')
    bar.className = 'pen-toolbar'
    bar.setAttribute('data-pen-ui', '')
    bar.innerHTML = `
      <button class="pen-tbtn" data-act="toggle" title="Show/hide highlights">✦ <span data-label>Highlights</span></button>
      <span class="pen-sep"></span>
      <select data-act="filter" title="Filter">
        <option value="all">All</option>
        <option value="unread">Unread</option>
        <option value="mine">Mine</option>
        <option value="author">Author replies</option>
      </select>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="prev" title="Previous">‹</button>
      <span class="pen-count" data-count>0</span>
      <button class="pen-tbtn" data-act="next" title="Next">›</button>`
    bar.querySelector('[data-act="toggle"]')!.addEventListener('click', () => {
      this.highlightsOn = !this.highlightsOn
      bar.querySelector('[data-act="toggle"]')!.classList.toggle('active', this.highlightsOn)
      this.renderAll()
    })
    bar.querySelector('[data-act="toggle"]')!.classList.add('active')
    bar.querySelector('[data-act="filter"]')!.addEventListener('change', (e) => {
      this.filter = (e.target as HTMLSelectElement).value as Filter
      this.focused = null
      this.renderAll()
    })
    bar.querySelector('[data-act="prev"]')!.addEventListener('click', () => this.nav(-1))
    bar.querySelector('[data-act="next"]')!.addEventListener('click', () => this.nav(1))
    document.body.appendChild(bar)
    this.toolbar = bar
  }

  private updateToolbar() {
    if (!this.toolbar) return
    const list = this.visibleComments()
    const idx = list.findIndex((i) => i.anno.id === this.focused)
    this.toolbar.querySelector('[data-count]')!.textContent = list.length
      ? `${idx >= 0 ? idx + 1 : '–'}/${list.length}` : '0'
  }

  // ---- tooltip + login -----------------------------------------------------

  private showTooltip(anchor: HTMLElement, text: string) {
    this.hideTooltip()
    const t = document.createElement('div')
    t.className = 'pen-tooltip'; t.setAttribute('data-pen-ui', ''); t.textContent = text
    this.layer.appendChild(t)
    const r = anchor.getBoundingClientRect()
    t.style.left = `${window.scrollX + r.right + 8}px`
    t.style.top = `${window.scrollY + r.top}px`
    this.tooltip = t
  }
  private hideTooltip() { this.tooltip?.remove(); this.tooltip = undefined }

  private renderLogin() {
    this.loginEl?.remove()
    const el = document.createElement('div')
    el.className = 'pen-login'
    el.setAttribute('data-pen-ui', '')
    if (this.user) {
      el.innerHTML = `<span class="pen-title">Signed in as <span class="pen-name">${esc(this.user.name ?? 'you')}</span>${this.isAuthor ? ' <span class="pen-badge">author</span>' : ''}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`
      el.querySelector('[data-act="logout"]')!.addEventListener('click', async () => {
        await this.api.logout(); this.user = null; this.isAuthor = false; this.renderLogin(); this.renderAll()
      })
    } else {
      el.innerHTML = `<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers">
          <button class="pen-btn" data-act="github">GitHub</button>
          <button class="pen-btn" data-act="google">Google</button></div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn ghost" data-act="email">Email link</button></div>`
      el.querySelector('[data-act="github"]')!.addEventListener('click', () => (location.href = this.api.loginUrl('github')))
      el.querySelector('[data-act="google"]')!.addEventListener('click', () => (location.href = this.api.loginUrl('google')))
      el.querySelector('[data-act="email"]')!.addEventListener('click', async () => {
        const email = (el.querySelector('input') as HTMLInputElement).value.trim()
        if (!email) return
        const res = await this.api.emailLogin(email)
        if (res.link) location.href = res.link
        else alert('Check your email for a sign-in link.')
      })
    }
    document.body.appendChild(el)
    this.loginEl = el
  }
  private flashLogin() {
    this.loginEl?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
      { duration: 380, iterations: 2 })
  }
}

const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const fmtDate = (iso: string): string => { try { return new Date(iso).toLocaleDateString() } catch { return '' } }
