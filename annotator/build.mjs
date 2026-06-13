import esbuild from 'esbuild'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

// Also publish the bundle into Quartz's static dir, if the site is present.
const SITE_STATIC = '../site/quartz/static'
const copyToSite = {
  name: 'copy-to-site',
  setup(build) {
    build.onEnd(() => {
      if (existsSync('../site/quartz')) {
        mkdirSync(SITE_STATIC, { recursive: true })
        copyFileSync('demo/penumbra.js', `${SITE_STATIC}/penumbra.js`)
        console.log(`→ copied to ${SITE_STATIC}/penumbra.js`)
      }
    })
  },
}

const opts = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2021',
  outfile: 'demo/penumbra.js',
  sourcemap: true,
  minify: !process.argv.includes('--watch'),
  logLevel: 'info',
  plugins: [copyToSite],
}

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(opts)
  await ctx.watch()
  console.log('watching…')
} else {
  await esbuild.build(opts)
}
