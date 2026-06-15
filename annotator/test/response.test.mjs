// Tests for the response-editor logic: staleness, paste-match, markdown.
import { JSDOM } from 'jsdom'
import esbuild from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'

async function bundle(entry, out) {
  const r = await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', write: false, target: 'es2021' })
  mkdirSync('test/.tmp', { recursive: true })
  writeFileSync(out, r.outputFiles[0].text)
}
await bundle('src/anchor.ts', 'test/.tmp/anchor.mjs')
await bundle('src/markdown.ts', 'test/.tmp/markdown.mjs')

let pass = 0, fail = 0
const ok = (n, c) => { c ? pass++ : (fail++, console.error('  ✗ ' + n)); if (c) console.log('  ✓ ' + n) }

// ---- markdown (no DOM) ----
const { renderMarkdown, parseResponse, serializeResponse, isEmojiNote, splitLeadingEmojis, hasCommentText } = await import('./.tmp/markdown.mjs')

// hasCommentText: only real, non-space, non-emoji, non-sentinel characters count
{
  ok('text: real words count', hasCommentText('hello') === true)
  ok('text: spaces only do not count', hasCommentText('   ') === false)
  ok('text: blank lines do not count', hasCommentText('\n\n') === false)
  ok('text: zero-width sentinel does not count', hasCommentText('​\n​') === false)
  ok('text: emoji only does not count', hasCommentText('🔥👍') === false)
  ok('text: emoji + word counts', hasCommentText('🔥 nice') === true)
  ok('text: empty is false', hasCommentText('') === false)
}

// leading-emoji split (emoji reactions + comment in one note)
{
  const a = splitLeadingEmojis('👍🔥 Good point')
  ok('split: leading emojis extracted', a.emojis.length === 2 && a.emojis[0] === '👍')
  ok('split: text after emojis', a.text === 'Good point')
  const b = splitLeadingEmojis('Just text')
  ok('split: no leading emoji', b.emojis.length === 0 && b.text === 'Just text')
  const c = splitLeadingEmojis('🔥')
  ok('split: emoji only → no text', c.emojis.length === 1 && c.text === '')
}

// response doc <-> blocks
{
  const doc = `> What's causing the big crunch?\n\nGood question!\n\n> Why are people alive?\n\n🔥`
  const { preamble, blocks } = parseResponse(doc)
  ok('parse: two blocks', blocks.length === 2)
  ok('parse: quote + owned note', blocks[0].quotes[0] === "What's causing the big crunch?" && blocks[0].note === 'Good question!')
  ok('parse: emoji note', isEmojiNote(blocks[1].note) === true)
  ok('parse: text note is not emoji', isEmojiNote(blocks[0].note) === false)
  ok('emoji: multi-emoji is emoji', isEmojiNote('👍🔥') === true)
  ok('emoji: emoji with variation selector', isEmojiNote('☺️') === true)
  ok('emoji: emoji + text is NOT emoji', isEmojiNote('☺️ jhvkhj') === false)
  ok('emoji: lone punctuation is NOT emoji', isEmojiNote('?') === false)
  ok('emoji: single letter is NOT emoji', isEmojiNote('k') === false)
  // back-to-back quotes stay SEPARATE blocks (each its own comment)
  const adj = parseResponse(`> quote one here\n\n> quote two here\n\nsecond note`)
  ok('parse: back-to-back quotes are separate', adj.blocks.length === 2)
  ok('parse: first stays a bare quote', adj.blocks[0].note === '')
  ok('parse: second owns its note', adj.blocks[1].note === 'second note')
  // round-trip
  const back = serializeResponse(preamble, blocks)
  const re = parseResponse(back)
  ok('round-trip preserves blocks', re.blocks.length === 2 && re.blocks[0].note === 'Good question!')
  // editing a note then serializing
  blocks[0].note = 'Edited note.'
  ok('serialize reflects edited note', serializeResponse(preamble, blocks).includes('Edited note.'))
}

// Comments never keep trailing blanks; an extra blank line precedes quotes 2..n;
// middle blank-line sentinels are still preserved; renders ignore all blanks.
{
  const Z = '​'
  ok('trailing blanks stripped from note', parseResponse(`> quote one here\n\nGood point\n\n`).blocks[0].note === 'Good point')
  ok('trailing sentinel stripped too', parseResponse(`> quote one here\n\nGood point\n\n${Z}`).blocks[0].note === 'Good point')

  const body = serializeResponse('', [
    { quotes: ['First quote here'], nths: [1], note: 'note one' },
    { quotes: ['Second quote here'], nths: [1], note: 'note two' },
  ])
  ok('extra blank line before quote 2', body.includes('note one\n\n\n> Second quote here'))
  ok('no extra blank before quote 1', body.startsWith('> First quote here'))
  const re = parseResponse(body)
  ok('doc-blank round-trip is idempotent', serializeResponse(re.preamble, re.blocks) === body)

  const mid = parseResponse(serializeResponse('', [{ quotes: ['The quoted passage'], nths: [1], note: `a\n\n${Z}\n\nb` }])).blocks[0].note
  ok('middle blank sentinel preserved', mid === `a\n\n${Z}\n\nb`)
  const html = renderMarkdown(`line one\n\n${Z}\n\nline two\n\n`)
  ok('render strips sentinel + blanks', !html.includes(Z) && !/<p>\s*<\/p>/.test(html))
  ok('render keeps the real paragraphs', html.includes('<p>line one</p>') && html.includes('<p>line two</p>'))
}

ok('md heading', renderMarkdown('# Hi').includes('<h1>Hi</h1>'))
ok('md bold', renderMarkdown('a **b** c').includes('<strong>b</strong>'))
ok('md blockquote', renderMarkdown('> quote').includes('<blockquote>'))
ok('md list', renderMarkdown('- a\n- b').includes('<ul><li>a</li><li>b</li></ul>'))
ok('md link', renderMarkdown('[x](http://y)').includes('href="http://y"'))
ok('md escapes raw html', !renderMarkdown('<script>alert(1)</script>').includes('<script>'))

// ---- anchoring / staleness ----
const mk = (html) => { const d = new JSDOM(html); globalThis.document = d.window.document; globalThis.Node = d.window.Node; globalThis.NodeFilter = d.window.NodeFilter; return d.window.document.querySelector('article') }
const root1 = mk(`<article><p>The big crunch is about time and acceleration in modern society.</p></article>`)
const { selectorsFromRange, resolveQuoteStrict, locateText } = await import('./.tmp/anchor.mjs')

function rangeOver(root, needle) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n
  while ((n = w.nextNode())) { const i = n.data.indexOf(needle); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length); return r } }
  throw new Error('needle not found')
}

const sel = selectorsFromRange(rangeOver(root1, 'big crunch'), root1)
ok('quote resolves when text present', !!resolveQuoteStrict(sel, root1))

// author edits that exact text away → the quote should read as gone (stale)
const root2 = mk(`<article><p>The grand collapse is about time and acceleration in modern society.</p></article>`)
ok('quote goes stale when its source text is edited', resolveQuoteStrict(sel, root2) === null)

// paste-match (auto-anchoring) against the current doc
ok('paste-match finds a known passage', !!locateText('acceleration in modern society', root2))
ok('paste-match misses an unknown passage', locateText('nowhere to be found at all', root2) === null)
ok('paste-match ignores too-short snippets', locateText('time', root2) === null)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
