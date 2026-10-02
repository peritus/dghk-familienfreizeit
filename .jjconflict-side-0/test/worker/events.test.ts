import { describe, expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'
import { appendEvents, eventHead, readEvents } from '../../src/events/store.js'

describe('D1 event source', () => {
  test('starts with an empty event log', async () => {
    const row = await env.DB.prepare('SELECT COALESCE(MAX(seq), 0) AS head FROM event').first<{
      head: number
    }>()
    expect(row?.head ?? 0).toBe(0)
  })

  test('appends and replays a canonical event', async () => {
    const events = await appendEvents(
      env.DB,
      await eventHead(env.DB),
      [
        {
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
        },
      ],
      familienfreizeit2027Profile.validation_view,
    )
    expect(events[0]?.seq).toBe(1)
    expect(
      (await readEvents(env.DB, familienfreizeit2027Profile.validation_view))[0]?.payload,
    ).toMatchObject({ family_id: 'fam_d1' })
  })

  test('appends and replays a selected-profile module event', async () => {
    await appendEvents(
      env.DB,
      await eventHead(env.DB),
      [
        {
          at: '2026-01-01T00:00:00.000Z',
          actor: 'organiser@example.test',
          subject: null,
          type: 'BuildingAdded',
          payload: { building_id: 'bld_d1', name: 'D1 House', sort_key: 1 },
        },
      ],
      familienfreizeit2027Profile.validation_view,
    )

    expect(
      (await readEvents(env.DB, familienfreizeit2027Profile.validation_view))[0],
    ).toMatchObject({
      type: 'BuildingAdded',
      payload: { building_id: 'bld_d1', name: 'D1 House', sort_key: 1 },
    })
  })
})
