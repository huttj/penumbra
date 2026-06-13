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

const { selectorsFromRange, rangeFromSelectors } = await import('./.tmp/anchor.mjs')
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

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
