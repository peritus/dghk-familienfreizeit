import { describe, expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'
import { appendEvents, eventHead, readEvents } from '../../src/events/store.js'
import type { Event } from '../../src/events/types.js'

describe('D1 event source', () => {
  test('starts with an empty event log', async () => {
    const row = await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS head FROM event').first<{
      head: number
    }>()
    expect(row?.head ?? 0).toBe(0)
  })

  test('rejects a prepared batch whose sequence does not follow the head', async () => {
    const event: Event = {
      seq: 2,
      at: '2026-01-01T00:00:00.000Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'FamilyInvited',
      payload: {
        family_id: 'fam_invalid_sequence',
        email: 'invalid-sequence@example.test',
        display_name: 'Invalid sequence',
        locale: 'de',
      },
    }
    await expect(appendEvents(env.DB, 0, [event])).rejects.toThrow(
      'event batch sequence does not match expected head',
    )
    expect(await eventHead(env.DB)).toBe(0)
  })

  test('appends and replays a canonical event', async () => {
    const event: Event = {
      seq: 1,
      at: '2026-01-01T00:00:00.000Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'FamilyInvited',
      payload: {
        family_id: 'fam_d1',
        email: 'd1@example.test',
        display_name: 'D1',
        locale: 'de',
      },
    }
    const events = await appendEvents(env.DB, await eventHead(env.DB), [event])
    expect(events).toEqual([event])
    expect(events[0]?.seq).toBe(1)
    expect(
      (await readEvents(env.DB, familienfreizeit2027Profile.validation_view))[0]?.payload,
    ).toMatchObject({ family_id: 'fam_d1' })
  })

  test('appends and replays a selected-profile module event', async () => {
    const event: Event = {
      seq: 1,
      at: '2026-01-01T00:00:00.000Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'BuildingAdded',
      payload: { building_id: 'bld_d1', name: 'D1 House', sort_key: 1 },
    }
    await appendEvents(env.DB, await eventHead(env.DB), [event])

    expect(
      (await readEvents(env.DB, familienfreizeit2027Profile.validation_view))[0],
    ).toMatchObject({
      type: 'BuildingAdded',
      payload: { building_id: 'bld_d1', name: 'D1 House', sort_key: 1 },
    })
  })
})
