import { Hono } from 'hono'
import { apiBase, currentUser, isAuthor, normalizeSource, now, uuid, type Env } from './lib'

// Response documents are PRIVATE: a reader can only read/write their own; the
// page author can read everyone's (the "reviews for this page" workspace).
export const responses = new Hono<{ Bindings: Env }>()

function rowToResponse(r: any) {
  return {
    id: r.id,
    source: r.source,
    creator: { id: r.creator_id, name: r.creator_name ?? null, avatar: r.creator_avatar ?? null },
    body: r.body ?? '',
    quotes: JSON.parse(r.quotes || '[]'),
    sourceSha: r.source_sha ?? null,
    status: r.status,
    created: r.created,
    updated: r.updated,
  }
}

// The current reader's own response doc for a page (or null).
responses.get('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ response: null })
  const source = normalizeSource(c.req.query('source') ?? '')
  if (!source) return c.json({ error: 'source required' }, 400)
  const row = await c.env.DB.prepare(
    `SELECT r.*, u.name AS creator_name, u.avatar AS creator_avatar
       FROM responses r LEFT JOIN users u ON u.id = r.creator_id
      WHERE r.source = ? AND r.creator_id = ?`
  )
    .bind(source, user.id)
    .first<any>()
  return c.json({ response: row ? rowToResponse(row) : null })
})

// Author-only: every reader's response doc for a page (the reviews workspace).
responses.get('/all', async (c) => {
  const user = await currentUser(c)
  if (!isAuthor(c.env, user?.id)) return c.json({ error: 'forbidden' }, 403)
  const source = normalizeSource(c.req.query('source') ?? '')
  if (!source) return c.json({ error: 'source required' }, 400)
  const rows = await c.env.DB.prepare(
    `SELECT r.*, u.name AS creator_name, u.avatar AS creator_avatar
       FROM responses r LEFT JOIN users u ON u.id = r.creator_id
      WHERE r.source = ? ORDER BY r.updated DESC`
  )
    .bind(source)
    .all<any>()
  return c.json({ responses: (rows.results ?? []).map(rowToResponse) })
})

// Upsert the current reader's response doc (autosave). One per (source, creator).
responses.post('/', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in' }, 401)
  const input = await c.req.json<any>().catch(() => null)
  const source = normalizeSource(input?.source ?? '')
  if (!source) return c.json({ error: 'source required' }, 400)

  const body = String(input?.body ?? '')
  const quotes = JSON.stringify(Array.isArray(input?.quotes) ? input.quotes : [])
  const sourceSha = input?.sourceSha ?? null
  const ts = now()

  const existing = await c.env.DB.prepare(`SELECT id, created FROM responses WHERE source = ? AND creator_id = ?`)
    .bind(source, user.id)
    .first<{ id: string }>()

  if (existing) {
    await c.env.DB.prepare(`UPDATE responses SET body = ?, quotes = ?, source_sha = ?, updated = ? WHERE id = ?`)
      .bind(body, quotes, sourceSha, ts, existing.id)
      .run()
    return c.json({ id: existing.id, ok: true, updated: ts })
  }
  const id = `${apiBase(c)}/responses/${uuid()}`
  await c.env.DB.prepare(
    `INSERT INTO responses (id, source, creator_id, body, quotes, source_sha, status, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
  )
    .bind(id, source, user.id, body, quotes, sourceSha, ts, ts)
    .run()
  return c.json({ id, ok: true, updated: ts })
})
