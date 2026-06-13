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

## Not done yet
- **Quartz publish step** (Obsidian vault → static site → Cloudflare Pages, with `penumbra.js` injected). This is the next task.
- **LLM layer** — image captioning + embeddings index + chat-over-content API. Separate pipeline; the W3C-JSON store makes "chat about the comments" trivial.
- Git-snapshot exporter for archival/federation. Replies/threads. Version stepper UI.
