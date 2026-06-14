import { Hono } from 'hono'
import { apiBase, currentUser, isAuthor, normalizeSource, now, uuid, type Env } from './lib'
import { commitFile, pageSlug, slugify } from './git'
import { authorEmails, sendEmail } from './email'

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

// Submit: commit the reader's response into the author's repo as markdown.
responses.post('/submit', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in' }, 401)
  const source = normalizeSource((await c.req.json<any>().catch(() => ({}))).source ?? '')
  if (!source) return c.json({ error: 'source required' }, 400)
  if (!c.env.GITHUB_TOKEN || !c.env.GITHUB_REPO) return c.json({ error: 'write-back not configured' }, 501)

  const row = await c.env.DB.prepare(
    `SELECT r.*, u.name AS creator_name, u.email AS creator_email
       FROM responses r LEFT JOIN users u ON u.id = r.creator_id
      WHERE r.source = ? AND r.creator_id = ?`
  )
    .bind(source, user.id)
    .first<any>()
  if (!row) return c.json({ error: 'nothing to submit' }, 404)

  const md = composeDoc(row, source)
  const path = `feedback/${pageSlug(source)}/${slugify(row.creator_name || user.id)}.md`
  let result
  try {
    result = await commitFile(c.env, path, md, `feedback: ${row.creator_name ?? 'reader'} on ${pageSlug(source)}`)
  } catch (e: any) {
    return c.json({ error: e.message }, 502)
  }
  await c.env.DB.prepare(`UPDATE responses SET status = 'submitted', updated = ? WHERE id = ?`).bind(now(), row.id).run()

  // Notify the author(s), fire-and-forget.
  const page = pageSlug(source)
  const subject = `New response from ${row.creator_name ?? 'a reader'} on ${page}`
  const html = `<p><b>${row.creator_name ?? 'A reader'}</b> submitted a response to <a href="${source}">${page}</a>.</p>` +
    (result.url ? `<p><a href="${result.url}">View the committed feedback doc →</a></p>` : '')
  const send = async () => { for (const to of authorEmails(c.env)) await sendEmail(c.env, to, subject, html) }
  try { c.executionCtx.waitUntil(send()) } catch { await send() }

  return c.json({ ok: true, path, commit: result.commit, url: result.url })
})

// Compose the committed markdown: frontmatter + essay (quotes are inline already).
function composeDoc(row: any, source: string): string {
  const fm = [
    '---',
    'penumbra: response',
    `source: ${source}`,
    row.source_sha ? `sourceSha: ${row.source_sha}` : '',
    `reviewer: ${(row.creator_name ?? 'reader').replace(/\n/g, ' ')}`,
    `reviewerId: ${row.creator_id}`,
    `created: ${row.created}`,
    `updated: ${now()}`,
    '---',
    '',
  ].filter((l) => l !== '').join('\n')
  return `${fm}\n${(row.body ?? '').trim()}\n`
}
