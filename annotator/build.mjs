import esbuild from 'esbuild'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

const SITE_STATIC = '../site/quartz/static'
const watch = process.argv.includes('--watch')

// Two bundles: the small core, and the lazy-loaded TipTap editor.
const entries = [
  { entry: 'src/index.ts', name: 'penumbra.js' },
  { entry: 'src/editor.ts', name: 'penumbra-editor.js' },
]

function copyPlugin(name) {
  return {
    name: 'copy-to-site',
    setup(build) {
      build.onEnd(() => {
        if (existsSync('../site/quartz')) {
          mkdirSync(SITE_STATIC, { recursive: true })
          copyFileSync(`demo/${name}`, `${SITE_STATIC}/${name}`)
          console.log(`→ copied ${name} to site`)
        }
      })
    },
  }
}

for (const e of entries) {
  const opts = {
    entryPoints: [e.entry],
    outfile: `demo/${e.name}`,
    bundle: true,
    format: 'iife',
    target: 'es2021',
    sourcemap: true,
    minify: !watch,
    logLevel: 'info',
    plugins: [copyPlugin(e.name)],
  }
  if (watch) { const ctx = await esbuild.context(opts); await ctx.watch() }
  else await esbuild.build(opts)
}
if (watch) console.log('watching…')
