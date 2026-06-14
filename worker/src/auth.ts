import { Hono } from 'hono'
import {
  apiBase, createSession, now, redirectWithToken, upsertUser, uuid, type Env,
} from './lib'
import { sendEmail } from './email'

export const auth = new Hono<{ Bindings: Env }>()

const stateCookie = (name: string, value: string) =>
  `${name}=${value}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax; Secure`

function readCookie(req: Request, name: string): string | undefined {
  const c = req.headers.get('Cookie') ?? ''
  return new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(c)?.[1]
}

// ---- GitHub ---------------------------------------------------------------

auth.get('/github/start', (c) => {
  if (!c.env.GITHUB_CLIENT_ID) return c.text('GitHub login not configured', 501)
  const state = uuid()
  const returnTo = c.req.query('return') ?? c.env.SITE_ORIGIN
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', c.env.GITHUB_CLIENT_ID)
  url.searchParams.set('redirect_uri', `${apiBase(c)}/auth/github/callback`)
  url.searchParams.set('scope', 'read:user user:email')
  url.searchParams.set('state', state)
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': stateCookie('pen_gh_state', `${state}|${encodeURIComponent(returnTo)}`),
    },
  })
})

auth.get('/github/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const saved = readCookie(c.req.raw, 'pen_gh_state')
  const [savedState, savedReturn] = (saved ?? '').split('|')
  if (!code || !state || state !== savedState) return c.text('Bad OAuth state', 400)

  const tokRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${apiBase(c)}/auth/github/callback`,
    }),
  })
  const tok = await tokRes.json<{ access_token?: string }>()
  if (!tok.access_token) return c.text('GitHub token exchange failed', 502)

  const ghHeaders = { Authorization: `Bearer ${tok.access_token}`, 'User-Agent': 'penumbra', Accept: 'application/vnd.github+json' }
  const gh = await (await fetch('https://api.github.com/user', { headers: ghHeaders })).json<any>()
  let email: string | null = gh.email
  if (!email) {
    const emails = await (await fetch('https://api.github.com/user/emails', { headers: ghHeaders })).json<any[]>()
    email = emails?.find((e) => e.primary)?.email ?? emails?.[0]?.email ?? null
  }

  const id = `github:${gh.id}`
  await upsertUser(c.env, { id, name: gh.name ?? gh.login, email, avatar: gh.avatar_url, via: 'github' })
  const token = await createSession(c.env, id)
  return redirectWithToken(c.env.SITE_ORIGIN, decodeURIComponent(savedReturn || ''), token)
})

// ---- Google (OIDC) --------------------------------------------------------

auth.get('/google/start', (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) return c.text('Google login not configured', 501)
  const state = uuid()
  const returnTo = c.req.query('return') ?? c.env.SITE_ORIGIN
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', `${apiBase(c)}/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': stateCookie('pen_gg_state', `${state}|${encodeURIComponent(returnTo)}`),
    },
  })
})

auth.get('/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const saved = readCookie(c.req.raw, 'pen_gg_state')
  const [savedState, savedReturn] = (saved ?? '').split('|')
  if (!code || !state || state !== savedState) return c.text('Bad OAuth state', 400)

  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID!,
      client_secret: c.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${apiBase(c)}/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  const tok = await tokRes.json<{ id_token?: string }>()
  if (!tok.id_token) return c.text('Google token exchange failed', 502)

  // id_token comes straight from Google's token endpoint over TLS; decode payload.
  const payload = JSON.parse(atob(tok.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  const id = `google:${payload.sub}`
  await upsertUser(c.env, { id, name: payload.name ?? null, email: payload.email ?? null, avatar: payload.picture ?? null, via: 'google' })
  const token = await createSession(c.env, id)
  return redirectWithToken(c.env.SITE_ORIGIN, decodeURIComponent(savedReturn || ''), token)
})

// ---- Email magic link -----------------------------------------------------

auth.post('/email/start', async (c) => {
  const { email, return: returnTo } = await c.req.json<{ email?: string; return?: string }>()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: 'invalid email' }, 400)

  const token = uuid() + uuid().replace(/-/g, '')
  const expires = new Date(Date.now() + 30 * 60_000).toISOString() // 30 min
  await c.env.DB.prepare(
    `INSERT INTO magic_links (token, email, return_to, created, expires, used) VALUES (?, ?, ?, ?, ?, 0)`
  )
    .bind(token, email, returnTo ?? null, now(), expires)
    .run()

  const link = `${apiBase(c)}/auth/email/verify?token=${token}`
  const sent = await sendMagicLink(c.env, email, link)

  // Only reveal the link in local dev. NEVER leak it in prod — even on a send
  // failure — or anyone could request a sign-in link for any address.
  if (c.env.DEV_LOGIN === 'true') return c.json({ ok: true, sent, link })
  if (!sent) return c.json({ ok: false, error: 'Could not send the sign-in email right now.' }, 502)
  return c.json({ ok: true, sent: true })
})

auth.get('/email/verify', async (c) => {
  const token = c.req.query('token')
  if (!token) return c.text('missing token', 400)
  const row = await c.env.DB.prepare(
    `SELECT email, return_to, expires, used FROM magic_links WHERE token = ?`
  )
    .bind(token)
    .first<{ email: string; return_to: string | null; expires: string; used: number }>()
  if (!row || row.used || new Date(row.expires).getTime() < Date.now()) return c.text('link expired or invalid', 400)

  await c.env.DB.prepare(`UPDATE magic_links SET used = 1 WHERE token = ?`).bind(token).run()
  const id = `email:${row.email.toLowerCase()}`
  await upsertUser(c.env, { id, name: row.email.split('@')[0], email: row.email, avatar: null, via: 'email' })
  const sess = await createSession(c.env, id)
  return redirectWithToken(c.env.SITE_ORIGIN, row.return_to ?? undefined, sess)
})

async function sendMagicLink(env: Env, email: string, link: string): Promise<boolean> {
  const html = `<p>Click to sign in and comment:</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 minutes.</p>`
  const sent = await sendEmail(env, email, 'Your Penumbra sign-in link', html)
  if (!sent) console.log(`[penumbra] magic link for ${email}: ${link}`)
  return sent
}

// ---- Dev login (local testing only) ---------------------------------------

auth.post('/dev', async (c) => {
  if (c.env.DEV_LOGIN !== 'true') return c.text('disabled', 403)
  const body = await c.req.json<{ name?: string; email?: string }>().catch(() => ({}))
  const name = body.name ?? 'Dev User'
  const id = `email:${(body.email ?? `${name.toLowerCase().replace(/\s+/g, '.')}@dev.local`)}`
  await upsertUser(c.env, { id, name, email: body.email ?? null, avatar: null, via: 'email' })
  const token = await createSession(c.env, id)
  return c.json({ token, user: { id, name } })
})
