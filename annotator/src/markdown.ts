// Minimal, dependency-free markdown → HTML for the response preview and the
// author's review view. Covers the common cases (headings, bold/italic/code,
// links, images, blockquotes, lists, hr, code fences). Not CommonMark-complete.

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// A quote line carries an optional occurrence index so repeated text pins the
// right instance: `>2 text` (occurrence 2 — NO space after >) vs `> text` (the
// first/only occurrence — note the space). The number is hidden in every render.
export function parseQuoteMarker(line: string): { nth: number; text: string } {
  const m = /^\s*>(\d+)\s(.*)$/.exec(line)
  if (m) return { nth: Number(m[1]), text: m[2] }
  return { nth: 1, text: (line ?? '').replace(/^\s*>\s?/, '') }
}
export function formatQuoteMarker(nth: number, text: string): string {
  return nth > 1 ? `>${nth} ${text}` : `> ${text}`
}

// Pull quote passages (text + occurrence) from markdown; consecutive '>' lines =
// one quote, with the occurrence read from its first line.
export function extractQuotes(md: string): { text: string; nth: number }[] {
  const out: { text: string; nth: number }[] = []
  let cur: string[] = []
  let nth = 1
  const flush = () => { const t = cur.join(' ').trim(); if (t.length >= 6) out.push({ text: t, nth }); cur = []; nth = 1 }
  for (const ln of (md ?? '').split('\n')) {
    if (/^\s*>/.test(ln)) {
      if (!cur.length) { const pm = parseQuoteMarker(ln); nth = pm.nth; cur.push(pm.text) }
      else cur.push(ln.replace(/^\s*>\s?/, ''))
    } else if (cur.length) flush()
  }
  if (cur.length) flush()
  return out
}
export function extractBlockquotes(md: string): string[] {
  return extractQuotes(md).map((q) => q.text)
}

// A response block: a quote (one or more '>' lines, with its occurrence index)
// and the note it owns.
export type RBlock = { quotes: string[]; nths: number[]; note: string }

const isQ = (l: string | undefined) => /^\s*>/.test(l ?? '')
// A quote line that is itself a markdown image embed: `![](src)`.
const isImageLine = (t: string) => /^!\[[^\]]*\]\([^)\s]+\)$/.test(t.trim())

// Parse a response doc into a leading preamble + a sequence of quote-blocks.
// Each quote is its own block and owns the prose below it until the next quote
// (so two back-to-back quotes stay two separate comments, not one).
export function parseResponse(md: string): { preamble: string; blocks: RBlock[] } {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n')
  let i = 0
  const preamble: string[] = []
  while (i < lines.length && !isQ(lines[i])) { preamble.push(lines[i]); i++ }

  const blocks: RBlock[] = []
  while (i < lines.length) {
    const qlines: { text: string; nth: number }[] = []
    while (i < lines.length && isQ(lines[i])) {
      const pm = parseQuoteMarker(lines[i])
      if (pm.text.trim()) qlines.push({ text: pm.text.trim(), nth: pm.nth })
      i++
    }
    const note: string[] = []
    while (i < lines.length && !isQ(lines[i])) { note.push(lines[i]); i++ }
    // Drop the leading gap blank(s) after the quote and ALL trailing blank lines
    // (incl. the zero-width sentinel) — comments never keep trailing blanks now.
    while (note.length && note[0].trim() === '') note.shift()
    while (note.length && note[note.length - 1].replace(/​/g, '').trim() === '') note.pop()
    // A blockquote with an image becomes ordered pieces (text runs + `![](src)`),
    // so the image keeps its place. A pure-text blockquote stays one quote (the
    // long-standing behavior — joined into a single passage).
    let quotes: string[] = []
    let nths: number[] = []
    if (qlines.length) {
      if (qlines.some((l) => isImageLine(l.text))) { quotes = qlines.map((l) => l.text); nths = qlines.map((l) => l.nth) }
      else { quotes = [qlines.map((l) => l.text).join(' ')]; nths = [qlines[0].nth] }
    }
    blocks.push({ quotes, nths, note: note.join('\n') })
  }
  return { preamble: preamble.join('\n').trim(), blocks }
}

// Round-trip the structure back to markdown. Notes carry no trailing blanks, and
// there's an extra blank line before every quote but the first (more readable).
export function serializeResponse(preamble: string, blocks: RBlock[]): string {
  const blockStrs: string[] = []
  for (const b of blocks) {
    const note = b.note.replace(/^\n+/, '').replace(/[\s​]+$/, '') // drop leading + trailing blanks
    if (!b.quotes.join('').trim() && !note.trim()) continue
    // One '>' line per quote piece (consecutive lines = one block); drop empty pieces.
    const qs = b.quotes
      .map((q, k) => ({ q: (q ?? '').replace(/\n/g, ' '), n: b.nths?.[k] ?? 1 }))
      .filter((e) => e.q.trim())
      .map((e) => formatQuoteMarker(e.n, e.q))
      .join('\n')
    blockStrs.push(note ? `${qs}\n\n${note}` : qs)
  }
  const blockBody = blockStrs.join('\n\n\n') // '\n\n\n' = one extra blank line before quotes 2..n
  const pre = preamble.trim()
  const body = pre && blockBody ? `${pre}\n\n${blockBody}` : pre || blockBody
  return body + '\n'
}

// Split a note into its LEADING emoji(s) (reactions → left chips) and the
// remaining text (the comment → right card). "👍🔥 Good point" → ['👍','🔥'] + "Good point".
export function splitLeadingEmojis(note: string): { emojis: string[]; text: string } {
  const t = note ?? ''
  const emojis: string[] = []
  let idx = 0
  const Seg = (Intl as any).Segmenter
  if (typeof Seg === 'function') {
    for (const { segment } of new Seg('en', { granularity: 'grapheme' }).segment(t)) {
      if (/^\s+$/.test(segment)) { idx += segment.length; continue }
      if (/\p{Extended_Pictographic}/u.test(segment)) { emojis.push(segment); idx += segment.length; continue }
      break
    }
  } else {
    const m = /^((?:\p{Extended_Pictographic}(?:[️‍\u{1F3FB}-\u{1F3FF}]|\p{Extended_Pictographic})*|\s)+)/u.exec(t)
    if (m) { idx = m[0].length; for (const ch of [...m[0]]) if (/\p{Extended_Pictographic}/u.test(ch)) emojis.push(ch) }
  }
  return { emojis, text: t.slice(idx) }
}

// True only if `text` holds real comment content — at least one character that
// isn't whitespace, the zero-width blank-line sentinel, or an emoji. (So a blank
// editor, or one with only reactions, never spawns a sidebar comment card.)
export function hasCommentText(text: string): boolean {
  const t = (text ?? '').replace(/​/g, '')
  const Seg = (Intl as any).Segmenter
  if (typeof Seg === 'function') {
    for (const { segment } of new Seg('en', { granularity: 'grapheme' }).segment(t)) {
      if (/^\s+$/.test(segment)) continue
      if (/\p{Extended_Pictographic}/u.test(segment)) continue
      return true
    }
    return false
  }
  return /\S/.test(t.replace(/\p{Extended_Pictographic}/gu, ''))
}

// A note that's ONLY emoji (one or more) renders as a left-rail chip, not a card.
export function isEmojiNote(note: string): boolean {
  const t = note.trim()
  if (!t) return false
  // strip emoji, flag/skin-tone/ZWJ/variation selectors and whitespace; emoji-only
  // means nothing is left and there was at least one pictographic.
  const stripped = t.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍\s]/gu, '')
  return stripped === '' && /\p{Extended_Pictographic}/u.test(t)
}

function inline(s: string): string {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

export function renderMarkdown(md: string): string {
  const lines = (md ?? '').replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (/^```/.test(line)) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++ // closing fence
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }
    if (/^[\s​]*$/.test(line)) { i++; continue } // blank, incl. the zero-width blank-line sentinel
    if (/^#{1,6}\s/.test(line)) {
      const m = /^(#{1,6})\s+(.*)$/.exec(line)!
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)
      i++; continue
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue }
    if (/^\s*>/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''))
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`)
      continue
    }
    if (/^\s*[-*+]\s/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*[-*+]\s+/, ''))}</li>`)
      out.push(`<ul>${buf.join('')}</ul>`)
      continue
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`)
      out.push(`<ol>${buf.join('')}</ol>`)
      continue
    }
    // paragraph: gather until blank line (the zero-width sentinel counts as blank)
    const buf: string[] = []
    while (i < lines.length && !/^[\s​]*$/.test(lines[i]) && !/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i]))
      buf.push(lines[i++])
    const content = inline(buf.join(' '))
    // an image on its own line renders as a bare block <img> (no <p> line-box/margin under it)
    out.push(/^<img\b[^>]*>$/.test(content) ? content : `<p>${content}</p>`)
  }
  return out.join('\n')
}
