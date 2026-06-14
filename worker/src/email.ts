import { authorIds, type Env } from './lib'

export function parseFrom(s?: string): { name: string; address: string } {
  const m = /^(.*?)<(.+)>/.exec(s ?? '')
  if (m) return { name: m[1].trim() || 'Penumbra', address: m[2].trim() }
  return { name: 'Penumbra', address: (s ?? 'noreply@penumbra.page').trim() }
}

// Send one transactional email via ZeptoMail's HTTP API. Returns false (and logs)
// when unconfigured or on failure, so callers can degrade gracefully.
export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.ZEPTOMAIL_TOKEN) {
    console.log(`[penumbra] email skipped (no token): to=${to} subject="${subject}"`)
    return false
  }
  const res = await fetch(env.ZEPTOMAIL_URL ?? 'https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      Authorization: `Zoho-enczapikey ${env.ZEPTOMAIL_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      from: parseFrom(env.MAIL_FROM),
      to: [{ email_address: { address: to } }],
      subject,
      htmlbody: html,
    }),
  })
  if (!res.ok) {
    console.log(`[penumbra] email failed (${res.status}): ${await res.text().catch(() => '')}`)
    return false
  }
  return true
}

// Email addresses of the page owners (AUTHOR_IDS are "email:foo@bar" ids).
export function authorEmails(env: Env): string[] {
  return authorIds(env)
    .filter((id) => id.startsWith('email:'))
    .map((id) => id.slice('email:'.length))
}
