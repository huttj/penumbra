import { Api, type User } from './api'
import { locateText, resolveQuoteStrict, selectorsFromRange } from './anchor'
import { extractBlockquotes, isEmojiNote, parseResponse, renderMarkdown, serializeResponse } from './markdown'
import { ResponsePanel, ReviewsPanel } from './response'
import { CSS } from './styles'

type Config = { api: string; source?: string; sourceBase?: string; root?: string; commitSha?: string }

// A block of the reader's response doc: one or more adjacent quotes + the note
// they own. The single source of truth for both the page margins and the panel.
type Block = { id: string; quotes: string[]; note: string; ranges: Range[]; isEmoji: boolean }

const HL = typeof (globalThis as any).Highlight !== 'undefined' && !!(window as any).CSS?.highlights
const GAP = 10
const QUICK_EMOJI = ['👍', '❤️', '🔥', '😄', '🤔', '🎯']

export class Penumbra {
  private api: Api
  private cfg: Config
  private root: HTMLElement
  private source: string
  private commitSha: string | null
  private user: User | null = null
  private isAuthor = false

  private preamble = ''
  private blocks: Block[] = []
  private highlightsOn = true
  private focused: string | null = null
  private hovered: string | null = null
  private hoverRaf = false
  private relayoutQueued = false

  private responsePanel?: ResponsePanel
  private reviewsPanel?: ReviewsPanel
  private layer!: HTMLElement
  private toolbar?: HTMLElement
  private loginEl?: HTMLElement
  private compose?: HTMLElement
  private composeCtx?: { range: Range; quote: string }
  private quoteBtn?: HTMLElement
  private tooltip?: HTMLElement

  constructor(cfg: Config) {
    this.cfg = cfg
    this.api = new Api(cfg.api)
    this.root = this.resolveRoot()
    this.source = this.computeSource()
    this.commitSha = cfg.commitSha ?? null
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
    await this.loadDoc()

    document.addEventListener('mouseup', (e) => {
      if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
      setTimeout(() => this.onSelection(), 0)
    })
    document.addEventListener('mousedown', (e) => this.onDocMouseDown(e))
    document.addEventListener('click', (e) => this.onDocClick(e))
    document.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: true })
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      if (this.compose) this.dismissCompose()
      else if (this.focused) { this.focused = null; this.renderAll() }
    })
    window.addEventListener('resize', () => this.queueRelayout(), { passive: true })
  }

  async reload() {
    this.dismissCompose(); this.removeQuoteBtn()
    this.focused = this.hovered = null
    this.root = this.resolveRoot()
    this.source = this.computeSource()
    await this.loadDoc()
  }

  // ---- data: the response doc → blocks -------------------------------------

  private async loadDoc() {
    let body = ''
    if (this.user) body = (await this.api.getResponse(this.source).catch(() => null))?.body ?? ''
    this.parse(body)
    this.renderAll()
  }

  private parse(body: string) {
    const { preamble, blocks } = parseResponse(body)
    this.preamble = preamble
    this.blocks = blocks.map((b, i) => ({
      id: `b${i}`,
      quotes: b.quotes,
      note: b.note,
      isEmoji: isEmojiNote(b.note),
      ranges: b.quotes
        .map((q) => resolveQuoteStrict([{ type: 'TextQuoteSelector', exact: q }], this.root))
        .filter(Boolean) as Range[],
    }))
  }

  // Serialize blocks back to markdown and persist; then re-parse + re-render.
  private async saveDoc() {
    const body = serializeResponse(this.preamble, this.blocks.map((b) => ({ quotes: b.quotes, note: b.note })))
    const quotes = extractBlockquotes(body).map((text, i) => ({
      id: `q${i}`, text, selector: locateText(text, this.root) ?? [{ type: 'TextQuoteSelector', exact: text }],
    }))
    try { await this.api.saveResponse(this.source, body, quotes, this.commitSha) } catch (e: any) { alert('Could not save: ' + e.message); return }
    this.focused = null
    this.parse(body)
    this.renderAll()
  }

  private blockById = (id: string | null) => this.blocks.find((b) => b.id === id)
  private docY = (r: Range): number => r.getBoundingClientRect().top + window.scrollY
  private cards = () => this.blocks.filter((b) => !b.isEmoji && b.note.trim() && b.ranges.length)
  private chips = () => this.blocks.filter((b) => b.isEmoji && b.ranges.length)

  // ---- rendering -----------------------------------------------------------

  private renderAll() {
    this.renderHighlights()
    this.layoutRightRail()
    this.layoutLeftRail()
  }
  private queueRelayout() {
    if (this.relayoutQueued) return
    this.relayoutQueued = true
    requestAnimationFrame(() => { this.relayoutQueued = false; this.renderAll() })
  }

  private renderHighlights() {
    if (!HL) return
    const h = (window as any).CSS.highlights
    const H = (globalThis as any).Highlight
    if (this.responsePanel) return // panel owns the quote highlight while open
    if (!this.highlightsOn) { h.delete('penumbra-quote'); h.delete('penumbra-quote-active'); h.delete('penumbra-draft'); return }

    const ranges = this.blocks.flatMap((b) => b.ranges)
    if (ranges.length) h.set('penumbra-quote', new H(...ranges)); else h.delete('penumbra-quote')

    if (this.composeCtx?.range) h.set('penumbra-draft', new H(this.composeCtx.range)); else h.delete('penumbra-draft')

    const active = this.blockById(this.hovered ?? this.focused)?.ranges[0]
    if (active) h.set('penumbra-quote-active', new H(active)); else h.delete('penumbra-quote-active')
  }

  private layoutRightRail() {
    this.layer.querySelectorAll('.pen-card.rail').forEach((n) => n.remove())
    if (!this.highlightsOn || this.responsePanel) return
    const rootRect = this.root.getBoundingClientRect()
    if (window.innerWidth - rootRect.right < 300) return // no room

    const list = this.cards().sort((a, b) => this.docY(a.ranges[0]) - this.docY(b.ranges[0]))
    if (!list.length) return
    const railLeft = window.scrollX + rootRect.right + 24

    const els = list.map((blk) => {
      const card = this.buildCard(blk, this.focused === blk.id)
      card.style.left = `${railLeft}px`; card.style.top = '-9999px'
      this.layer.appendChild(card)
      return card
    })
    const hs = els.map((c) => c.offsetHeight)
    const anchor = list.map((b) => this.docY(b.ranges[0]))
    const pos = anchor.slice()
    const fi = list.findIndex((b) => b.id === this.focused)
    if (fi >= 0) {
      pos[fi] = anchor[fi]
      for (let i = fi + 1; i < list.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + hs[i - 1] + GAP)
      for (let i = fi - 1; i >= 0; i--) pos[i] = Math.min(anchor[i], pos[i + 1] - hs[i] - GAP)
    } else {
      for (let i = 1; i < list.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + hs[i - 1] + GAP)
    }
    els.forEach((c, i) => (c.style.top = `${Math.max(0, pos[i])}px`))
  }

  private layoutLeftRail() {
    this.layer.querySelectorAll('.pen-emote').forEach((n) => n.remove())
    if (!this.highlightsOn || this.responsePanel) return
    const rootRect = this.root.getBoundingClientRect()
    const x = window.scrollX + Math.max(6, rootRect.left - 40)
    let bottom = 0
    for (const blk of this.chips().sort((a, b) => this.docY(a.ranges[0]) - this.docY(b.ranges[0]))) {
      const chip = document.createElement('div')
      chip.className = 'pen-emote'; chip.setAttribute('data-pen-ui', ''); chip.dataset.blockId = blk.id
      chip.textContent = blk.note.trim()
      chip.addEventListener('mouseenter', () => { this.setHovered(blk.id); this.showTooltip(chip, blk.quotes.join(' / ')) })
      chip.addEventListener('mouseleave', () => { this.setHovered(null); this.hideTooltip() })
      chip.addEventListener('click', () => this.focus(blk.id))
      this.layer.appendChild(chip)
      const top = Math.max(this.docY(blk.ranges[0]), bottom + 6)
      chip.style.left = `${x}px`; chip.style.top = `${top}px`
      bottom = top + chip.offsetHeight
    }
  }

  private buildCard(blk: Block, expanded: boolean): HTMLElement {
    const card = document.createElement('div')
    card.className = `pen-card rail ${expanded ? 'focused' : 'compact'}`
    card.setAttribute('data-pen-ui', ''); card.dataset.blockId = blk.id

    const quoteHtml = blk.quotes.map((q) => `<div class="pen-quote">${esc(q)}</div>`).join('')
    if (!expanded) {
      card.innerHTML = `${quoteHtml}<div class="pen-thread"><div class="pen-body pen-md">${renderMarkdown(blk.note)}</div></div>`
      card.addEventListener('click', () => this.focus(blk.id))
    } else {
      card.innerHTML = `${quoteHtml}
        <div class="pen-reply"><textarea class="pen-note">${esc(blk.note)}</textarea>
          <div class="pen-row"><span class="pen-foot"><a data-act="delete">Delete</a></span>
            <button class="pen-btn" data-act="save">Save</button></div></div>`
      const ta = card.querySelector('textarea') as HTMLTextAreaElement
      setTimeout(() => ta.focus(), 0)
      const save = () => { blk.note = ta.value; this.saveDoc() }
      card.querySelector('[data-act="save"]')!.addEventListener('click', save)
      ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save() } })
      card.querySelector('[data-act="delete"]')!.addEventListener('click', () => {
        if (!confirm('Delete this comment?')) return
        this.blocks = this.blocks.filter((b) => b.id !== blk.id); this.saveDoc()
      })
    }
    card.addEventListener('mouseenter', () => this.setHovered(blk.id))
    card.addEventListener('mouseleave', () => this.setHovered(null))
    return card
  }

  private focus(id: string) {
    this.focused = id
    this.renderAll()
  }

  // ---- bidirectional emphasis (card/chip ↔ source highlight) ---------------

  private setHovered(id: string | null) {
    if (this.hovered === id) return
    this.hovered = id
    this.layer.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) =>
      el.classList.toggle('pen-emph', el.dataset.blockId === id))
    this.renderHighlights()
  }

  private onMouseMove(e: MouseEvent) {
    if (this.hoverRaf || this.responsePanel) return
    this.hoverRaf = true
    requestAnimationFrame(() => {
      this.hoverRaf = false
      if ((e.target as HTMLElement)?.closest?.('[data-pen-ui]')) return
      let found: string | null = null
      for (const b of this.blocks) {
        if (b.ranges.some((r) => this.hitsRange(e, r))) { found = b.id; break }
      }
      this.setHovered(found)
    })
  }

  // ---- selection → inline comment ------------------------------------------

  private onSelection() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) { this.removeQuoteBtn(); return }
    const range = sel.getRangeAt(0)
    if (!this.root.contains(range.commonAncestorContainer)) return
    // Panel open → a "Quote" button that appends to the full response.
    if (this.responsePanel) { this.showQuoteButton(range.cloneRange()); return }
    this.openCompose(range.cloneRange())
  }

  private showQuoteButton(range: Range) {
    this.removeQuoteBtn()
    const rect = range.getBoundingClientRect()
    const b = document.createElement('button')
    b.className = 'pen-addbtn'; b.setAttribute('data-pen-ui', ''); b.textContent = 'Quote'
    b.style.left = `${window.scrollX + rect.left + rect.width / 2}px`
    b.style.top = `${window.scrollY + rect.top}px`
    b.onmousedown = (e) => { e.preventDefault(); e.stopPropagation() }
    b.onclick = () => { this.responsePanel?.appendQuote(range); window.getSelection()?.removeAllRanges(); this.removeQuoteBtn() }
    this.layer.appendChild(b); this.quoteBtn = b
  }
  private removeQuoteBtn() { this.quoteBtn?.remove(); this.quoteBtn = undefined }

  private openCompose(range: Range) {
    if (!this.user) return this.promptSignIn(range)
    const quote = (selectorsFromRange(range, this.root)?.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    if (!quote) return
    this.dismissCompose()
    const rect = range.getBoundingClientRect()
    const box = document.createElement('div')
    box.className = 'pen-compose'; box.setAttribute('data-pen-ui', '')
    box.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 372)}px`
    box.style.top = `${window.scrollY + rect.bottom + 8}px`
    box.innerHTML = `<textarea placeholder="Comment…  (⌘/Ctrl + ⏎ to send)"></textarea>
      <div class="pen-composebar">
        <div class="pen-emojibar">${QUICK_EMOJI.map((e) => `<button data-emoji="${e}">${e}</button>`).join('')}</div>
        <button class="pen-btn" data-act="post">Comment</button></div>`
    const ta = box.querySelector('textarea') as HTMLTextAreaElement
    const post = () => { if (ta.value.trim()) this.addBlock(quote, ta.value.trim()) }
    ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); post() } })
    box.querySelectorAll('[data-emoji]').forEach((b) =>
      b.addEventListener('click', () => this.addBlock(quote, (b as HTMLElement).dataset.emoji!)))
    box.querySelector('[data-act="post"]')!.addEventListener('click', post)
    this.layer.appendChild(box)
    this.compose = box
    this.composeCtx = { range, quote }
    this.renderHighlights() // paint the stand-in highlight before focus clears the selection
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

  // Add a quote+note block to the response doc — this IS an inline comment.
  private addBlock(quote: string, note: string) {
    this.blocks.push({ id: `b${this.blocks.length}`, quotes: [quote], note, isEmoji: isEmojiNote(note), ranges: [] })
    this.dismissCompose()
    window.getSelection()?.removeAllRanges()
    this.saveDoc()
  }

  private dismissCompose() {
    this.compose?.remove(); this.compose = undefined; this.composeCtx = undefined
    this.renderHighlights()
  }

  // ---- pointer handling ----------------------------------------------------

  private onDocMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    this.dismissCompose(); this.removeQuoteBtn()
  }
  private onDocClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    if (window.getSelection()?.toString().trim()) return
    for (const b of this.blocks) if (b.ranges.some((r) => this.hitsRange(e, r))) return this.focus(b.id)
    if (this.focused) { this.focused = null; this.renderAll() }
  }
  private hitsRange(e: MouseEvent, range: Range): boolean {
    for (const r of range.getClientRects())
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return true
    return false
  }

  // ---- toolbar + panels ----------------------------------------------------

  private renderToolbar() {
    const bar = document.createElement('div')
    bar.className = 'pen-toolbar'; bar.setAttribute('data-pen-ui', '')
    bar.innerHTML = `
      <button class="pen-tbtn active" data-act="toggle" title="Show/hide highlights">✦ Highlights</button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">✍ Response</button>
      ${this.isAuthor ? '<button class="pen-tbtn" data-act="reviews" title="See everyone\'s responses">👁 Reviews</button>' : ''}`
    bar.querySelector('[data-act="toggle"]')!.addEventListener('click', () => {
      this.highlightsOn = !this.highlightsOn
      bar.querySelector('[data-act="toggle"]')!.classList.toggle('active', this.highlightsOn)
      this.renderAll()
    })
    bar.querySelector('[data-act="response"]')!.addEventListener('click', () => this.toggleResponse())
    bar.querySelector('[data-act="reviews"]')?.addEventListener('click', () => this.toggleReviews())
    document.body.appendChild(bar)
    this.toolbar = bar
  }

  private toggleReviews() {
    if (this.reviewsPanel) { this.reviewsPanel.close(); return }
    this.reviewsPanel = new ReviewsPanel({ api: this.api, root: this.root, source: this.source, onClose: () => { this.reviewsPanel = undefined } })
    this.reviewsPanel.open()
  }

  private toggleResponse() {
    if (this.responsePanel) { this.responsePanel.close(); return }
    if (!this.user) return this.flashLogin()
    this.toolbar?.querySelector('[data-act="response"]')?.classList.add('active')
    this.layer.querySelectorAll('.pen-card.rail, .pen-emote').forEach((n) => n.remove())
    this.responsePanel = new ResponsePanel({
      api: this.api, root: this.root, source: this.source, commitSha: this.commitSha, userName: this.user.name ?? 'you',
      onClose: () => {
        this.responsePanel = undefined
        this.removeQuoteBtn()
        this.toolbar?.querySelector('[data-act="response"]')?.classList.remove('active')
        this.loadDoc() // the panel edited the same doc — refresh margins + highlights
      },
    })
    this.responsePanel.open()
  }

  // ---- tooltip + login -----------------------------------------------------

  private showTooltip(anchor: HTMLElement, text: string) {
    this.hideTooltip()
    const t = document.createElement('div')
    t.className = 'pen-tooltip'; t.setAttribute('data-pen-ui', ''); t.textContent = text
    this.layer.appendChild(t)
    const r = anchor.getBoundingClientRect()
    t.style.left = `${window.scrollX + r.right + 8}px`; t.style.top = `${window.scrollY + r.top}px`
    this.tooltip = t
  }
  private hideTooltip() { this.tooltip?.remove(); this.tooltip = undefined }

  private renderLogin() {
    this.loginEl?.remove()
    const el = document.createElement('div')
    el.className = 'pen-login'; el.setAttribute('data-pen-ui', '')
    if (this.user) {
      el.innerHTML = `<span class="pen-title">Signed in as <span class="pen-name">${esc(this.user.name ?? 'you')}</span>${this.isAuthor ? ' <span class="pen-badge">author</span>' : ''}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`
      el.querySelector('[data-act="logout"]')!.addEventListener('click', async () => {
        await this.api.logout(); this.user = null; this.isAuthor = false; this.renderLogin(); this.loadDoc()
      })
    } else {
      el.innerHTML = `<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`
      const submit = async () => {
        const input = el.querySelector('input') as HTMLInputElement
        const email = input.value.trim(); if (!email) return
        const res = await this.api.emailLogin(email)
        if (res.link) location.href = res.link
        else { input.value = ''; input.placeholder = 'Check your email ✉️' }
      }
      el.querySelector('[data-act="email"]')!.addEventListener('click', submit)
      el.querySelector('input')!.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') submit() })
    }
    document.body.appendChild(el)
    this.loginEl = el
  }
  private flashLogin() {
    this.loginEl?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 380, iterations: 2 })
  }
}

const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
