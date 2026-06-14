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
    blocks.push({ quotes: [q.join(' ').trim()], note: note.join('\n').trim() })
  }
  return { preamble: preamble.join('\n').trim(), blocks }
}

// Round-trip the structure back to markdown.
export function serializeResponse(preamble: string, blocks: RBlock[]): string {
  const parts: string[] = []
  if (preamble.trim()) parts.push(preamble.trim())
  for (const b of blocks) {
    if (!b.quotes.length && !b.note.trim()) continue
    const qs = b.quotes.map((q) => `> ${q.replace(/\n/g, ' ')}`).join('\n>\n')
    parts.push(b.note.trim() ? `${qs}\n\n${b.note.trim()}` : qs)
  }
  return parts.join('\n\n') + '\n'
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
