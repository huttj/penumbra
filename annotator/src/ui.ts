import { Api, type User } from './api'
import {
  imageOccurrence, imageQuoteFromImg, imageSrcOf, imagesInRange, locateText,
  quotePiecesFromRange, resolveImageQuote, resolveNthQuote,
} from './anchor'
import { extractBlockquotes, hasCommentText, parseResponse, renderMarkdown, serializeResponse, splitLeadingEmojis } from './markdown'
import { syncImageOverlays } from './overlay'
import { ReviewsPanel } from './response'

// The rich-text editor (TipTap, ~600KB) is loaded on demand from a separate
// bundle the first time the response panel opens.
type ResponsePanelLike = { open(): void; close(): void; appendQuote(range: Range): void }
type ResponsePanelCtor = new (o: { api: Api; root: HTMLElement; source: string; commitSha: string | null; userName: string; onClose: () => void }) => ResponsePanelLike
type MiniEditor = { destroy(): void; getMarkdown(): string; focus(): void; refocus(): void }
type MiniEditorFactory = (mount: HTMLElement, markdown: string, opts: { onChange: (md: string) => void; uploadImage?: (f: File) => Promise<string>; onSubmit?: () => void }) => MiniEditor

let editorBundlePromise: Promise<void> | null = null
function ensureEditorBundle(): Promise<void> {
  if ((window as any).__PenumbraResponsePanel) return Promise.resolve()
  if (editorBundlePromise) return editorBundlePromise
  editorBundlePromise = new Promise<void>((resolve, reject) => {
    const core = document.querySelector('script[src*="penumbra.js"]') as HTMLScriptElement | null
    let url = core ? core.src.replace(/penumbra\.js(\?.*)?$/, 'penumbra-editor.js') : '/static/penumbra-editor.js'
    // Dev only: bust the browser cache so iterating on the lazy editor bundle takes
    // effect on a normal reload (the dev server sends no Cache-Control).
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') url += `?t=${Date.now()}`
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
// `imgs` are the images this block highlights — both image-embed quote pieces and
// any images caught inside a text passage's range. They render as overlay boxes
// (the CSS Custom Highlight API only paints text, never replaced elements).
type Block = { id: string; quotes: string[]; nths: number[]; note: string; ranges: Range[]; imgs: HTMLImageElement[]; emojis: string[]; text: string }

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
  private cardEmojiRow?: HTMLElement
  private composeEditor?: MiniEditor
  private composeBlock?: Block
  private composeNew = false
  private composeRoot?: HTMLElement
  private selTimer: any = null
  private feedbackId: string | null = null

  private responsePanel?: ResponsePanelLike
  private reviewsPanel?: ReviewsPanel
  private layer!: HTMLElement
  private styleEl!: HTMLStyleElement
  private toolbar?: HTMLElement
  private loginEl?: HTMLElement
  private compose?: HTMLElement
  private composeCtx?: { range: Range; quote: string; imgs?: HTMLImageElement[] }
  private quoteBtn?: HTMLElement
  private tooltip?: HTMLElement

  constructor(cfg: Config) {
    this.cfg = cfg
    this.api = new Api(cfg.api)
    this.feedbackId = this.computeFeedbackId()
    this.root = this.resolveRoot()
    this.source = this.computeSource()
    this.commitSha = cfg.commitSha ?? null
  }

  private resolveRoot(): HTMLElement {
    return (this.cfg.root ? document.querySelector<HTMLElement>(this.cfg.root) : null) ?? document.body
  }
  // The /feedback shell page carries the response id in ?id=; on a feedback page
  // the annotator renders that doc and keys everything to its canonical URL.
  private computeFeedbackId(): string | null {
    if (!/\/feedback\/?$/.test(location.pathname)) return null
    return new URLSearchParams(location.search).get('id')
  }
  private computeSource(): string {
    if (this.feedbackId && this.cfg.sourceBase) return `${this.cfg.sourceBase.replace(/\/$/, '')}/feedback?id=${this.feedbackId}`
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
      this.scheduleSelection()
    })
    // Touch selection (long-press) doesn't always emit a usable mouseup; mirror it.
    document.addEventListener('touchend', (e) => {
      if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
      this.scheduleSelection()
    }, { passive: true })
    document.addEventListener('mousedown', (e) => this.onDocMouseDown(e))
    document.addEventListener('click', (e) => this.onDocClick(e))
    document.addEventListener('mousemove', (e) => this.onMouseMove(e), { passive: true })
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return
      if (this.compose) this.dismissCompose()
      else if (this.focused) { this.focused = null; this.renderAll() }
    })
    window.addEventListener('resize', () => this.queueRelayout(), { passive: true })
    // When the on-screen keyboard opens/closes the visual viewport shrinks/grows —
    // keep any open bottom sheet sitting just above the keyboard.
    const vv = window.visualViewport
    if (vv) { const onVV = () => this.repositionSheets(); vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV) }
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
    this.feedbackId = this.computeFeedbackId()
    this.root = this.resolveRoot()
    this.source = this.computeSource()
    await this.loadDoc()
  }

  // ---- data: the response doc → blocks -------------------------------------

  private async loadDoc() {
    // On a /feedback page, first render the feedback doc INTO the article; the
    // margins below then load the viewer's own notes on that feedback (its source).
    if (this.feedbackId) await this.renderFeedbackPage()
    let body = ''
    if (this.user) body = (await this.api.getResponse(this.source).catch(() => null))?.body ?? ''
    this.parse(body)
    this.renderAll()
  }

  // Render a reader's feedback doc as the page body (the keystone of feedback
  // pages). The viewer must be the doc's owner or the author; otherwise it's private.
  private async renderFeedbackPage() {
    const root = this.root
    if (!this.user) { root.innerHTML = '<p class="pen-fb-note">Sign in to view this feedback.</p>'; return }
    const fb = await this.api.getResponseById(this.feedbackId!).catch(() => null)
    if (!fb) { root.innerHTML = '<p class="pen-fb-note">This feedback is private, or it doesn’t exist.</p>'; return }
    const who = esc(fb.creator?.name ?? 'a reader')
    const onPage = esc(sourceLabel(fb.source))
    const link = esc(fb.source)
    document.title = `Feedback from ${fb.creator?.name ?? 'a reader'}`
    root.innerHTML =
      `<header class="pen-fb-head">Feedback from <b>${who}</b> on <a href="${link}">${onPage}</a></header>` +
      renderMarkdown(fb.body || '_(empty)_')
  }

  private parse(body: string) {
    const { preamble, blocks } = parseResponse(body)
    this.preamble = preamble
    this.blocks = blocks.map((b, i) => {
      const { emojis, text } = splitLeadingEmojis(b.note)
      const ranges: Range[] = []
      const imgs: HTMLImageElement[] = []
      const addImg = (img: HTMLImageElement) => { if (!imgs.includes(img)) imgs.push(img) }
      b.quotes.forEach((q, k) => {
        const nth = b.nths[k] ?? 1
        if (imageSrcOf(q)) {
          // An image-embed quote: anchor to the live <img> by basename + occurrence.
          const img = resolveImageQuote(q, nth, this.root)
          if (img) { addImg(img); const r = document.createRange(); r.selectNode(img); ranges.push(r) }
        } else {
          const r = resolveNthQuote(q, nth, this.root)
          if (r) { ranges.push(r); imagesInRange(r, this.root).forEach(addImg) } // images swept up by a text passage
        }
      })
      return { id: `b${i}`, quotes: b.quotes, nths: b.nths, note: b.note, emojis, text, ranges, imgs }
    })
  }

  // Serialize blocks back to markdown and persist; then re-parse + re-render.
  private async saveDoc() {
    const body = serializeResponse(this.preamble, this.blocks.map((b) => ({ quotes: b.quotes, nths: b.nths, note: b.note })))
    const quotes = extractBlockquotes(body).map((text, i) => ({
      id: `q${i}`, text, selector: locateText(text, this.root) ?? [{ type: 'TextQuoteSelector', exact: text }],
    }))
    try { await this.api.saveResponse(this.source, body, quotes, this.commitSha) } catch (e: any) { alert('Could not save: ' + e.message); return }
    this.focused = null
    this.parse(body)
    this.renderAll()
  }

  private async serializeAndSave(): Promise<boolean> {
    const body = serializeResponse(this.preamble, this.blocks.map((b) => ({ quotes: b.quotes, nths: b.nths, note: b.note })))
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

  // Narrow viewports can't host the side rail; comments + compose dock to a
  // bottom sheet and the left-margin reactions are hidden instead.
  private isMobile = () => window.innerWidth <= 720
  private blockById = (id: string | null) => this.blocks.find((b) => b.id === id)
  private docY = (r: Range): number => r.getBoundingClientRect().top + window.scrollY
  // EVERY block with emoji shows its reactions as a cluster in the left margin.
  // A block with comment text is also a right-rail card (with tiny reactions
  // hanging off its edge).
  private cards = () => this.blocks.filter((b) => hasCommentText(b.text) && b.ranges.length)
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
    if (this.isMobile()) { this.layoutMobileSheet(); return }
    this.layoutRightRail()
    this.layoutLeftRail()
  }

  private scheduleSelection() {
    clearTimeout(this.selTimer)
    this.selTimer = setTimeout(() => this.onSelection(), 30)
  }

  // ---- mobile: dock the focused comment as a bottom sheet ------------------

  // On a narrow screen the focused comment becomes a sheet pinned to the bottom
  // (article visible above it). Reactions live in the sheet footer; the left
  // margin reactions and right rail are suppressed (see layoutLeftRail/renderAll).
  private layoutMobileSheet() {
    this.railRO?.disconnect()
    this.destroyCardEditor()
    this.layer.querySelectorAll('.pen-card.rail, .pen-cardemoji, .pen-emote-stack, .pen-sheet').forEach((n) => n.remove())
    this.cardEmojiRow = undefined
    this.railEntries = []
    if (!this.highlightsOn || this.responsePanel) return
    const blk = this.blockById(this.focused)
    if (!blk || !blk.ranges.length || !hasCommentText(blk.text)) return // emoji-only edits route through compose
    const card = this.buildCard(blk, true)
    const foot = document.createElement('div')
    foot.className = 'pen-sheet-foot'; foot.setAttribute('data-pen-ui', '')
    foot.appendChild(this.buildEmojiPanel(() => blk.emojis, (e) => this.toggleCardEmoji(blk, e, card)))
    const sheet = this.wrapSheet(card, { onClose: () => { this.focused = null; this.renderAll() }, footer: foot })
    this.layer.appendChild(sheet)
    this.railEntries = [{ el: card, blk }]
    this.positionSheet(sheet)
    this.mountCardEditor(card, blk)
  }

  // A bottom-sheet shell: grabber + close header, a scrollable body holding the
  // card/compose box, and an optional pinned footer (the reaction picker).
  private wrapSheet(inner: HTMLElement, opts: { onClose: () => void; footer?: HTMLElement }): HTMLElement {
    const sheet = document.createElement('div')
    sheet.className = 'pen-sheet'; sheet.setAttribute('data-pen-ui', '')
    const head = document.createElement('div')
    head.className = 'pen-sheet-head'; head.innerHTML = '<div class="pen-sheet-grab"></div>'
    const close = document.createElement('button')
    close.className = 'pen-sheet-close'; close.setAttribute('aria-label', 'Close'); close.textContent = '✕'
    close.addEventListener('click', (e) => { e.stopPropagation(); opts.onClose() })
    head.appendChild(close)
    const body = document.createElement('div')
    body.className = 'pen-sheet-body'; body.appendChild(inner)
    sheet.appendChild(head); sheet.appendChild(body)
    if (opts.footer) sheet.appendChild(opts.footer)
    return sheet
  }

  // Dock a sheet just above the on-screen keyboard, capping its height at half the
  // available (above-keyboard) viewport so it always fits and scrolls internally.
  private positionSheet(el: HTMLElement) {
    const vv = window.visualViewport
    if (!vv) { el.style.maxHeight = '50vh'; return }
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    el.style.bottom = `${inset}px`
    el.style.maxHeight = `${Math.round(Math.min(window.innerHeight * 0.5, vv.height - 12))}px`
  }
  private repositionSheets() {
    this.layer.querySelectorAll<HTMLElement>('.pen-sheet').forEach((el) => this.positionSheet(el))
  }

  // Place a popover (compose / sign-in): a bottom sheet on mobile, else floated
  // just below its anchor. Records composeRoot so teardown removes the wrapper.
  private dockBox(box: HTMLElement, rect: DOMRect, onClose: () => void) {
    if (this.isMobile()) {
      const sheet = this.wrapSheet(box, { onClose })
      this.layer.appendChild(sheet); this.composeRoot = sheet
      this.positionSheet(sheet)
    } else {
      box.style.left = `${Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 372)}px`
      box.style.top = `${window.scrollY + rect.bottom + 8}px`
      this.layer.appendChild(box); this.composeRoot = box
    }
  }
  private queueRelayout() {
    if (this.relayoutQueued) return
    this.relayoutQueued = true
    requestAnimationFrame(() => { this.relayoutQueued = false; this.renderAll() })
  }

  private renderHighlights() {
    this.renderImageOverlays() // images can't be painted by the Highlight API; box them
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

  // Draw an overlay box over every highlighted image. The boxes live in the
  // document-anchored layer (so they scroll with the page) and are pointer-events:
  // none, so clicks fall through to the <img> and reach the normal block/compose
  // handlers — same hit-testing as a text highlight.
  private renderImageOverlays() {
    if (!this.highlightsOn || this.responsePanel) { syncImageOverlays(this.layer, []); return } // panel owns its own overlays
    const activeId = this.hovered ?? this.focused
    const items: { img: HTMLImageElement; variant?: string }[] = []
    for (const b of this.blocks)
      for (const img of b.imgs) items.push({ img, variant: b.id === activeId ? 'active' : undefined })
    for (const img of this.composeCtx?.imgs ?? []) items.push({ img, variant: 'draft' })
    syncImageOverlays(this.layer, items)
  }

  private layoutRightRail() {
    this.railRO?.disconnect()
    this.destroyCardEditor()
    this.layer.querySelectorAll('.pen-card.rail, .pen-cardemoji, .pen-sheet').forEach((n) => n.remove())
    this.cardEmojiRow = undefined
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
    // The focused card's reaction picker floats just BELOW the card (not inside it).
    const focusedEntry = this.railEntries.find((e) => e.blk.id === this.focused)
    if (focusedEntry) {
      const row = document.createElement('div')
      row.className = 'pen-cardemoji'; row.setAttribute('data-pen-ui', '')
      row.appendChild(this.buildEmojiPanel(() => focusedEntry.blk.emojis, (e) => this.toggleCardEmoji(focusedEntry.blk, e, focusedEntry.el)))
      this.layer.appendChild(row)
      this.cardEmojiRow = row
    }
    // Re-pack whenever any card changes height (expand, image load, editor grow).
    this.railRO = new ResizeObserver(() => this.queueReposition())
    this.railEntries.forEach((e) => this.railRO!.observe(e.el))
    this.repositionRail()
    // Mount the rich editor onto the focused card (lazy-loads the editor bundle).
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
    // On mobile, leave the comment unfocused so opening the sheet reads (no keyboard
    // pop); the reader taps into the text to edit. On desktop, focus immediately.
    if (!this.isMobile()) this.cardEditor.focus()
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
    if (this.isMobile()) return // the mobile sheet positions itself via positionSheet
    const entries = this.railEntries
    if (!entries.length) return
    const fi = entries.findIndex((e) => e.blk.id === this.focused)
    // The focused card reserves extra room for its floating reaction picker below
    // it; compact cards with reactions hang glyphs off their bottom edge (clearance).
    const pickerH = this.cardEmojiRow ? this.cardEmojiRow.offsetHeight + 8 : 0
    const hs = entries.map((e, i) =>
      e.el.offsetHeight + (i === fi ? pickerH : e.blk.emojis.length && e.blk.id !== this.focused ? 11 : 0))
    const anchor = entries.map((e) => (e.blk.ranges[0] ? this.docY(e.blk.ranges[0]) : 0))
    const pos = anchor.slice()
    if (fi >= 0) {
      pos[fi] = anchor[fi]
      for (let i = fi + 1; i < entries.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + hs[i - 1] + GAP)
      for (let i = fi - 1; i >= 0; i--) pos[i] = Math.min(anchor[i], pos[i + 1] - hs[i] - GAP)
    } else {
      for (let i = 1; i < entries.length; i++) pos[i] = Math.max(anchor[i], pos[i - 1] + hs[i - 1] + GAP)
    }
    entries.forEach((e, i) => (e.el.style.top = `${Math.max(0, pos[i])}px`))
    if (this.cardEmojiRow && fi >= 0) {
      this.cardEmojiRow.style.left = `${this.railLeft}px`
      this.cardEmojiRow.style.top = `${Math.max(0, pos[fi]) + entries[fi].el.offsetHeight + 8}px`
    }
  }

  private layoutLeftRail() {
    this.layer.querySelectorAll('.pen-emote-stack').forEach((n) => n.remove())
    if (!this.highlightsOn || this.responsePanel || this.isMobile()) return
    const rootRect = this.root.getBoundingClientRect()
    // The cluster's right edge is pinned just left of the article (CSS translateX
    // -100%); it grows leftward, and the first emoji — pinned at that right edge —
    // never moves. Render reversed so emojis[0] lands on the right.
    const rightEdge = window.scrollX + rootRect.left - 8
    let bottom = 0
    for (const blk of this.emojiBlocks().sort((a, b) => this.docY(a.ranges[0]) - this.docY(b.ranges[0]))) {
      const stack = document.createElement('div')
      // Seed the spread (emphasised) state if this block is already hovered/focused,
      // so a rebuild doesn't flash from overlapped → spread.
      const emph = this.hovered === blk.id || this.focused === blk.id
      stack.className = `pen-emote-stack${emph ? ' pen-emph' : ''}`; stack.setAttribute('data-pen-ui', ''); stack.dataset.blockId = blk.id
      stack.innerHTML = blk.emojis.slice().reverse().map((e) => `<span class="pen-emote">${esc(e)}</span>`).join('')
      stack.title = hasCommentText(blk.text) ? 'Open comment' : 'Edit reaction'
      stack.addEventListener('mouseenter', () => this.setHovered(blk.id))
      stack.addEventListener('mouseleave', () => this.setHovered(null))
      // A reaction with a comment focuses that card; a bare reaction opens the popup.
      stack.addEventListener('click', () => (hasCommentText(blk.text) ? this.focus(blk.id) : this.editBlock(blk)))
      this.layer.appendChild(stack)
      const top = Math.max(this.docY(blk.ranges[0]), bottom + 6)
      stack.style.left = `${rightEdge}px`; stack.style.top = `${top}px`
      bottom = top + stack.offsetHeight
    }
  }

  private buildCard(blk: Block, expanded: boolean): HTMLElement {
    const card = document.createElement('div')
    card.className = `pen-card rail ${expanded ? 'focused' : 'compact'}`
    card.setAttribute('data-pen-ui', ''); card.dataset.blockId = blk.id

    const quoteHtml = blk.quotes.map((q) => {
      const src = imageSrcOf(q)
      return src
        ? `<div class="pen-quote pen-quote-img"><img src="${esc(src)}" alt=""></div>`
        : `<div class="pen-quote">${esc(q)}</div>`
    }).join('')
    if (!expanded) {
      const noteHtml = hasCommentText(blk.text)
        ? `<div class="pen-md">${renderMarkdown(blk.text)}</div>`
        : `<div class="pen-md pen-muted">Add a comment…</div>`
      const emojiHtml = blk.emojis.length
        ? `<div class="pen-card-emoji">${blk.emojis.map((e) => `<span>${esc(e)}</span>`).join('')}</div>` : ''
      card.innerHTML = `${quoteHtml}<div class="pen-thread">${noteHtml}</div>${emojiHtml}`
      card.addEventListener('click', () => this.focus(blk.id))
    } else {
      // Rich-text editor is mounted (lazy) onto this placeholder in layoutRightRail.
      // The reaction picker lives OUTSIDE the card (floated below it) — see layoutRightRail.
      card.innerHTML = `${quoteHtml}
        <div class="pen-note-editor" data-note-editor><div class="pen-md">${renderMarkdown(blk.text)}</div></div>
        <span class="pen-savestate" data-cardsave></span>
        <div class="pen-trashbox">
          <button class="pen-trash" data-act="del-init" title="Delete comment">${TRASH_SVG}</button>
          <div class="pen-trashconfirm" data-confirm hidden>
            <button class="pen-trash pen-yes" data-act="del-yes" title="Confirm delete">✓</button>
            <button class="pen-trash pen-no" data-act="del-no" title="Cancel">✕</button>
          </div></div>`
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

  // Toggle a reaction on a focused card's block; the picker highlights it, the left
  // margin updates, and it autosaves — WITHOUT rebuilding the rail, so the open card
  // never collapses. Re-assert editor focus in case the button click stole it.
  private toggleCardEmoji(blk: Block, emoji: string, card: HTMLElement) {
    if (this.cardEditor) blk.text = this.cardEditor.getMarkdown()
    const i = blk.emojis.indexOf(emoji)
    if (i >= 0) blk.emojis.splice(i, 1)
    else if (blk.emojis.length < MAX_EMOJI) blk.emojis.push(emoji)
    blk.note = this.composeNote(blk.emojis, blk.text)
    this.layoutLeftRail()
    this.queueReposition()
    this.saveQuiet(card)
    // Restore focus at the SAME cursor position (no scroll/jump) in case the button
    // click stole it — deferred so it wins after the browser settles focus.
    const ed = this.cardEditor
    requestAnimationFrame(() => ed?.refocus())
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
    // Highlights off = read-only mode: a selection shouldn't pop the compose panel.
    if (!this.highlightsOn) return
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
  private async openCompose(range: Range | null, editBlk?: Block, img?: HTMLImageElement) {
    if (!this.user) { if (range) this.promptSignIn(range); return }
    let quotes: string[] = []
    let nths: number[] = []
    let imgs: HTMLImageElement[] = []
    if (editBlk) { quotes = editBlk.quotes; nths = editBlk.nths; imgs = editBlk.imgs }
    else if (img) { quotes = [imageQuoteFromImg(img)]; nths = [imageOccurrence(img, this.root)]; imgs = [img] }
    else if (range) {
      const pieces = quotePiecesFromRange(range, this.root) // text runs + images, in order
      if (pieces) { quotes = pieces.quotes; nths = pieces.nths }
      imgs = imagesInRange(range, this.root)
    }
    const quote = quotes[0] ?? ''
    if (!quote) return
    const anchor = range ?? editBlk?.ranges[0] ?? null
    if (!anchor) return
    this.dismissCompose()

    // The block being edited; for a fresh selection, a detached one we only graft
    // into the doc once it has content (on autosave or emoji pick). The occurrence
    // index pins each quote piece to the instance the reader actually selected.
    const wb: Block = editBlk ?? { id: `b${this.blocks.length}`, quotes, nths, note: '', emojis: [], text: '', ranges: [range!.cloneRange()], imgs }

    const rect = anchor.getBoundingClientRect()
    const box = document.createElement('div')
    box.className = 'pen-compose'; box.setAttribute('data-pen-ui', '')
    box.innerHTML = `<div class="pen-note-editor" data-note-editor></div><div data-emojislot></div>`
    box.querySelector('[data-emojislot]')!.appendChild(this.buildEmojiPanel(() => wb.emojis, (e) => this.toggleComposeEmoji(e)))
    this.dockBox(box, rect, () => this.dismissCompose())
    this.compose = box
    this.composeBlock = wb
    this.composeNew = !editBlk
    if (range) { this.composeCtx = { range, quote, imgs }; this.renderHighlights() } // stand-in highlight

    let factory: MiniEditorFactory
    try { factory = await loadMiniEditor() } catch { return }
    if (this.compose !== box) return // dismissed while the editor bundle loaded
    const mount = box.querySelector('[data-note-editor]') as HTMLElement
    this.composeEditor = factory(mount, wb.text, {
      onChange: (md) => { wb.text = md; wb.note = this.composeNote(wb.emojis, md); this.graftCompose(); this.saveQuiet() },
      uploadImage: (f) => this.api.uploadImage(f),
      onSubmit: () => this.dismissCompose(), // ⌘/Ctrl+Enter saves the comment and closes
    })
    this.composeEditor.focus()
  }

  private editBlock(blk: Block) { void this.openCompose(null, blk) }

  // A range that selects a whole image element — gives us its rect for docking the
  // compose box and for hit-testing, even though it carries no highlightable text.
  private imageRange(img: HTMLImageElement): Range { const r = document.createRange(); r.selectNode(img); return r }

  // A compose block is worth keeping only if it has a reaction OR real comment text
  // (whitespace / blank lines / a lone reaction don't make a sidebar comment).
  private composeWorthKeeping(wb: Block): boolean {
    return wb.emojis.length > 0 || hasCommentText(wb.text)
  }
  // Splice a fresh-selection block into the doc once it has content, and pull it
  // back out if emptied — so autosave never persists a bare, comment-less quote.
  private graftCompose() {
    const wb = this.composeBlock
    if (!wb || !this.composeNew) return
    const has = this.blocks.includes(wb)
    const keep = this.composeWorthKeeping(wb)
    if (keep && !has) this.blocks.push(wb)
    else if (!keep && has) this.blocks = this.blocks.filter((b) => b !== wb)
  }

  // Adding the FIRST reaction is react-and-go: commit and close (the common case).
  // Adding a further reaction, or un-checking one, keeps the popup open (you're
  // still curating the set — rare, but it shouldn't vanish under you).
  private toggleComposeEmoji(emoji: string) {
    const wb = this.composeBlock
    if (!wb) return
    if (this.composeEditor) wb.text = this.composeEditor.getMarkdown()
    const i = wb.emojis.indexOf(emoji)
    if (i >= 0) { // uncheck → stay open
      wb.emojis.splice(i, 1)
      wb.note = this.composeNote(wb.emojis, wb.text)
      this.graftCompose(); this.layoutLeftRail(); this.saveQuiet()
    } else if (wb.emojis.length < MAX_EMOJI) {
      const first = wb.emojis.length === 0 // only the first reaction dismisses
      wb.emojis.push(emoji)
      wb.note = this.composeNote(wb.emojis, wb.text)
      if (first) this.finalizeCompose()
      else { this.graftCompose(); this.layoutLeftRail(); this.saveQuiet() }
    }
  }

  private promptSignIn(range: Range) {
    this.dismissCompose()
    const rect = range.getBoundingClientRect()
    const box = document.createElement('div')
    box.className = 'pen-compose'; box.setAttribute('data-pen-ui', '')
    box.innerHTML = `<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`
    box.querySelector('[data-act="signin"]')!.addEventListener('click', () => { this.dismissCompose(); this.flashLogin() })
    this.dockBox(box, rect, () => this.dismissCompose())
    this.compose = box
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
    // Tapping an emoji must NOT steal focus from the comment editor (that's what made
    // the open card feel like it closed). preventDefault on the buttons keeps focus;
    // the search input is excluded so it can still be focused/typed.
    bar.addEventListener('mousedown', (e) => e.preventDefault())
    grid.addEventListener('mousedown', (e) => e.preventDefault())
    // CRITICAL: renderBar() detaches the clicked button mid-click; without stopping
    // here the click bubbles to onDocClick with an orphaned target (no [data-pen-ui]
    // ancestor), which then unfocuses & rebuilds the card. Stop it at the panel.
    wrap.addEventListener('click', (e) => e.stopPropagation())
    const btn = (e: string, sel: string[]) => `<button class="${sel.includes(e) ? 'selected' : ''}" data-e="${esc(e)}">${esc(e)}</button>`
    const renderGrid = () => {
      const sel = getSel(); const ql = search.value.trim().toLowerCase()
      grid.innerHTML = EMOJI_DATA.filter(([e, kw]) => !ql || kw.includes(ql) || e === search.value).map(([e]) => btn(e, sel)).join('')
      grid.querySelectorAll('[data-e]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); tap((b as HTMLElement).dataset.e!) }))
    }
    const renderBar = () => {
      const sel = getSel()
      // Selected emoji always lead (and stay visible); fill the rest of the single
      // row with unselected quick picks. Cap at MAX_EMOJI buttons so it never wraps.
      const quick = QUICK_EMOJI.filter((e) => !sel.includes(e)).slice(0, Math.max(0, MAX_EMOJI - sel.length))
      bar.innerHTML = sel.map((e) => btn(e, sel)).join('') + quick.map((e) => btn(e, sel)).join('') +
        `<button class="pen-emoji-more" data-act="more" title="More emoji">＋</button>`
      bar.querySelectorAll('[data-e]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); tap((b as HTMLElement).dataset.e!) }))
      bar.querySelector('[data-act="more"]')!.addEventListener('click', (ev) => { ev.stopPropagation(); more.hidden = !more.hidden; if (!more.hidden) { renderGrid(); search.focus() } })
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
    ;(this.composeRoot ?? this.compose)?.remove()
    this.compose = undefined; this.composeRoot = undefined; this.composeCtx = undefined
  }

  // Commit the compose block if it's worth keeping (reaction or real comment text),
  // else drop it; then close the popup. Used by react-and-go, click-away, ⌘↵, Esc.
  private finalizeCompose() {
    if (!this.compose) return
    const wb = this.composeBlock
    if (wb && this.composeEditor) { wb.text = this.composeEditor.getMarkdown(); wb.note = this.composeNote(wb.emojis, wb.text) }
    if (wb) {
      const keep = this.composeWorthKeeping(wb)
      if (keep && !this.blocks.includes(wb)) this.blocks.push(wb)
      else if (!keep) this.blocks = this.blocks.filter((b) => b !== wb)
    }
    this.teardownCompose()
    window.getSelection()?.removeAllRanges()
    this.saveDoc()
  }
  private dismissCompose() {
    if (!this.compose) { this.renderHighlights(); return }
    this.finalizeCompose()
  }

  // ---- pointer handling ----------------------------------------------------

  private onDocMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    this.dismissCompose(); this.removeQuoteBtn()
  }
  private onDocClick(e: MouseEvent) {
    if (this.responsePanel) return // the response panel owns highlight clicks while open
    if ((e.target as HTMLElement).closest('[data-pen-ui]')) return
    if (window.getSelection()?.toString().trim()) return
    const img = (e.target as HTMLElement).closest('img') as HTMLImageElement | null
    for (const b of this.blocks) {
      // A click hits a block if it lands on its text OR on an image the block quotes.
      if (b.ranges.some((r) => this.hitsRange(e, r)) || (img && b.imgs.includes(img))) {
        // Has a comment → focus its card; emoji-only → compose box to add text/swap emoji.
        if (hasCommentText(b.text)) return this.focus(b.id)
        return this.editBlock(b)
      }
    }
    // A click on an un-annotated image starts an image comment (highlights-on only).
    if (img && this.highlightsOn && this.root.contains(img) && !img.closest('[data-pen-ui]')) {
      void this.openCompose(this.imageRange(img), undefined, img)
      return
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
    syncImageOverlays(this.layer, []) // drop our on-page image boxes; the panel draws its own
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
      const showSent = (email: string) => {
        el.innerHTML = `<div class="pen-sent">
          <div class="pen-sent-icon">✉️</div>
          <div class="pen-sent-title">Check your email</div>
          <div class="pen-sent-msg">We sent a sign-in link to <span class="pen-name">${esc(email)}</span>. Open it to finish signing in.</div>
          <button class="pen-btn ghost" data-act="ok">OK</button>
        </div>`
        el.querySelector('[data-act="ok"]')!.addEventListener('click', () => this.renderLogin())
      }
      const submit = async () => {
        const input = el.querySelector('input') as HTMLInputElement
        const email = input.value.trim(); if (!email) return
        const res = await this.api.emailLogin(email)
        if (res.link) location.href = res.link
        else showSent(email)
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

// A readable label for a source URL: its last path segment, de-slugified.
const sourceLabel = (src: string): string => {
  try {
    const seg = new URL(src).pathname.replace(/\/$/, '').split('/').pop() ?? ''
    return decodeURIComponent(seg).replace(/[-_]/g, ' ').trim() || 'the page'
  } catch { return 'the page' }
}
