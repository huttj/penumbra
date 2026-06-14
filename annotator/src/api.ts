// Thin client for the Penumbra Worker API + token storage.

const TOKEN_KEY = 'penumbra:token'

export type User = { id: string; name: string | null; avatar?: string | null; via?: string | null }
export type Annotation = any // W3C Annotation JSON

export class Api {
  constructor(private base: string) {}

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }
  set token(v: string | null) {
    if (v) localStorage.setItem(TOKEN_KEY, v)
    else localStorage.removeItem(TOKEN_KEY)
  }

  private headers(json = false): Record<string, string> {
    const h: Record<string, string> = {}
    if (json) h['Content-Type'] = 'application/json'
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  // Capture a token handed back in the URL fragment after OAuth/magic-link.
  captureTokenFromHash(): boolean {
    const m = /[#&]pen_token=([^&]+)/.exec(location.hash)
    if (!m) return false
    this.token = decodeURIComponent(m[1])
    history.replaceState(null, '', location.pathname + location.search)
    return true
  }

  async me(): Promise<{ user: User | null; isAuthor: boolean }> {
    if (!this.token) return { user: null, isAuthor: false }
    const r = await fetch(`${this.base}/me`, { headers: this.headers() })
    if (!r.ok) return { user: null, isAuthor: false }
    const j = await r.json()
    return { user: j.user, isAuthor: !!j.isAuthor }
  }

  async list(source: string, include: string[] = []): Promise<Annotation[]> {
    const q = new URLSearchParams({ source })
    if (include.length) q.set('include', include.join(','))
    const r = await fetch(`${this.base}/annotations?${q}`)
    if (!r.ok) return []
    return (await r.json()).items
  }

  async create(
    target: any,
    bodyText: string,
    opts: { kind?: 'comment' | 'emoji'; docVersion?: string } = {}
  ): Promise<Annotation> {
    const r = await fetch(`${this.base}/annotations`, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({ target, kind: opts.kind ?? 'comment', body: [{ type: 'TextualBody', value: bodyText }], docVersion: opts.docVersion }),
    })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `create failed (${r.status})`)
    return r.json()
  }

  async reply(id: string, text: string): Promise<any> {
    const rel = id.split('/annotations/')[1]
    const r = await fetch(`${this.base}/annotations/${rel}/replies`, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({ text }),
    })
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `reply failed (${r.status})`)
    return r.json()
  }

  async patch(id: string, patch: { status?: string; bodyText?: string; acknowledged?: boolean }): Promise<Annotation> {
    const rel = id.split('/annotations/')[1]
    const r = await fetch(`${this.base}/annotations/${rel}`, {
      method: 'PATCH',
      headers: this.headers(true),
      body: JSON.stringify(patch),
    })
    if (!r.ok) throw new Error(`patch failed (${r.status})`)
    return r.json()
  }

  async remove(id: string): Promise<void> {
    const rel = id.split('/annotations/')[1]
    await fetch(`${this.base}/annotations/${rel}`, { method: 'DELETE', headers: this.headers() })
  }

  loginUrl(provider: 'github' | 'google'): string {
    return `${this.base}/auth/${provider}/start?return=${encodeURIComponent(location.href)}`
  }

  async emailLogin(email: string): Promise<{ ok: boolean; link?: string }> {
    const r = await fetch(`${this.base}/auth/email/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, return: location.href }),
    })
    return r.json()
  }

  async logout(): Promise<void> {
    await fetch(`${this.base}/auth/logout`, { method: 'POST', headers: this.headers() }).catch(() => {})
    this.token = null
  }
}
