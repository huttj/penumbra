# Penumbra

A federated, LLM-friendly writing + feedback system. **Layer 1** (this repo so far)
is inline highlight-comments on your own writing. Layer 2 (later) is full-page
references across other people's Penumbra-compatible systems.

The design goal is a **protocol, not a platform**: annotations are stored and served
as [W3C Web Annotation](https://www.w3.org/TR/annotation-model/) JSON, so anyone can
adopt the format without adopting our code.

## Architecture (Layer 1)

```
Obsidian vault ──(Quartz)──> static site ──> Cloudflare Pages   [TODO: publish step]
                                  │
                                  │  loads /penumbra.js
                                  ▼
                          annotator (this repo)  ── highlight UI, W3C anchoring
                                  │  fetch()
                                  ▼
                          Cloudflare Worker (worker/)  ── auth + annotations API
                                  │
                                  ▼
                          Cloudflare D1  ── annotations as W3C JSON + index columns
```

- **`vault/`** — the Obsidian vault (`vault/Research/` is the vault root). Source of truth for writing.
- **`worker/`** — Cloudflare Worker: OAuth (GitHub, Google) + email magic-link auth, and the annotations CRUD API. Hono + D1.
- **`annotator/`** — the dependency-free highlight client (TypeScript → one `penumbra.js` bundle). Anchors comments with `TextQuoteSelector` + `TextPositionSelector`, renders via the CSS Custom Highlight API (never mutates your document), stores sessions in `localStorage`.

### Key design decisions
- **Store = D1, wire format = W3C JSON.** A git-snapshot exporter (for archival/federation) is a later add-on, not a rewrite.
- **"Hide addressed highlights" = annotation `status`** (`active` / `resolved` / `orphaned`). Resolved annotations stop loading by default; pass `?include=resolved` to see them. A `doc_version` stamp on each annotation is the hook for a future version stepper.
- **No Twitter login.** GitHub + Google OAuth + email magic links (Twitter/X OAuth is now paywalled and not worth it).
- **Token-in-fragment auth.** After login the Worker redirects to the site with `#pen_token=…`; the client stores it and sends `Authorization: Bearer`. Sidesteps cross-origin cookie pain.

## Run it locally

Two terminals:

```bash
# 1. API
cd worker
npm install
npm run migrate:local        # one-time: create local D1 tables
npm run dev                  # http://localhost:8787

# 2. Annotator demo
cd annotator
npm install
npm run build                # produces demo/penumbra.js
cd demo && python3 -m http.server 8080
```

Open **http://localhost:8080** → "Email me a link" (dev mode opens it for you) →
select any sentence → 💬 Comment. Reload: the highlight reloads and is clickable.
Resolve it (as the author) and it disappears.

Run the anchoring tests: `cd annotator && node test/anchor.test.mjs`

## Going live (needs your accounts)

1. **GitHub repo** — create one, `git remote add origin …`, push.
2. **Cloudflare** — `cd worker && npx wrangler login`, then:
   - `npx wrangler d1 create penumbra` → paste `database_id` into `worker/wrangler.toml`.
   - `npm run migrate:remote`
   - Set `SITE_ORIGIN`, `PUBLIC_API_BASE`, `DEV_LOGIN="false"` in `wrangler.toml` `[vars]`.
   - `npx wrangler deploy`
3. **OAuth apps** (redirect URI = `https://<your-worker>/auth/<provider>/callback`):
   - GitHub: Settings → Developer settings → OAuth Apps. Then
     `wrangler secret put GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
   - Google: Cloud Console → Credentials → OAuth client (Web). Same for Google secrets.
4. **Email** — create a [Resend](https://resend.com) key: `wrangler secret put RESEND_API_KEY`. Set `MAIL_FROM` to a verified sender.
5. **Domain** — point it at Cloudflare; put the site on `yourdomain.com`, the worker on `api.yourdomain.com`.

## Publishing the vault (`site/`)

Quartz (vendored, v5) turns `vault/Research/` into the static site. `site/content`
is a symlink to the vault; the annotator is injected via `site/quartz/components/Head.tsx`
(config + `/static/penumbra.js`), and re-anchors on Quartz SPA navigation.

```bash
# one-time after a fresh clone:
cd site && npm install && npx quartz plugin install --from-config
# build the annotator bundle (copies into site/quartz/static/penumbra.js):
cd ../annotator && npm install && npm run build
# preview with clean URLs + SPA + hot reload:
cd ../site && npx quartz build --serve --port 8080
```

**Cloudflare Pages** — Build command:
`cd annotator && npm i && npm run build && cd ../site && npm i && npx quartz plugin install --from-config && npx quartz build`
· Output dir: `site/public` · also set `SITE_ORIGIN=https://penumbra.page` on the Worker.

## Response layer (private feedback → forked documents)

The model: **a comment and a document are the same primitive at different zoom
levels** — a response anchored to the source text. One **response doc per reader
per page**, private (each reader sees only their own; the author sees all).

- **Annotate** — highlight + comment, now *private 1:1 channels* (reads are
  auth-scoped in the Worker).
- **Respond** — the `✍ Response` panel: a side-by-side markdown essay editor.
  Insert quotes from a selection (anchored), paste a passage and it auto-anchors
  to the source, and quotes go **stale** (grayed/strikethrough) when you edit the
  text they point at — reusing the anchoring engine's strict matcher.
- **Submit** — commits the doc as markdown into `feedback/<page>/<reviewer>.md`
  via the GitHub Contents API (needs `GITHUB_TOKEN`), with frontmatter recording
  the source + the build commit SHA (the "look it up in git history" archive).
- **Reviews** — author-only `👁 Reviews` panel collects every reader's response.
- **Notify** — ZeptoMail emails the other side on submit/reply.

Data: `responses` table in D1 (live drafts) → markdown in the repo on submit.
Federation (other people's repos, Obsidian-as-browser) is deliberately deferred.

### To fully enable in prod
1. `cd worker && npx wrangler d1 migrations apply penumbra --remote` (adds `responses`)
2. `npx wrangler deploy` (ships the response routes + private reads)
3. `npx wrangler secret put GITHUB_TOKEN` (fine-grained PAT, Contents: R/W) — for Submit
4. Add ZeptoMail credits — for login + notification email
5. Rebuild Pages

## Later / ideas
- **"New since last visit"** read-state (per-user visit timestamps) replacing the author-acknowledge dot.
- WYSIWYG response editor; recursion UI (responses become annotatable pages); version stepper.
- Obsidian-side edit → email (a GitHub Action on push).
- **LLM layer** — image indexing + chat-over-content; git-history changelogs + digests.
