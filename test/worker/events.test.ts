import { describe, expect, test } from 'vitest'
import { appendEvents, eventHead, readEvents } from '../../src/events/store.js'

describe('D1 event source', () => {
  test('starts with an empty event log', async () => {
    const row = await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS head FROM event').first<{ head: number }>()
    expect(row?.head ?? 0).toBe(0)
  })

  test('appends and replays a canonical event', async () => {
    const events = await appendEvents(env.DB, await eventHead(env.DB), [{ at: '2026-01-01T00:00:00.000Z', actor: 'organiser@example.test', subject: null, type: 'FamilyInvited', payload: { family_id: 'fam_d1', email: 'd1@example.test', display_name: 'D1', locale: 'de' } }])
    expect(events[0]?.seq).toBe(1)
    expect((await readEvents(env.DB))[0]?.payload).toMatchObject({ family_id: 'fam_d1' })
  })
})
