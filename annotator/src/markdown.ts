// Minimal, dependency-free markdown → HTML for the response preview and the
// author's review view. Covers the common cases (headings, bold/italic/code,
// links, images, blockquotes, lists, hr, code fences). Not CommonMark-complete.

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Pull blockquote passages from markdown (consecutive '>' lines = one quote).
export function extractBlockquotes(md: string): string[] {
  const out: string[] = []
  let cur: string[] = []
  for (const ln of (md ?? '').split('\n')) {
    if (/^\s*>/.test(ln)) cur.push(ln.replace(/^\s*>\s?/, ''))
    else if (cur.length) { out.push(cur.join(' ').trim()); cur = [] }
  }
  if (cur.length) out.push(cur.join(' ').trim())
  return out.filter((t) => t.length >= 6)
}

// A response block: a quote (one or more '>' lines) and the note it owns.
export type RBlock = { quotes: string[]; note: string }

const isQ = (l: string | undefined) => /^\s*>/.test(l ?? '')

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
    const q: string[] = []
    while (i < lines.length && isQ(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++ }
    const note: string[] = []
    while (i < lines.length && !isQ(lines[i])) { note.push(lines[i]); i++ }
    // Drop the leading gap blank(s) after the quote, then exactly ONE structural
    // trailing blank (the inter-block separator / file-final newline). Any trailing
    // blank lines beyond that are the reader's own — kept so editors round-trip them.
    while (note.length && note[0].trim() === '') note.shift()
    if (note.length && note[note.length - 1].trim() === '') note.pop()
    blocks.push({ quotes: [q.join(' ').trim()], note: note.join('\n') })
  }
  return { preamble: preamble.join('\n').trim(), blocks }
}

// Round-trip the structure back to markdown. A note keeps its own trailing blank
// lines (so the editor can restore them); only leading whitespace is dropped.
export function serializeResponse(preamble: string, blocks: RBlock[]): string {
  const parts: string[] = []
  if (preamble.trim()) parts.push(preamble.trim())
  for (const b of blocks) {
    const note = b.note.replace(/^\n+/, '')
    if (!b.quotes.join('').trim() && !note.trim()) continue
    const qs = b.quotes.map((q) => `> ${q.replace(/\n/g, ' ')}`).join('\n>\n')
    parts.push(note ? `${qs}\n\n${note}` : qs)
  }
  return parts.join('\n\n') + '\n'
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
    if (/^\s*$/.test(line)) { i++; continue }
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
    // paragraph: gather until blank line
    const buf: string[] = []
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(lines[i]))
      buf.push(lines[i++])
    out.push(`<p>${inline(buf.join(' '))}</p>`)
  }
  return out.join('\n')
}
