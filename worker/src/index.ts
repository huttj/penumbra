import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'
import { responses } from './responses'
import { authorEmails, sendEmail } from './email'
import { apiBase, currentUser, isAuthor, normalizeSource, now, uuid, type Env } from './lib'

const htmlEscape = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

const app = new Hono<{ Bindings: Env }>()

// CORS: allow the configured site origin, with credentials + Authorization header.
app.use('*', (c, next) =>
  cors({
    origin: c.env.SITE_ORIGIN,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })(c, next)
)

app.get('/', (c) => c.json({ name: 'penumbra-api', ok: true }))

app.route('/auth', auth)
app.route('/responses', responses)

// ---- image uploads (R2) ---------------------------------------------------

app.post('/upload', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in' }, 401)
  if (!c.env.UPLOADS) return c.json({ error: 'uploads not configured' }, 501)
  const ct = c.req.header('Content-Type') ?? ''
  if (!ct.startsWith('image/')) return c.json({ error: 'images only' }, 400)
  const body = await c.req.arrayBuffer()
  if (body.byteLength > 8 * 1024 * 1024) return c.json({ error: 'image too large (8MB max)' }, 413)
  const ext = (ct.split('/')[1] || 'bin').split(';')[0].replace(/[^a-z0-9]/gi, '') || 'bin'
  const key = `${uuid()}.${ext}`
  await c.env.UPLOADS.put(key, body, { httpMetadata: { contentType: ct } })
  return c.json({ url: `${apiBase(c)}/uploads/${key}` })
})

app.get('/uploads/:key', async (c) => {
  if (!c.env.UPLOADS) return c.text('not configured', 501)
  const obj = await c.env.UPLOADS.get(c.req.param('key'))
  if (!obj) return c.text('not found', 404)
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers: h })
})

app.get('/me', async (c) => {
  const user = await currentUser(c)
  return c.json({ user, isAuthor: isAuthor(c.env, user?.id) })
})

app.post('/auth/logout', async (c) => {
  const authz = c.req.header('Authorization')
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : undefined
  if (token) await c.env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run()
  return c.json({ ok: true })
})

// ---- Annotations (W3C Web Annotation Data Model) --------------------------

// List annotations for a page. Default returns only `active`; pass
// ?include=resolved,orphaned to also load hidden ones (for the version stepper).
app.get('/annotations', async (c) => {
  const source = c.req.query('source')
  if (!source) return c.json({ error: 'source required' }, 400)

  // Feedback is private. Anonymous → nothing. Readers → only their own threads.
  // The page author → everyone's.
  const user = await currentUser(c)
  if (!user) return c.json({ items: [] })
  const author = isAuthor(c.env, user.id)

  const include = (c.req.query('include') ?? '').split(',').filter(Boolean)
  const statuses = ['active', ...include]
  const placeholders = statuses.map(() => '?').join(',')

  let sql = `SELECT data FROM annotations WHERE source = ? AND status IN (${placeholders})`
  const binds: unknown[] = [normalizeSource(source), ...statuses]
  if (!author) {
    sql += ` AND creator_id = ?`
    binds.push(user.id)
  }
  sql += ` ORDER BY created ASC`

  const rows = await c.env.DB.prepare(sql).bind(...binds).all<{ data: string }>()
  return c.json({ items: (rows.results ?? []).map((r) => JSON.parse(r.data)) })
})

// Create an annotation. Body is a partial W3C Annotation: { target, body }.
app.post('/annotations', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in to comment' }, 401)

  const input = await c.req.json<any>().catch(() => null)
  const source = input?.target?.source
  const selector = input?.target?.selector
  const text = input?.body?.[0]?.value ?? input?.bodyText
  const kind = input?.kind === 'emoji' ? 'emoji' : 'comment'
  if (!source || !selector || !text) return c.json({ error: 'target.source, target.selector and a body value are required' }, 400)
  if (kind === 'emoji' && String(text).length > 8) return c.json({ error: 'emoji body too long' }, 400)

  const norm = normalizeSource(source)
  const id = `${apiBase(c)}/annotations/${uuid()}`
  const created = now()
  const annotation = {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id,
    type: 'Annotation',
    motivation: kind === 'emoji' ? 'assessing' : 'commenting',
    created,
    creator: { id: user.id, name: user.name, avatar: user.avatar, via: user.via, authored: isAuthor(c.env, user.id) },
    body: [{ type: 'TextualBody', purpose: kind === 'emoji' ? 'assessing' : 'commenting', format: 'text/markdown', value: String(text) }],
    target: { source: norm, selector },
    'penumbra:kind': kind,
    'penumbra:status': 'active',
    'penumbra:acknowledged': false,
    'penumbra:replies': [],
    'penumbra:docVersion': input?.docVersion ?? null,
  }

  await c.env.DB.prepare(
    `INSERT INTO annotations (id, source, creator_id, status, kind, acknowledged, doc_version, created, updated, data)
     VALUES (?, ?, ?, 'active', ?, 0, ?, ?, ?, ?)`
  )
    .bind(id, norm, user.id, kind, input?.docVersion ?? null, created, created, JSON.stringify(annotation))
    .run()

  return c.json(annotation, 201)
})

// Append a linear reply to a thread. Any signed-in user may reply.
app.post('/annotations/:id{.+}/replies', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in to reply' }, 401)
  const id = `${apiBase(c)}/annotations/${c.req.param('id')}`

  const row = await c.env.DB.prepare(`SELECT data FROM annotations WHERE id = ?`).bind(id).first<{ data: string }>()
  if (!row) return c.json({ error: 'not found' }, 404)

  const { text } = await c.req.json<{ text?: string }>().catch(() => ({}))
  if (!text || !String(text).trim()) return c.json({ error: 'reply text required' }, 400)

  const anno = JSON.parse(row.data)
  const reply = {
    id: uuid(),
    created: now(),
    creator: { id: user.id, name: user.name, avatar: user.avatar, via: user.via, authored: isAuthor(c.env, user.id) },
    body: String(text),
  }
  anno['penumbra:replies'] = [...(anno['penumbra:replies'] ?? []), reply]
  anno.modified = reply.created
  // A new reply makes the thread "unread" for the author again, unless the author wrote it.
  if (!reply.creator.authored) anno['penumbra:acknowledged'] = false

  await c.env.DB.prepare(`UPDATE annotations SET updated = ?, acknowledged = ?, data = ? WHERE id = ?`)
    .bind(reply.created, anno['penumbra:acknowledged'] ? 1 : 0, JSON.stringify(anno), id)
    .run()

  // Notify the other side of the conversation, fire-and-forget.
  const src: string = anno.target?.source ?? ''
  const page = src.replace(/^https?:\/\/[^/]+\/?/, '') || 'a page'
  const subject = `${user.name ?? 'Someone'} replied on ${page}`
  const html = `<p><b>${htmlEscape(user.name ?? 'Someone')}</b> replied to a thread on <a href="${src}">${page}</a>:</p>` +
    `<blockquote>${htmlEscape(String(text)).slice(0, 400)}</blockquote>`
  const notify = async () => {
    if (reply.creator.authored) {
      // author replied → email the reader who started the thread
      const rootId = anno.creator?.id
      if (rootId && !isAuthor(c.env, rootId)) {
        const u = await c.env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(rootId).first<{ email: string | null }>()
        if (u?.email) await sendEmail(c.env, u.email, subject, html)
      }
    } else {
      // reader replied → email the author(s)
      for (const to of authorEmails(c.env)) await sendEmail(c.env, to, subject, html)
    }
  }
  try { c.executionCtx.waitUntil(notify()) } catch { await notify() }

  return c.json(reply, 201)
})

// Edit the body or change status (resolve/reopen). Owner only for now.
app.patch('/annotations/:id{.+}', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in' }, 401)
  const id = `${apiBase(c)}/annotations/${c.req.param('id')}`

  const row = await c.env.DB.prepare(`SELECT creator_id, data FROM annotations WHERE id = ?`)
    .bind(id)
    .first<{ creator_id: string; data: string }>()
  if (!row) return c.json({ error: 'not found' }, 404)

  const patch = await c.req.json<{ status?: string; bodyText?: string; acknowledged?: boolean }>().catch(() => ({}))
  const anno = JSON.parse(row.data)
  const owner = row.creator_id === user.id
  const author = isAuthor(c.env, user.id)

  // Acknowledge/unread toggle is an author-only action.
  if (typeof patch.acknowledged === 'boolean') {
    if (!author) return c.json({ error: 'only the page author can acknowledge' }, 403)
    anno['penumbra:acknowledged'] = patch.acknowledged
  }
  // Status + body edits are owner-only.
  let status = anno['penumbra:status'] ?? 'active'
  if (patch.status && ['active', 'resolved', 'orphaned'].includes(patch.status)) {
    if (!owner) return c.json({ error: 'not your annotation' }, 403)
    status = patch.status
    anno['penumbra:status'] = status
  }
  if (typeof patch.bodyText === 'string') {
    if (!owner) return c.json({ error: 'not your annotation' }, 403)
    anno.body = [{ type: 'TextualBody', purpose: 'commenting', format: 'text/markdown', value: patch.bodyText }]
  }
  anno.modified = now()

  await c.env.DB.prepare(`UPDATE annotations SET status = ?, acknowledged = ?, updated = ?, data = ? WHERE id = ?`)
    .bind(status, anno['penumbra:acknowledged'] ? 1 : 0, anno.modified, JSON.stringify(anno), id)
    .run()
  return c.json(anno)
})

app.delete('/annotations/:id{.+}', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.json({ error: 'sign in' }, 401)
  const id = `${apiBase(c)}/annotations/${c.req.param('id')}`
  const row = await c.env.DB.prepare(`SELECT creator_id FROM annotations WHERE id = ?`).bind(id).first<{ creator_id: string }>()
  if (!row) return c.json({ error: 'not found' }, 404)
  if (row.creator_id !== user.id) return c.json({ error: 'not your annotation' }, 403)
  await c.env.DB.prepare(`DELETE FROM annotations WHERE id = ?`).bind(id).run()
  return c.json({ ok: true })
})

export default app
