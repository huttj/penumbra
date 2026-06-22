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

const { selectorsFromRange, rangeFromSelectors, imageSrcOf, imageBasename, resolveImageQuote, imageOccurrence, imagesInRange } =
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

  // restore the text-test globals for any later additions
  globalThis.document = dom.window.document
  globalThis.Node = dom.window.Node
  globalThis.NodeFilter = dom.window.NodeFilter
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
