// Text anchoring for the W3C Web Annotation model — no dependencies.
// We never mutate the document; we map between a flat string of the root's
// visible text and DOM (node, offset) positions, and resolve highlights as
// live Ranges rendered through the CSS Custom Highlight API.

export type TextQuoteSelector = { type: 'TextQuoteSelector'; exact: string; prefix?: string; suffix?: string }
export type TextPositionSelector = { type: 'TextPositionSelector'; start: number; end: number }
export type Selector = TextQuoteSelector | TextPositionSelector

const CONTEXT_LEN = 32

type Index = { text: string; nodes: { node: Text; start: number; end: number }[] }

function buildIndex(root: Node): Index {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      // Skip text inside Penumbra's own injected UI.
      const el = (n as Text).parentElement
      if (el && el.closest('[data-pen-ui]')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const nodes: Index['nodes'] = []
  let text = ''
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    const start = text.length
    text += t.data
    nodes.push({ node: t, start, end: text.length })
  }
  return { text, nodes }
}

function offsetToPoint(idx: Index, offset: number): { node: Text; offset: number } | null {
  for (const e of idx.nodes) {
    if (offset >= e.start && offset <= e.end) return { node: e.node, offset: offset - e.start }
  }
  const last = idx.nodes[idx.nodes.length - 1]
  return last ? { node: last.node, offset: last.node.data.length } : null
}

function nodeOffsetToFlat(idx: Index, node: Node, offset: number): number | null {
  // Find the flat offset for a (node, offset) DOM position.
  if (node.nodeType === Node.TEXT_NODE) {
    const e = idx.nodes.find((x) => x.node === node)
    return e ? e.start + offset : null
  }
  // Element position: map to the flat start of the offset-th child's first text.
  const child = node.childNodes[offset] ?? node.childNodes[node.childNodes.length - 1]
  if (!child) return null
  const e = idx.nodes.find((x) => x.node === child || child.contains(x.node))
  return e ? e.start : null
}

// Build the selector pair for a user's live selection Range.
export function selectorsFromRange(range: Range, root: Node): Selector[] | null {
  const idx = buildIndex(root)
  const start = nodeOffsetToFlat(idx, range.startContainer, range.startOffset)
  const end = nodeOffsetToFlat(idx, range.endContainer, range.endOffset)
  if (start == null || end == null || end <= start) return null
  const exact = idx.text.slice(start, end)
  const prefix = idx.text.slice(Math.max(0, start - CONTEXT_LEN), start)
  const suffix = idx.text.slice(end, end + CONTEXT_LEN)
  return [
    { type: 'TextQuoteSelector', exact, prefix, suffix },
    { type: 'TextPositionSelector', start, end },
  ]
}

// Resolve selectors back to a live Range against the current DOM.
// Prefers the quote selector (survives edits elsewhere); falls back to position.
export function rangeFromSelectors(selectors: Selector[], root: Node): Range | null {
  const idx = buildIndex(root)
  const quote = selectors.find((s) => s.type === 'TextQuoteSelector') as TextQuoteSelector | undefined
  const pos = selectors.find((s) => s.type === 'TextPositionSelector') as TextPositionSelector | undefined

  let start = -1
  let end = -1

  if (quote && quote.exact) {
    const hit = bestQuoteMatch(idx.text, quote)
    if (hit >= 0) {
      start = hit
      end = hit + quote.exact.length
    }
  }
  if (start < 0 && pos && idx.text.slice(pos.start, pos.end)) {
    start = pos.start
    end = pos.end
  }
  if (start < 0) return null // orphaned — the anchored text no longer exists

  const a = offsetToPoint(idx, start)
  const b = offsetToPoint(idx, end)
  if (!a || !b) return null
  const range = document.createRange()
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)
  return range
}

// Strict quote resolver: matches ONLY the exact quoted text (no position
// fallback). Returns null when the exact text is gone — i.e. the source was
// edited where this quote points, which is exactly our "stale/touched" signal.
export function resolveQuoteStrict(selectors: Selector[], root: Node): Range | null {
  const quote = selectors.find((s) => s.type === 'TextQuoteSelector') as TextQuoteSelector | undefined
  if (!quote?.exact) return null
  const idx = buildIndex(root)
  const start = bestQuoteMatch(idx.text, quote)
  if (start < 0) return null
  const a = offsetToPoint(idx, start)
  const b = offsetToPoint(idx, start + quote.exact.length)
  if (!a || !b) return null
  const range = document.createRange()
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)
  return range
}

// Best-effort: does this exact string occur in the source? Used for paste-match
// (auto-anchoring pasted quotes) — returns selectors if found, else null.
export function locateText(text: string, root: Node): Selector[] | null {
  const trimmed = text.trim()
  if (trimmed.length < 8) return null // too short to anchor reliably
  const idx = buildIndex(root)
  const at = idx.text.indexOf(trimmed)
  if (at < 0) return null
  return [
    {
      type: 'TextQuoteSelector',
      exact: trimmed,
      prefix: idx.text.slice(Math.max(0, at - CONTEXT_LEN), at),
      suffix: idx.text.slice(at + trimmed.length, at + trimmed.length + CONTEXT_LEN),
    },
    { type: 'TextPositionSelector', start: at, end: at + trimmed.length },
  ]
}

// When `exact` appears more than once, pick the occurrence whose surrounding
// text best matches the recorded prefix/suffix.
function bestQuoteMatch(text: string, q: TextQuoteSelector): number {
  const positions: number[] = []
  let i = text.indexOf(q.exact)
  while (i >= 0) {
    positions.push(i)
    i = text.indexOf(q.exact, i + 1)
  }
  if (positions.length === 0) return -1
  if (positions.length === 1) return positions[0]

  let best = positions[0]
  let bestScore = -1
  for (const p of positions) {
    let score = 0
    if (q.prefix) {
      const before = text.slice(Math.max(0, p - q.prefix.length), p)
      score += commonSuffix(before, q.prefix)
    }
    if (q.suffix) {
      const after = text.slice(p + q.exact.length, p + q.exact.length + q.suffix.length)
      score += commonPrefix(after, q.suffix)
    }
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

const commonPrefix = (a: string, b: string) => {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}
const commonSuffix = (a: string, b: string) => {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}
