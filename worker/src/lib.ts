import type { Context } from 'hono'

export type Env = {
  DB: D1Database
  SITE_ORIGIN: string
  DEV_LOGIN?: string
  PUBLIC_API_BASE?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ZEPTOMAIL_TOKEN?: string // ZeptoMail "Send Mail" token (set as a Worker secret)
  ZEPTOMAIL_URL?: string   // optional override, e.g. https://api.zeptomail.eu/v1.1/email
  MAIL_FROM?: string       // "Name <address@penumbra.page>"
  AUTHOR_IDS?: string // comma-separated user ids who "own" pages (can acknowledge; replies badged)
  GITHUB_TOKEN?: string    // fine-grained PAT (Contents: R/W) for write-back; set as a secret
  GITHUB_REPO?: string     // "owner/repo", e.g. "huttj/penumbra"
  GITHUB_BRANCH?: string   // default "main"
  UPLOADS?: R2Bucket       // pasted-image storage
}

export function authorIds(env: Env): string[] {
  return (env.AUTHOR_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}
export function isAuthor(env: Env, userId: string | null | undefined): boolean {
  return !!userId && authorIds(env).includes(userId)
}

export type User = {
  id: string
  name: string | null
  email: string | null
  avatar: string | null
  via: string | null
}

export const now = () => new Date().toISOString()
export const uuid = () => crypto.randomUUID()

// Public base URL of the worker itself (for redirect_uris and annotation ids).
export function apiBase(c: Context<{ Bindings: Env }>): string {
  if (c.env.PUBLIC_API_BASE) return c.env.PUBLIC_API_BASE.replace(/\/$/, '')
  const u = new URL(c.req.url)
  return `${u.protocol}//${u.host}`
}

// Strip the fragment and trailing slash so the same page always keys the same.
export function normalizeSource(raw: string): string {
  try {
    const u = new URL(raw)
    u.hash = ''
    let s = u.toString()
    if (s.endsWith('/')) s = s.slice(0, -1)
    return s
  } catch {
    return raw.split('#')[0].replace(/\/$/, '')
  }
}

export async function upsertUser(env: Env, u: User): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, avatar, via, created)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, avatar=excluded.avatar`
  )
    .bind(u.id, u.name, u.email, u.avatar, u.via, now())
    .run()
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = uuid() + uuid().replace(/-/g, '')
  const expires = new Date(Date.now() + 90 * 864e5).toISOString() // 90 days
  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, created, expires) VALUES (?, ?, ?, ?)`
  )
    .bind(token, userId, now(), expires)
    .run()
  return token
}

// Resolve the current user from an `Authorization: Bearer <token>` header
// (primary, cross-origin friendly) or a `pen_session` cookie (fallback).
export async function currentUser(c: Context<{ Bindings: Env }>): Promise<User | null> {
  const auth = c.req.header('Authorization')
  let token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
  if (!token) {
    const cookie = c.req.header('Cookie') ?? ''
    token = /(?:^|;\s*)pen_session=([^;]+)/.exec(cookie)?.[1]
  }
  if (!token) return null

  const row = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.avatar, u.via, s.expires
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`
  )
    .bind(token)
    .first<User & { expires: string }>()

  if (!row) return null
  if (new Date(row.expires).getTime() < Date.now()) return null
  return { id: row.id, name: row.name, email: row.email, avatar: row.avatar, via: row.via }
}

// Redirect back to the site, handing the session token in the URL fragment so
// the client can store it in localStorage (avoids cross-origin cookie pain).
export function redirectWithToken(siteOrigin: string, returnTo: string | undefined, token: string): Response {
  let dest = returnTo && returnTo.startsWith(siteOrigin) ? returnTo : siteOrigin
  dest += (dest.includes('#') ? '&' : '#') + 'pen_token=' + encodeURIComponent(token)
  return new Response(null, { status: 302, headers: { Location: dest } })
}
