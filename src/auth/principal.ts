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
  audience?: 'family' | 'organiser'
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
  const organiser = options.isOrganiser(email)
  if (options.audience === 'organiser' && !organiser) return null
  if (organiser && options.audience !== 'family') {
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
  if (
    isPastAbsoluteExpiry(
      row.created_at,
      now,
      organiser ? sessionPolicy.organiser_absolute_ms : sessionPolicy.family_absolute_ms,
    )
  ) {
    await revokeSession(db, raw)
    return null
  }
  await refreshSession(
    db,
    raw,
    email,
    now,
    organiser ? sessionPolicy.organiser_idle_ms : sessionPolicy.family_idle_ms,
    row.created_at,
    organiser ? sessionPolicy.organiser_absolute_ms : sessionPolicy.family_absolute_ms,
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

export type SessionIdentity = {
  email: string
  roles: readonly ('family' | 'organiser')[]
  family_id: string | null
}

export async function currentIdentity(
  db: D1Database,
  raw: string | undefined,
  options: PrincipalOptions,
  config: KernelConfig,
): Promise<SessionIdentity | null> {
  let cached: Promise<World> | undefined
  const readWorld =
    options.readWorld ??
    (() => (cached ??= readEvents(db, config).then((events) => derive(events, config))))
  const identityOptions: PrincipalOptions = { ...options }
  identityOptions.readWorld = readWorld
  const principal = await currentPrincipal(db, raw, identityOptions, config)
  if (!principal) return null
  const world = await readWorld()
  const familyId = familyForEmail(world, principal.email)
  return {
    email: principal.email,
    roles: [
      ...(familyId ? ['family' as const] : []),
      ...(options.isOrganiser(principal.email) ? ['organiser' as const] : []),
    ],
    family_id: familyId,
  }
}
