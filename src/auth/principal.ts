import { derive, type KernelConfig, type World } from '../events/fold.js'
import { readEvents } from '../events/store.js'
import { canonicalEmail } from '../events/types.js'
import { hash, revokeSession, sessionPolicy } from './service.js'

export type Principal =
  | { kind: 'organiser'; email: string }
  | { kind: 'family'; email: string; family_id: string }

export type PrincipalOptions = {
  isOrganiser: (email: string) => boolean
  now?: () => string
  readWorld?: () => Promise<World>
}

export async function currentPrincipal(
  db: D1Database,
  raw: string | undefined,
  options: PrincipalOptions,
  config: KernelConfig,
): Promise<Principal | null> {
  if (!raw) return null
  const now = (options.now ?? (() => new Date().toISOString()))()
  const row = await db
    .prepare(
      'SELECT email, created_at, expires_at FROM session WHERE token_hash = ?1 AND expires_at > ?2',
    )
    .bind(await hash(raw), now)
    .first<{ email: string; created_at: string; expires_at: string }>()
  if (!row) return null
  const email = canonicalEmail(row.email)
  if (options.isOrganiser(email)) {
    if (isPastAbsoluteExpiry(row.created_at, now, sessionPolicy.organiser_absolute_ms)) {
      await revokeSession(db, raw)
      return null
    }
    await refreshSession(
      db,
      raw,
      email,
      now,
      sessionPolicy.organiser_idle_ms,
      row.created_at,
      sessionPolicy.organiser_absolute_ms,
    )
    return { kind: 'organiser', email }
  }
  const world = options.readWorld
    ? await options.readWorld()
    : derive(await readEvents(db, config), config)
  const familyId = familyForEmail(world, email)
  if (!familyId) return null
  if (isPastAbsoluteExpiry(row.created_at, now, sessionPolicy.family_absolute_ms)) {
    await revokeSession(db, raw)
    return null
  }
  await refreshSession(
    db,
    raw,
    email,
    now,
    sessionPolicy.family_idle_ms,
    row.created_at,
    sessionPolicy.family_absolute_ms,
  )
  return { kind: 'family', email, family_id: familyId }
}

export function familyForEmail(world: World, email: string): string | null {
  // Through the key index: this runs on every authenticated request, and
  // scanning the whole label store to match one email grew with the log.
  return world.family_id_by_email[email] ?? null
}
async function refreshSession(
  db: D1Database,
  raw: string,
  email: string,
  now: string,
  idleDuration: number,
  createdAt: string,
  absoluteDuration: number,
): Promise<void> {
  const absoluteExpiry = Date.parse(createdAt) + absoluteDuration
  const idleExpiry = Date.parse(now) + idleDuration
  await db
    .prepare(
      'UPDATE session SET last_seen_at = ?1, expires_at = ?2 WHERE token_hash = ?3 AND email = ?4',
    )
    .bind(now, new Date(Math.min(idleExpiry, absoluteExpiry)).toISOString(), await hash(raw), email)
    .run()
}

function isPastAbsoluteExpiry(createdAt: string, now: string, duration: number): boolean {
  return Date.parse(createdAt) + duration <= Date.parse(now)
}
