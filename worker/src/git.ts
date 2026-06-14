import type { Env } from './lib'

// Commit (create or update) a single UTF-8 file into the configured repo via the
// GitHub Contents API. Returns the new commit SHA. Throws on failure.
export async function commitFile(
  env: Env,
  path: string,
  content: string,
  message: string
): Promise<{ commit: string; url: string }> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) throw new Error('write-back not configured')
  const branch = env.GITHUB_BRANCH || 'main'
  const api = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'penumbra',
    'Content-Type': 'application/json',
  }

  // Need the blob sha to update an existing file.
  let sha: string | undefined
  const head = await fetch(`${api}?ref=${branch}`, { headers })
  if (head.ok) sha = ((await head.json()) as any).sha

  const res = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message,
      content: b64utf8(content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!res.ok) throw new Error(`GitHub write failed (${res.status}): ${await res.text().catch(() => '')}`)
  const json = (await res.json()) as any
  return { commit: json.commit?.sha ?? '', url: json.content?.html_url ?? '' }
}

// btoa() is latin1-only; encode UTF-8 first so non-ASCII content survives.
function b64utf8(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

// "https://penumbra.page/research/the-big-crunch" -> "research/the-big-crunch"
export function pageSlug(source: string): string {
  try {
    const p = new URL(source).pathname.replace(/^\/+|\/+$/g, '')
    return p || 'index'
  } catch {
    return 'index'
  }
}

// "Alice Smith" / "email:alice@x.com" -> "alice-smith" / "alice-x-com"
export function slugify(s: string): string {
  return s.replace(/^email:/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'anon'
}
