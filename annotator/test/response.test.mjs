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
const { renderMarkdown, parseResponse, serializeResponse, isEmojiNote } = await import('./.tmp/markdown.mjs')

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
  // adjacent quotes (blank-separated, no prose between) group into one block
  const adj = parseResponse(`> quote one here\n\n> quote two here\n\nshared note`)
  ok('parse: adjacent quotes grouped', adj.blocks.length === 1 && adj.blocks[0].quotes.length === 2)
  ok('parse: grouped note is shared', adj.blocks[0].note === 'shared note')
  // round-trip
  const back = serializeResponse(preamble, blocks)
  const re = parseResponse(back)
  ok('round-trip preserves blocks', re.blocks.length === 2 && re.blocks[0].note === 'Good question!')
  // editing a note then serializing
  blocks[0].note = 'Edited note.'
  ok('serialize reflects edited note', serializeResponse(preamble, blocks).includes('Edited note.'))
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
