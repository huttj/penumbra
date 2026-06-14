# Deploying Penumbra

Two pieces: the **Worker** (`api.penumbra.page`) and the **static site** (`penumbra.page`).
Login is **email-only** (magic links), so a working email sender is a hard prerequisite —
without it, nobody (including you) can sign in.

## 0. Prerequisites
- `penumbra.page` zone on your Cloudflare account ✅
- `wrangler` logged in ✅ (`npx wrangler whoami`)
- **ZeptoMail** (Zoho) — domain verified ✅, pay-as-you-go. We send via its HTTP
  Email API (Workers can't do SMTP). The credential is the **Send Mail token**
  (= your ZeptoMail SMTP password / the `enczapikey`). `MAIL_FROM` in `wrangler.toml`
  is `noreply@penumbra.page` and must be on the verified domain.

> **AUTHOR_IDS = the email you sign into Penumbra with.** It's currently
> `email:squashai@gmail.com`. That's how the system knows which replies are "the author"
> (see below). It is *not* your Cloudflare login. Edit `wrangler.toml` if you'll use a different address.

## 1. Worker
```bash
cd worker
npx wrangler d1 create penumbra          # → copy the database_id into wrangler.toml
npx wrangler d1 migrations apply penumbra --remote
npx wrangler secret put ZEPTOMAIL_TOKEN  # paste your ZeptoMail Send Mail token
npx wrangler deploy                      # also provisions the api.penumbra.page custom domain
curl https://api.penumbra.page/          # → {"name":"penumbra-api","ok":true}
```

## 2. Site (Cloudflare Pages)
**Dashboard route (recommended):** Pages → Create → connect the GitHub repo, then:
- **Build command:**
  `cd annotator && npm i && npm run build && cd ../site && npm i && npx quartz plugin install --from-config && npx quartz build`
- **Build output directory:** `site/public`
- **Root directory:** repo root
- Add custom domain **penumbra.page** to the Pages project.

**Or direct upload:**
```bash
cd annotator && npm run build
cd ../site && npx quartz build
npx wrangler pages deploy public --project-name penumbra
# then add the penumbra.page custom domain in the dashboard
```

## 3. Verify
Visit `https://penumbra.page/welcome` → sign in with your email → the magic link arrives →
select text → comment. Your replies should show the **author** badge.

## Notes
- The annotator auto-targets `https://api.penumbra.page` on any non-localhost host
  (`Head.tsx`), and keys annotations to `https://penumbra.page/<path>`.
- Local dev is unaffected: `worker/.dev.vars` (gitignored) overrides the prod vars
  back to localhost + `DEV_LOGIN=true`.
- To redeploy after edits: `wrangler deploy` (worker) and re-run the Pages build.
