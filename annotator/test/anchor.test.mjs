// Round-trip test for the anchoring logic under jsdom.
import { JSDOM } from 'jsdom'
import esbuild from 'esbuild'
import { writeFileSync, mkdirSync } from 'node:fs'

// Bundle anchor.ts to a temp ESM module we can import.
const out = await esbuild.build({
  entryPoints: ['src/anchor.ts'],
  bundle: true, format: 'esm', write: false, target: 'es2021',
})
mkdirSync('test/.tmp', { recursive: true })
writeFileSync('test/.tmp/anchor.mjs', out.outputFiles[0].text)

const dom = new JSDOM(`<!doctype html><article>
  <p>What's causing the "big crunch" in modern society? The big crunch is real.</p>
  <p>Acceleration, alienation, resonance — the vocabulary of malaise.</p>
</article>`)
globalThis.document = dom.window.document
globalThis.Node = dom.window.Node
globalThis.NodeFilter = dom.window.NodeFilter

const { selectorsFromRange, rangeFromSelectors, imageSrcOf, imageBasename, resolveImageQuote, imageOccurrence, imagesInRange, quotePiecesFromRange } =
  await import('./.tmp/anchor.mjs')
const root = document.querySelector('article')

let pass = 0, fail = 0
const ok = (name, cond) => { cond ? pass++ : (fail++, console.error('  ✗ ' + name)); if (cond) console.log('  ✓ ' + name) }

// Helper: make a range over the Nth occurrence of `needle` in a given text node.
function rangeOver(text, needle, occurrence = 0) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    if (n.data.includes(needle)) {
      let from = -1
      for (let k = 0; k <= occurrence; k++) from = n.data.indexOf(needle, from + 1)
      const r = document.createRange()
      r.setStart(n, from); r.setEnd(n, from + needle.length)
      return r
    }
  }
  throw new Error('needle not found: ' + needle)
}

// 1. Basic round trip.
{
  const r = rangeOver('', 'modern society')
  const sels = selectorsFromRange(r, root)
  const back = rangeFromSelectors(sels, root)
  ok('round-trips "modern society"', back && back.toString() === 'modern society')
}

// 2. Duplicate phrase — must resolve to the FIRST "big crunch" we selected, not the second.
{
  const r = rangeOver('', 'big crunch', 0)
  const sels = selectorsFromRange(r, root)
  const back = rangeFromSelectors(sels, root)
  const quote = sels.find((s) => s.type === 'TextQuoteSelector')
  ok('duplicate phrase keeps prefix/suffix context', quote.prefix.includes('"') && quote.suffix.includes('"'))
  ok('duplicate phrase resolves to correct occurrence',
     back && back.toString() === 'big crunch' && back.startContainer.data.indexOf('big crunch') === back.startOffset)
}

// 3. Orphaned anchor — text that no longer exists returns null.
{
  const fake = [{ type: 'TextQuoteSelector', exact: 'nonexistent words', prefix: '', suffix: '' }]
  ok('missing anchor returns null (orphaned)', rangeFromSelectors(fake, root) === null)
}

// 4. Position-selector fallback when quote text changed but offsets still valid.
{
  const r = rangeOver('', 'Acceleration')
  const sels = selectorsFromRange(r, root)
  const quoteBroken = sels.map((s) => s.type === 'TextQuoteSelector' ? { ...s, exact: 'ZZZ not here' } : s)
  const back = rangeFromSelectors(quoteBroken, root)
  ok('falls back to TextPositionSelector', back && back.toString() === 'Acceleration')
}

// ---- image anchoring -------------------------------------------------------
// Build a doc with two paragraphs, an image between them, and a second copy of
// that same image later on (to exercise the occurrence index).
{
  const idom = new JSDOM(`<!doctype html><article id="img-root">
    <p>Before the picture.</p>
    <p><img src="../attachments/pasted-image-20260621152514.png"></p>
    <p>Between the pictures.</p>
    <p><img src="/deep/path/pasted-image-20260621152514.png?v=2"></p>
    <p>After the pictures.</p>
    <p><img src="other.png"></p>
  </article>`)
  globalThis.document = idom.window.document
  globalThis.Node = idom.window.Node
  globalThis.NodeFilter = idom.window.NodeFilter
  globalThis.Range = idom.window.Range
  const iroot = idom.window.document.querySelector('article')

  ok('imageSrcOf detects an embed', imageSrcOf('![](foo/bar.png)') === 'foo/bar.png')
  ok('imageSrcOf rejects plain text', imageSrcOf('just some words') === null)
  ok('basename strips path/query and decodes',
     imageBasename('../attachments/Pasted%20image%2020260621152514.png') === 'pasted image 20260621152514.png')

  // The two pasted-image-20260621152514.png copies share a basename; resolve by occurrence.
  const q = '![](pasted-image-20260621152514.png)'
  const first = resolveImageQuote(q, 1, iroot)
  const second = resolveImageQuote(q, 2, iroot)
  ok('resolves the 1st occurrence by basename', first === iroot.querySelectorAll('img')[0])
  ok('resolves the 2nd occurrence by basename', second === iroot.querySelectorAll('img')[1])
  ok('overshooting nth falls back to last match', resolveImageQuote(q, 9, iroot) === second)
  ok('unknown image resolves to null', resolveImageQuote('![](nope.png)', 1, iroot) === null)
  ok('imageOccurrence numbers the 2nd copy', imageOccurrence(iroot.querySelectorAll('img')[1], iroot) === 2)

  // A range spanning "Before…" through "Between…" contains the first image only.
  const r = idom.window.document.createRange()
  r.setStart(iroot.querySelector('p').firstChild, 0)
  r.setEnd(iroot.querySelectorAll('p')[2].firstChild, 5)
  const caught = imagesInRange(r, iroot)
  ok('imagesInRange catches the image inside a text passage',
     caught.length === 1 && caught[0] === iroot.querySelectorAll('img')[0])

  // A passage spanning text → image → text decomposes into three ordered pieces.
  const r3 = idom.window.document.createRange()
  const ps = iroot.querySelectorAll('p')
  r3.setStart(ps[0].firstChild, 0)
  r3.setEnd(ps[2].firstChild, 'Between the pictures.'.length)
  const pieces = quotePiecesFromRange(r3, iroot)
  ok('decomposes passage into text/image/text in order',
     pieces && pieces.quotes.length === 3 &&
     pieces.quotes[0] === 'Before the picture.' &&
     imageSrcOf(pieces.quotes[1]) !== null &&
     pieces.quotes[2] === 'Between the pictures.')

  // A selection that ENDS on an image-only <p> (element boundary, no text node)
  // must still resolve — this is the "no comment popup" bug.
  const rEnd = idom.window.document.createRange()
  rEnd.setStart(ps[0].firstChild, 0)
  rEnd.setEnd(ps[1], 1) // after the <img> inside the image-only paragraph
  const endPieces = quotePiecesFromRange(rEnd, iroot)
  ok('selection ending on an image still yields pieces (popup fix)',
     endPieces && endPieces.quotes[0] === 'Before the picture.' &&
     endPieces.quotes.some((q) => imageSrcOf(q) !== null))

  // A plain text passage (no image) is a single piece, like the old path.
  const r4 = idom.window.document.createRange()
  r4.setStart(ps[2].firstChild, 0)
  r4.setEnd(ps[2].firstChild, 'Between the pictures.'.length)
  const plain = quotePiecesFromRange(r4, iroot)
  ok('plain passage stays a single text piece',
     plain && plain.quotes.length === 1 && plain.quotes[0] === 'Between the pictures.')

  // restore the text-test globals for any later additions
  globalThis.document = dom.window.document
  globalThis.Node = dom.window.Node
  globalThis.NodeFilter = dom.window.NodeFilter
}

// ---- markdown round-trip (response doc) ------------------------------------
{
  const mout = await esbuild.build({
    entryPoints: ['src/markdown.ts'], bundle: true, format: 'esm', write: false, target: 'es2021',
  })
  writeFileSync('test/.tmp/markdown.mjs', mout.outputFiles[0].text)
  const { parseResponse, serializeResponse, splitQuotePieces } = await import('./.tmp/markdown.mjs')

  // splitQuotePieces: inline image splits a text run into ordered pieces.
  ok('splitQuotePieces splits inline image into text/image/text',
     JSON.stringify(splitQuotePieces('Before. ![](a/img.png) After.')) ===
     JSON.stringify(['Before.', '![](a/img.png)', 'After.']))
  ok('splitQuotePieces leaves pure text as one piece',
     JSON.stringify(splitQuotePieces('just text here')) === JSON.stringify(['just text here']))

  // A composite block: text → image → text, plus a note. Serializes to ONE inline
  // '>' line (so the editor flows the image inline) and round-trips to 3 pieces.
  const block = { quotes: ['Before the picture.', '![](a/img.png)', 'Between the pictures.'], nths: [1, 1, 1], note: 'A comment.' }
  const md = serializeResponse('', [block])
  ok('serializes a composite quote as one inline > line',
     md.includes('> Before the picture. ![](a/img.png) Between the pictures.'))
  const { blocks } = parseResponse(md)
  ok('round-trips a 3-piece composite block (inline)',
     blocks.length === 1 && blocks[0].quotes.length === 3 &&
     blocks[0].quotes[0] === 'Before the picture.' &&
     blocks[0].quotes[1] === '![](a/img.png)' &&
     blocks[0].quotes[2] === 'Between the pictures.' &&
     blocks[0].note.trim() === 'A comment.')

  // Editor-mangled data (blank '>' lines, trailing '\', zero-width sentinel) still
  // parses to clean pieces.
  const mangled = parseResponse('> textA\n>\n> ![](src.png)\\\n> textC\n\nnote\n')
  ok('tolerates editor-mangled composite quotes',
     mangled.blocks[0].quotes.length === 3 &&
     mangled.blocks[0].quotes[0] === 'textA' &&
     mangled.blocks[0].quotes[1] === '![](src.png)' &&
     mangled.blocks[0].quotes[2] === 'textC')

  // An OLD own-line composite (image on its own '>' line) also parses to pieces.
  const ownLine = parseResponse('> textA\n> ![](src.png)\n> textC\n\nnote\n')
  ok('own-line composite parses into pieces too',
     ownLine.blocks[0].quotes.length === 3 && ownLine.blocks[0].quotes[1] === '![](src.png)')

  // A plain single-quote block still parses to one piece (no regression).
  const plain = parseResponse('> just one quote\n\nthe note\n')
  ok('plain single-quote block unchanged',
     plain.blocks.length === 1 && plain.blocks[0].quotes.length === 1 &&
     plain.blocks[0].quotes[0] === 'just one quote' && plain.blocks[0].note.trim() === 'the note')

  // A pure-text multi-line blockquote (no image) still joins into ONE quote.
  const multi = parseResponse('> line one\n> line two\n\nthe note\n')
  ok('pure-text multi-line blockquote joins into one quote',
     multi.blocks.length === 1 && multi.blocks[0].quotes.length === 1 &&
     multi.blocks[0].quotes[0] === 'line one line two')

  // Two back-to-back single quotes separated by a note stay two blocks.
  const two = parseResponse('> first\n\nnote one\n\n> second\n\nnote two\n')
  ok('separate quotes with notes stay separate blocks',
     two.blocks.length === 2 && two.blocks[0].quotes[0] === 'first' && two.blocks[1].quotes[0] === 'second')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
