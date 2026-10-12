import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { join } from 'node:path'
import type { Event } from '../src/events/types.ts'

export const fixtureDatabaseId = '00000000-0000-0000-0000-000000000001'

export type FixtureSession = {
  token_hash: string
  email: string
  expires_at: string
  created_at: string
  last_seen_at: string
}

/** Private, offline lab setup using the same local D1 persistence as Wrangler. */
export async function seedRequestFixture(
  persistencePath: string,
  events: readonly Event[],
  sessions: readonly FixtureSession[],
) {
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: `export default {
        async fetch(request, { DATABASE }) {
          const { events = [], sessions = [] } = await request.json()
          await DATABASE.batch([
            ...events.map(event =>
              DATABASE.prepare('INSERT INTO event(seq,at,actor,type,subject,payload) VALUES (?,?,?,?,?,?)')
                .bind(event.seq, event.at, event.actor, event.type, event.subject, JSON.stringify(event.payload))),
            ...sessions.map(session =>
              DATABASE.prepare('INSERT INTO session(token_hash,email,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?)')
                .bind(session.token_hash, session.email, session.expires_at, session.created_at, session.last_seen_at)),
          ])
          return new Response('ok')
        }
      }`,
      compatibilityDate: '2026-09-01',
      resourcePersistencePath: join(persistencePath, 'v3'),
      d1Databases: { DATABASE: fixtureDatabaseId },
    }),
  )
  try {
    // Construct bound statements inside the setup isolate; one bridge call per batch.
    const insert = async (events: readonly Event[], sessions: readonly FixtureSession[]) => {
      const response = await runtime.dispatchFetch('http://fixture.local/', {
        method: 'POST',
        body: JSON.stringify({ events, sessions }),
      })
      const body = await response.text()
      if (!response.ok) throw new Error(`private fixture import failed: ${body}`)
    }
    for (let offset = 0; offset < events.length; offset += 100)
      await insert(events.slice(offset, offset + 100), [])
    if (sessions.length) await insert([], sessions)
  } finally {
    await runtime.dispose()
  }
}
