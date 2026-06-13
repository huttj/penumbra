import { Penumbra } from './ui'

// Boot from a global config object, e.g.:
//   <script>window.PENUMBRA = { api: "https://api.example.com", root: "article" }</script>
//   <script src="/penumbra.js" defer></script>
declare global {
  interface Window {
    PENUMBRA?: { api: string; source?: string; root?: string; docVersion?: string }
    penumbra?: Penumbra
  }
}

function boot() {
  const cfg = window.PENUMBRA
  if (!cfg?.api) {
    console.warn('[penumbra] window.PENUMBRA.api is not set; annotator disabled.')
    return
  }
  const p = new Penumbra(cfg)
  window.penumbra = p
  p.init().catch((e) => console.error('[penumbra] init failed', e))

  // Quartz (and other SPA routers) swap page content without a full reload and
  // dispatch a `nav` event on document. Re-anchor for the new page.
  document.addEventListener('nav', () => p.reload().catch((e) => console.error('[penumbra] reload failed', e)))
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()
