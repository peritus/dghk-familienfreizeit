import { derive, type KernelWorld } from '../events/fold.js'
import { readEvents } from '../events/store.js'
import { canonicalEmail } from '../events/types.js'
import { hash } from './service.js'

export type Principal = { kind: 'organiser'; email: string } | { kind: 'family'; email: string; family_id: string }
export type PrincipalOptions = { isOrganiser: (email: string) => boolean; now?: () => string }

export async function currentPrincipal(db: D1Database, raw: string | undefined, options: PrincipalOptions): Promise<Principal | null> {
  if (!raw) return null
  const now = (options.now ?? (() => new Date().toISOString()))()
  const row = await db.prepare('SELECT email, expires_at FROM session WHERE token_hash = ?1 AND expires_at > ?2').bind(await hash(raw), now).first<{ email: string; expires_at: string }>()
  if (!row) return null
  const email = canonicalEmail(row.email)
  if (options.isOrganiser(email)) {
    await refreshSession(db, raw, email, now, 7 * 24 * 60 * 60 * 1000)
    return { kind: 'organiser', email }
  }
  const world = derive(await readEvents(db))
  const familyId = familyForEmail(world, email)
  if (!familyId) return null
  await refreshSession(db, raw, email, now, 30 * 24 * 60 * 60 * 1000)
  return { kind: 'family', email, family_id: familyId }
}

export function familyForEmail(world: KernelWorld, email: string): string | null {
  return world.labels.find((label) => label.key === 'email' && label.value === email)?.entity_id ?? null
}
async function refreshSession(db: D1Database, raw: string, email: string, now: string, duration: number): Promise<void> { await db.prepare('UPDATE session SET last_seen_at = ?1, expires_at = ?2 WHERE token_hash = ?3 AND email = ?4').bind(now, new Date(Date.parse(now) + duration).toISOString(), await hash(raw), email).run() }
