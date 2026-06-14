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
