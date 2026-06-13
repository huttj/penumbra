import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'
import { apiBase, currentUser, normalizeSource, now, uuid, type Env } from './lib'

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

app.get('/me', async (c) => {
  const user = await currentUser(c)
  return c.json({ user })
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
  const include = (c.req.query('include') ?? '').split(',').filter(Boolean)
  const statuses = ['active', ...include]
  const placeholders = statuses.map(() => '?').join(',')

  const rows = await c.env.DB.prepare(
    `SELECT data FROM annotations WHERE source = ? AND status IN (${placeholders}) ORDER BY created ASC`
  )
    .bind(normalizeSource(source), ...statuses)
    .all<{ data: string }>()

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
  if (!source || !selector || !text) return c.json({ error: 'target.source, target.selector and a body value are required' }, 400)

  const norm = normalizeSource(source)
  const id = `${apiBase(c)}/annotations/${uuid()}`
  const created = now()
  const annotation = {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id,
    type: 'Annotation',
    motivation: 'commenting',
    created,
    creator: { id: user.id, name: user.name, avatar: user.avatar, via: user.via },
    body: [{ type: 'TextualBody', purpose: 'commenting', format: 'text/markdown', value: String(text) }],
    target: { source: norm, selector },
    'penumbra:status': 'active',
    'penumbra:docVersion': input?.docVersion ?? null,
  }

  await c.env.DB.prepare(
    `INSERT INTO annotations (id, source, creator_id, status, doc_version, created, updated, data)
     VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`
  )
    .bind(id, norm, user.id, input?.docVersion ?? null, created, created, JSON.stringify(annotation))
    .run()

  return c.json(annotation, 201)
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
  if (row.creator_id !== user.id) return c.json({ error: 'not your annotation' }, 403)

  const patch = await c.req.json<{ status?: string; bodyText?: string }>().catch(() => ({}))
  const anno = JSON.parse(row.data)
  let status = anno['penumbra:status'] ?? 'active'
  if (patch.status && ['active', 'resolved', 'orphaned'].includes(patch.status)) {
    status = patch.status
    anno['penumbra:status'] = status
  }
  if (typeof patch.bodyText === 'string') {
    anno.body = [{ type: 'TextualBody', purpose: 'commenting', format: 'text/markdown', value: patch.bodyText }]
  }
  anno.modified = now()

  await c.env.DB.prepare(`UPDATE annotations SET status = ?, updated = ?, data = ? WHERE id = ?`)
    .bind(status, anno.modified, JSON.stringify(anno), id)
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
