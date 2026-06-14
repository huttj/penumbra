import { Api, type User } from './api'
import { locateText, resolveQuoteStrict, selectorsFromRange } from './anchor'
import { extractBlockquotes, parseResponse, renderMarkdown, serializeResponse, splitLeadingEmojis } from './markdown'
import { ReviewsPanel } from './response'

// The rich-text editor (TipTap, ~600KB) is loaded on demand from a separate
// bundle the first time the response panel opens.
type ResponsePanelLike = { open(): void; close(): void; appendQuote(range: Range): void }
type ResponsePanelCtor = new (o: { api: Api; root: HTMLElement; source: string; commitSha: string | null; userName: string; onClose: () => void }) => ResponsePanelLike
type MiniEditor = { destroy(): void; getMarkdown(): string; focus(): void }
type MiniEditorFactory = (mount: HTMLElement, markdown: string, opts: { onChange: (md: string) => void; uploadImage?: (f: File) => Promise<string> }) => MiniEditor

let editorBundlePromise: Promise<void> | null = null
function ensureEditorBundle(): Promise<void> {
  if ((window as any).__PenumbraResponsePanel) return Promise.resolve()
  if (editorBundlePromise) return editorBundlePromise
  editorBundlePromise = new Promise<void>((resolve, reject) => {
    const core = document.querySelector('script[src*="penumbra.js"]') as HTMLScriptElement | null
    const url = core ? core.src.replace(/penumbra\.js(\?.*)?$/, 'penumbra-editor.js') : '/static/penumbra-editor.js'
    const s = document.createElement('script')
    s.src = url; s.onload = () => resolve(); s.onerror = () => reject(new Error('editor failed to load'))
    document.head.appendChild(s)
  })
  return editorBundlePromise
}
async function loadResponsePanel(): Promise<ResponsePanelCtor> { await ensureEditorBundle(); return (window as any).__PenumbraResponsePanel }
async function loadMiniEditor(): Promise<MiniEditorFactory> { await ensureEditorBundle(); return (window as any).__PenumbraMiniEditor }
import { CSS } from './styles'

type Config = { api: string; source?: string; sourceBase?: string; root?: string; commitSha?: string }

// A block of the reader's response doc: a quote + the note it owns. The note's
// LEADING emoji(s) are reactions (stacked left-rail chips); the remaining text is
// the comment (right card). One block can have both. Single source of truth for
// the page margins and the response panel.
type Block = { id: string; quotes: string[]; note: string; ranges: Range[]; emojis: string[]; text: string }

const HL = typeof (globalThis as any).Highlight !== 'undefined' && !!(window as any).CSS?.highlights
const GAP = 10
const MAX_EMOJI = 6 // reactions per highlight (also keeps the picker on one row)
const QUICK_EMOJI = ['👍', '❤️', '🔥', '😄', '🤔', '🎯']
const EMOJI_DATA: [string, string][] = [
  ['👍', 'thumbs up like yes good approve'], ['👎', 'thumbs down dislike no bad'], ['❤️', 'heart love red'],
  ['🔥', 'fire lit hot flame'], ['💯', 'hundred 100 perfect score'], ['🎉', 'party tada celebrate congrats'],
  ['🚀', 'rocket launch fast ship'], ['💡', 'idea bulb light'], ['✅', 'check done yes correct'],
  ['❌', 'cross no wrong x'], ['⭐', 'star favorite'], ['🙏', 'pray thanks please hands'], ['👏', 'clap applause bravo'],
  ['👀', 'eyes look watching'], ['🤔', 'think thinking hmm'], ['😂', 'laugh lol joy cry'], ['😍', 'love eyes heart'],
  ['😮', 'wow surprised'], ['😢', 'sad cry tear'], ['😡', 'angry mad rage'], ['😅', 'sweat nervous laugh'],
  ['😎', 'cool sunglasses'], ['🤯', 'mind blown exploding head'], ['🙌', 'raised hands celebrate yay'],
  ['💪', 'muscle strong flex'], ['🤝', 'handshake deal agree'], ['🧠', 'brain smart mind'], ['📌', 'pin important'],
  ['⚡', 'lightning fast bolt energy'], ['🌟', 'glowing star'], ['✨', 'sparkles shiny magic'], ['💀', 'skull dead lol'],
  ['🥹', 'holding back tears touched'], ['🫡', 'salute respect'], ['🤷', 'shrug dunno whatever'], ['🫠', 'melting embarrassed'],
  ['📝', 'memo note write'], ['🔖', 'bookmark save tag'], ['❓', 'question'], ['❗', 'exclamation important'],
  ['😀', 'grin happy smile'], ['🙂', 'slight smile'], ['😉', 'wink'], ['🤨', 'raised eyebrow suspicious doubt'],
  ['🙄', 'eye roll annoyed'], ['😴', 'sleep tired bored'], ['🥳', 'party face celebrate'], ['😱', 'scream shock fear'],
  ['🤓', 'nerd glasses geek'], ['🫶', 'heart hands love'], ['👌', 'ok perfect nice'], ['🤌', 'chefs kiss pinch'],
  ['✌️', 'peace victory'], ['🤞', 'fingers crossed luck hope'], ['👋', 'wave hi hello bye'], ['🎯', 'target bullseye goal'],
  ['🐐', 'goat greatest'], ['💸', 'money cash spend'], ['📈', 'chart up growth'], ['📉', 'chart down decline'],
]
const TRASH_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'

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
  private railEntries: { el: HTMLElement; blk: Block }[] = []
  private railRO?: ResizeObserver
  private repoQueued = false
  private railLeft = 0
  private quietTimer: any = null
  private cardEditor?: MiniEditor
  private composeEditor?: MiniEditor
  private composeBlock?: Block
  private composeNew = false

  private responsePanel?: ResponsePanelLike
  private reviewsPanel?: ReviewsPanel
  private layer!: HTMLElement
  private styleEl!: HTMLStyleElement
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
    this.styleEl = document.createElement('style')
    this.styleEl.setAttribute('data-pen', '')
    this.styleEl.textContent = CSS
    document.head.appendChild(this.styleEl)

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
    // Quartz's SPA reconciliation can strip our injected nodes — re-establish them
    // (this is why highlights vanished after sidebar navigation until a refresh).
    if (!this.styleEl.isConnected) document.head.appendChild(this.styleEl)
    if (!this.layer.isConnected) document.body.appendChild(this.layer)
    if (!this.toolbar?.isConnected) this.renderToolbar()
    if (!this.loginEl?.isConnected) this.renderLogin()
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
    this.blocks = blocks.map((b, i) => {
      const { emojis, text } = splitLeadingEmojis(b.note)
      return {
        id: `b${i}`,
        quotes: b.quotes,
        note: b.note,
        emojis,
        text,
        ranges: b.quotes
          .map((q) => resolveQuoteStrict([{ type: 'TextQuoteSelector', exact: q }], this.root))
          .filter(Boolean) as Range[],
      }
    })
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

  private async serializeAndSave(): Promise<boolean> {
    const body = serializeResponse(this.preamble, this.blocks.map((b) => ({ quotes: b.quotes, note: b.note })))
    const quotes = extractBlockquotes(body).map((text, i) => ({
      id: `q${i}`, text, selector: locateText(text, this.root) ?? [{ type: 'TextQuoteSelector', exact: text }],
    }))
    try { await this.api.saveResponse(this.source, body, quotes, this.commitSha); return true } catch { return false }
  }

  // Debounced save without re-parsing/re-rendering, so the open inline editor survives.
  private saveQuiet(card?: HTMLElement) {
    const setState = (s: string) => { const el = card?.querySelector('[data-cardsave]'); if (el) el.textContent = s }
    setState('saving…')
    clearTimeout(this.quietTimer)
    this.quietTimer = setTimeout(async () => setState((await this.serializeAndSave()) ? 'saved' : 'save failed'), 600)
  }
  private flushQuiet() { clearTimeout(this.quietTimer); void this.serializeAndSave() }

  private blockById = (id: string | null) => this.blocks.find((b) => b.id === id)
  private docY = (r: Range): number => r.getBoundingClientRect().top + window.scrollY
  // A block with comment text is a right-rail card. Its emoji reactions — and any
  // emoji-only block's — render as bare glyphs in the left margin, stuck beside the
  // quote. The card/popup picker only edits them; the margin is where they show.
  private cards = () => this.blocks.filter((b) => b.text.trim() && b.ranges.length)
  private emojiBlocks = () => this.blocks.filter((b) => b.emojis.length && b.ranges.length)

  // Reassemble a note from its emoji reactions and comment text. Leading
  // whitespace is dropped, but the comment's trailing blank lines are kept so the
  // editor round-trips them (renders ignore trailing blanks).
  private composeNote(emojis: string[], text: string): string {
    const lead = emojis.join('')
    const t = text.replace(/^\s+/, '')
    if (!t.trim()) return lead
    return lead ? `${lead} ${t}` : t
  }

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
    this.railRO?.disconnect()
    this.destroyCardEditor()
    this.layer.querySelectorAll('.pen-card.rail').forEach((n) => n.remove())
    this.railEntries = []
    if (!this.highlightsOn || this.responsePanel) return
    const rootRect = this.root.getBoundingClientRect()
    if (window.innerWidth - rootRect.right < 300) return // no room
    this.railLeft = window.scrollX + rootRect.right + 24

    const list = this.cards().sort((a, b) => this.docY(a.ranges[0]) - this.docY(b.ranges[0]))
    if (!list.length) return
    for (const blk of list) {
      const card = this.buildCard(blk, this.focused === blk.id)
      card.style.left = `${this.railLeft}px`; card.style.top = '-9999px'
      this.layer.appendChild(card)
      this.railEntries.push({ el: card, blk })
    }
    // Re-pack whenever any card changes height (expand, image load, editor grow).
    this.railRO = new ResizeObserver(() => this.queueReposition())
    this.railEntries.forEach((e) => this.railRO!.observe(e.el))
    this.repositionRail()
    // Mount the rich editor onto the focused card (lazy-loads the editor bundle).
    const focusedEntry = this.railEntries.find((e) => e.blk.id === this.focused)
    if (focusedEntry) this.mountCardEditor(focusedEntry.el, focusedEntry.blk)
  }

  private async mountCardEditor(el: HTMLElement, blk: Block) {
    const mount = el.querySelector<HTMLElement>('[data-note-editor]')
    if (!mount) return
    let factory: MiniEditorFactory
    try { factory = await loadMiniEditor() } catch { return }
    if (this.focused !== blk.id || !mount.isConnected) return // focus moved while loading
    this.destroyCardEditor()
    mount.textContent = '' // clear the rendered placeholder before mounting the editor
    this.cardEditor = factory(mount, blk.text, {
      onChange: (md) => { blk.text = md; blk.note = this.composeNote(blk.emojis, md); this.queueReposition(); this.saveQuiet(el) },
      uploadImage: (f) => this.api.uploadImage(f),
    })
    this.cardEditor.focus()
  }

  private destroyCardEditor() {
    if (!this.cardEditor) return
    this.flushQuiet()
    this.cardEditor.destroy()
    this.cardEditor = undefined
  }

  private queueReposition() {
    if (this.repoQueued) return
    this.repoQueued = true
    requestAnimationFrame(() => { this.repoQueued = false; this.repositionRail() })
  }

  // Pack cards by their anchor without rebuilding them — each card knows its own
  // height, and the focused one is pinned to its quote with neighbours flowing away.
  private repositionRail() {
    const entries = this.railEntries
    if (!entries.length) return
    const hs = entries.map((e) => e.el.offsetHeight)
    const anchor = entries.map((e) => (e.blk.ranges[0] ? this.docY(e.blk.ranges[0]) : 0))
    const pos = anchor.slice()
    const fi = entries.findIndex((e) => e.blk.id === this.focused)
    if (fi >= 0) {
      pos[fi] = anchor[fi]
      for (let i = fi + 1; i < entries.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + hs[i - 1] + GAP)
      for (let i = fi - 1; i >= 0; i--) pos[i] = Math.min(anchor[i], pos[i + 1] - hs[i] - GAP)
    } else {
      for (let i = 1; i < entries.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + hs[i - 1] + GAP)
    }
    entries.forEach((e, i) => (e.el.style.top = `${Math.max(0, pos[i])}px`))
  }

  private layoutLeftRail() {
    this.layer.querySelectorAll('.pen-emote-stack').forEach((n) => n.remove())
    if (!this.highlightsOn || this.responsePanel) return
    const rootRect = this.root.getBoundingClientRect()
    const x = window.scrollX + Math.max(6, rootRect.left - 40)
    let bottom = 0
    for (const blk of this.emojiBlocks().sort((a, b) => this.docY(a.ranges[0]) - this.docY(b.ranges[0]))) {
      const stack = document.createElement('div')
      stack.className = 'pen-emote-stack'; stack.setAttribute('data-pen-ui', ''); stack.dataset.blockId = blk.id
      stack.innerHTML = blk.emojis.map((e) => `<span class="pen-emote">${esc(e)}</span>`).join('')
      stack.title = 'Edit reaction'
      stack.addEventListener('mouseenter', () => this.setHovered(blk.id))
      stack.addEventListener('mouseleave', () => this.setHovered(null))
      stack.addEventListener('click', () => this.editBlock(blk))
      this.layer.appendChild(stack)
      const top = Math.max(this.docY(blk.ranges[0]), bottom + 6)
      stack.style.left = `${x}px`; stack.style.top = `${top}px`
      bottom = top + stack.offsetHeight
    }
  }

  private buildCard(blk: Block, expanded: boolean): HTMLElement {
    const card = document.createElement('div')
    card.className = `pen-card rail ${expanded ? 'focused' : 'compact'}`
    card.setAttribute('data-pen-ui', ''); card.dataset.blockId = blk.id

    const quoteHtml = blk.quotes.map((q) => `<div class="pen-quote">${esc(q)}</div>`).join('')
    if (!expanded) {
      const noteHtml = blk.text.trim()
        ? `<div class="pen-md">${renderMarkdown(blk.text)}</div>`
        : `<div class="pen-md pen-muted">Add a comment…</div>`
      card.innerHTML = `${quoteHtml}<div class="pen-thread">${noteHtml}</div>`
      card.addEventListener('click', () => this.focus(blk.id))
    } else {
      // Rich-text editor is mounted (lazy) onto this placeholder in layoutRightRail.
      card.innerHTML = `${quoteHtml}
        <div class="pen-note-editor" data-note-editor><div class="pen-md">${renderMarkdown(blk.text)}</div></div>
        <div class="pen-emojislot" data-emojislot></div>
        <div class="pen-row pen-cardfoot"><span></span><span class="pen-savestate" data-cardsave></span></div>
        <div class="pen-trashbox">
          <button class="pen-trash" data-act="del-init" title="Delete comment">${TRASH_SVG}</button>
          <div class="pen-trashconfirm" data-confirm hidden>
            <button class="pen-trash pen-yes" data-act="del-yes" title="Confirm delete">✓</button>
            <button class="pen-trash pen-no" data-act="del-no" title="Cancel">✕</button>
          </div></div>`
      const slot = card.querySelector('[data-emojislot]') as HTMLElement
      slot.appendChild(this.buildEmojiPanel(() => blk.emojis, (e) => this.toggleCardEmoji(blk, e, card)))
      const confirmEl = card.querySelector('[data-confirm]') as HTMLElement
      const trashBtn = card.querySelector('[data-act="del-init"]') as HTMLElement
      trashBtn.addEventListener('click', () => { trashBtn.style.display = 'none'; confirmEl.hidden = false })
      card.querySelector('[data-act="del-no"]')!.addEventListener('click', () => { confirmEl.hidden = true; trashBtn.style.display = '' })
      card.querySelector('[data-act="del-yes"]')!.addEventListener('click', () => {
        // Deleting the comment keeps any emoji reactions on the block.
        if (blk.emojis.length) { blk.text = ''; blk.note = this.composeNote(blk.emojis, '') }
        else this.blocks = this.blocks.filter((b) => b.id !== blk.id)
        this.saveDoc()
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

  // Toggle a reaction on a focused card's block; autosaves and live-updates the
  // left margin without rebuilding the editor, so the open card survives.
  private toggleCardEmoji(blk: Block, emoji: string, card: HTMLElement) {
    if (this.cardEditor) blk.text = this.cardEditor.getMarkdown()
    const i = blk.emojis.indexOf(emoji)
    if (i >= 0) blk.emojis.splice(i, 1)
    else if (blk.emojis.length < MAX_EMOJI) blk.emojis.push(emoji)
    blk.note = this.composeNote(blk.emojis, blk.text)
    this.layoutLeftRail()
    this.queueReposition()
    this.saveQuiet(card)
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

  // The one compose box: a rich-text comment (autosaved, no button) plus an emoji
  // panel where a click adds/removes that reaction and closes. Used for a fresh
  // selection (range) and for editing an existing block (editBlk).
  private async openCompose(range: Range | null, editBlk?: Block) {
    if (!this.user) { if (range) this.promptSignIn(range); return }
    let quote = ''
    if (editBlk) quote = editBlk.quotes[0] ?? ''
    else if (range) {
      quote = (selectorsFromRange(range, this.root)?.find((s: any) => s.type === 'TextQuoteSelector') as any)?.exact ?? ''
    }
    if (!quote) return
    const anchor = range ?? editBlk?.ranges[0] ?? null
    if (!anchor) return
    this.dismissCompose()

    // The block being edited; for a fresh selection, a detached one we only graft
    // into the doc once it has content (on autosave or emoji pick).
    const wb: Block = editBlk ?? { id: `b${this.blocks.length}`, quotes: [quote], note: '', emojis: [], text: '', ranges: [range!.cloneRange()] }

    const rect = anchor.getBoundingClientRect()
    const box = document.createElement('div')
    box.className = 'pen-compose'; box.setAttribute('data-pen-ui', '')
    box.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 372)}px`
    box.style.top = `${window.scrollY + rect.bottom + 8}px`
    box.innerHTML = `<div class="pen-note-editor" data-note-editor></div><div data-emojislot></div>`
    box.querySelector('[data-emojislot]')!.appendChild(this.buildEmojiPanel(() => wb.emojis, (e) => this.toggleComposeEmoji(e)))
    this.layer.appendChild(box)
    this.compose = box
    this.composeBlock = wb
    this.composeNew = !editBlk
    if (range) { this.composeCtx = { range, quote }; this.renderHighlights() } // stand-in highlight

    let factory: MiniEditorFactory
    try { factory = await loadMiniEditor() } catch { return }
    if (this.compose !== box) return // dismissed while the editor bundle loaded
    const mount = box.querySelector('[data-note-editor]') as HTMLElement
    this.composeEditor = factory(mount, wb.text, {
      onChange: (md) => { wb.text = md; wb.note = this.composeNote(wb.emojis, md); this.graftCompose(); this.saveQuiet() },
      uploadImage: (f) => this.api.uploadImage(f),
    })
    this.composeEditor.focus()
  }

  private editBlock(blk: Block) { void this.openCompose(null, blk) }

  // Splice a fresh-selection block into the doc once it has content, and pull it
  // back out if emptied — so autosave never persists a bare, comment-less quote.
  private graftCompose() {
    const wb = this.composeBlock
    if (!wb || !this.composeNew) return
    const has = this.blocks.includes(wb)
    if (wb.note.trim() && !has) this.blocks.push(wb)
    else if (!wb.note.trim() && has) this.blocks = this.blocks.filter((b) => b !== wb)
  }

  // Toggle a reaction on the open compose block; the picker highlights it, the
  // left margin updates immediately, and the change autosaves. The popup stays open.
  private toggleComposeEmoji(emoji: string) {
    const wb = this.composeBlock
    if (!wb) return
    if (this.composeEditor) wb.text = this.composeEditor.getMarkdown()
    const i = wb.emojis.indexOf(emoji)
    if (i >= 0) wb.emojis.splice(i, 1)
    else if (wb.emojis.length < MAX_EMOJI) wb.emojis.push(emoji)
    wb.note = this.composeNote(wb.emojis, wb.text)
    this.graftCompose()
    this.layoutLeftRail()
    this.saveQuiet()
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


  // Shared emoji UI bound to a block's reaction set: selected emoji are highlighted
  // (non-quick ones lead the bar), and clicking any toggles it. A "＋ more" button
  // reveals a search + the full grid. `getSel` reads the live selection so the
  // highlight stays in sync as the caller mutates the block.
  private buildEmojiPanel(getSel: () => string[], onToggle: (e: string) => void): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'pen-emojipanel'
    wrap.innerHTML = `
      <div class="pen-emojibar" data-bar></div>
      <div class="pen-emojimore" data-more hidden>
        <input class="pen-emoji-search" placeholder="Search emoji…">
        <div class="pen-emojigrid" data-grid></div>
      </div>`
    const bar = wrap.querySelector('[data-bar]') as HTMLElement
    const grid = wrap.querySelector('[data-grid]') as HTMLElement
    const more = wrap.querySelector('[data-more]') as HTMLElement
    const search = wrap.querySelector('.pen-emoji-search') as HTMLInputElement
    const btn = (e: string, sel: string[]) => `<button class="${sel.includes(e) ? 'selected' : ''}" data-e="${esc(e)}">${esc(e)}</button>`
    const renderGrid = () => {
      const sel = getSel(); const ql = search.value.trim().toLowerCase()
      grid.innerHTML = EMOJI_DATA.filter(([e, kw]) => !ql || kw.includes(ql) || e === search.value).map(([e]) => btn(e, sel)).join('')
      grid.querySelectorAll('[data-e]').forEach((b) => b.addEventListener('click', () => tap((b as HTMLElement).dataset.e!)))
    }
    const renderBar = () => {
      const sel = getSel()
      // Selected emoji always lead (and stay visible); fill the rest of the single
      // row with unselected quick picks. Cap at MAX_EMOJI buttons so it never wraps.
      const quick = QUICK_EMOJI.filter((e) => !sel.includes(e)).slice(0, Math.max(0, MAX_EMOJI - sel.length))
      bar.innerHTML = sel.map((e) => btn(e, sel)).join('') + quick.map((e) => btn(e, sel)).join('') +
        `<button class="pen-emoji-more" data-act="more" title="More emoji">＋</button>`
      bar.querySelectorAll('[data-e]').forEach((b) => b.addEventListener('click', () => tap((b as HTMLElement).dataset.e!)))
      bar.querySelector('[data-act="more"]')!.addEventListener('click', () => { more.hidden = !more.hidden; if (!more.hidden) { renderGrid(); search.focus() } })
    }
    const tap = (e: string) => { onToggle(e); renderBar(); if (!more.hidden) renderGrid() }
    search.addEventListener('input', renderGrid)
    renderBar()
    return wrap
  }

  // Tear down the popup without persisting (the caller handles saving).
  private teardownCompose() {
    clearTimeout(this.quietTimer)
    this.composeEditor?.destroy(); this.composeEditor = undefined
    this.composeBlock = undefined; this.composeNew = false
    this.compose?.remove(); this.compose = undefined; this.composeCtx = undefined
  }

  // Click-away / Escape: autosave the comment (no button), drop an empty draft,
  // then re-render so the new card/chips appear.
  private dismissCompose() {
    if (!this.compose) { this.renderHighlights(); return }
    const wb = this.composeBlock
    if (wb && this.composeEditor) { wb.text = this.composeEditor.getMarkdown(); wb.note = this.composeNote(wb.emojis, wb.text) }
    const dirty = !!wb && (this.blocks.includes(wb) || (this.composeNew && !!wb.note.trim()))
    if (wb && this.composeNew && wb.note.trim() && !this.blocks.includes(wb)) this.blocks.push(wb)
    if (wb && !wb.note.trim()) this.blocks = this.blocks.filter((b) => b !== wb)
    this.teardownCompose()
    if (dirty) this.saveDoc(); else this.renderAll()
  }

  // ---- pointer handling ----------------------------------------------------

  private onDocMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    this.dismissCompose(); this.removeQuoteBtn()
  }
  private onDocClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    if (window.getSelection()?.toString().trim()) return
    for (const b of this.blocks) {
      if (b.ranges.some((r) => this.hitsRange(e, r))) {
        // Has a comment → focus its card; emoji-only → compose box to add text/swap emoji.
        if (b.text.trim()) return this.focus(b.id)
        return this.editBlock(b)
      }
    }
    if (this.focused) { this.focused = null; this.renderAll() }
  }
  private hitsRange(e: MouseEvent, range: Range): boolean {
    for (const r of range.getClientRects())
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return true
    return false
  }

  // ---- toolbar + panels ----------------------------------------------------

  private renderToolbar() {
    this.toolbar?.remove()
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

  private async toggleResponse() {
    if (this.responsePanel) { this.responsePanel.close(); return }
    if (!this.user) return this.flashLogin()
    let RP: ResponsePanelCtor
    this.toolbar?.querySelector('[data-act="response"]')?.classList.add('active')
    try { RP = await loadResponsePanel() } catch { this.toolbar?.querySelector('[data-act="response"]')?.classList.remove('active'); alert('Could not load the editor.'); return }
    if (this.responsePanel) return // a double-click already opened it while loading
    this.destroyCardEditor()
    this.layer.querySelectorAll('.pen-card.rail, .pen-emote-stack').forEach((n) => n.remove())
    this.responsePanel = new RP({
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
