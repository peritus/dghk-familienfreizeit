import { canonicalEmail } from '../events/types.js'

export type AuthClock = () => string

export type AuthOptions = { now?: AuthClock; isOrganiser: (email: string) => boolean }

export type LoginResult = { accepted: true; token: string | null }

const fifteenMinutes = 15 * 60 * 1000
const oneHour = 60 * 60 * 1000
const familySession = 30 * 24 * 60 * 60 * 1000
const organiserSession = 7 * 24 * 60 * 60 * 1000

export async function issueMagicLink(
  db: D1Database,
  submittedEmail: string,
  ip: string | null,
  familyExists: boolean,
  options: AuthOptions,
): Promise<LoginResult> {
  const email = canonicalEmail(submittedEmail)
  const now = (options.now ?? (() => new Date().toISOString()))()
  const addressAllowed = await consumeRateLimit(db, `email:${email}`, 5, oneHour, now)
  const ipAllowed = await consumeRateLimit(db, `ip:${ip ?? 'unknown'}`, 20, oneHour, now)
  if (!addressAllowed || !ipAllowed || (!familyExists && !options.isOrganiser(email)))
    return { accepted: true, token: null }
  const token = randomToken()
  await db
    .prepare(
      'INSERT INTO magic_link(token_hash, email, expires_at, created_at, created_ip) VALUES (?1, ?2, ?3, ?4, ?5)',
    )
    .bind(await hash(token), email, addMilliseconds(now, fifteenMinutes), now, ip)
    .run()
  return { accepted: true, token }
}

export async function redeemMagicLink(
  db: D1Database,
  token: string,
  options: AuthOptions,
): Promise<{ session: string; email: string; expires_at: string } | null> {
  const now = (options.now ?? (() => new Date().toISOString()))()
  const row = await db
    .prepare('DELETE FROM magic_link WHERE token_hash = ?1 AND expires_at > ?2 RETURNING email')
    .bind(await hash(token), now)
    .first<{ email: string }>()
  if (!row) return null
  const email = canonicalEmail(row.email)
  const session = randomToken()
  const expiresAt = addMilliseconds(
    now,
    options.isOrganiser(email) ? organiserSession : familySession,
  )
  await db
    .prepare(
      'INSERT INTO session(token_hash, email, expires_at, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?4)',
    )
    .bind(await hash(session), email, expiresAt, now)
    .run()
  return { session, email, expires_at: expiresAt }
}

async function consumeRateLimit(
  db: D1Database,
  bucket: string,
  limit: number,
  duration: number,
  now: string,
): Promise<boolean> {
  const expiresAt = addMilliseconds(now, duration)
  await db
    .prepare(
      'INSERT INTO rate_limit(bucket, count, expires_at) VALUES (?1, 1, ?2) ON CONFLICT(bucket) DO UPDATE SET count = CASE WHEN expires_at <= ?3 THEN 1 ELSE count + 1 END, expires_at = CASE WHEN expires_at <= ?3 THEN ?2 ELSE expires_at END',
    )
    .bind(bucket, expiresAt, now)
    .run()
  const row = await db
    .prepare('SELECT count FROM rate_limit WHERE bucket = ?1')
    .bind(bucket)
    .first<{ count: number }>()
  return (row?.count ?? limit + 1) <= limit
}

export async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function addMilliseconds(value: string, milliseconds: number): string {
  return new Date(Date.parse(value) + milliseconds).toISOString()
}
