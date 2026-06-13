import esbuild from 'esbuild'

const opts = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2021',
  outfile: 'demo/penumbra.js',
  sourcemap: true,
  minify: !process.argv.includes('--watch'),
  logLevel: 'info',
}

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(opts)
  await ctx.watch()
  console.log('watching…')
} else {
  await esbuild.build(opts)
}
