import { describe, expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import {
  appendCanonicalEvents,
  appendEvents,
  eventHead,
  readEvents,
} from '../../src/events/store.js'
import type { Event, EventDraft } from '../../src/events/types.js'

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
    await expect(appendCanonicalEvents(env.DB, 0, [event])).rejects.toThrow(
      'event batch sequence does not match expected head',
    )
    expect(await eventHead(env.DB)).toBe(0)
  })

  test('validates draft events before persistence', async () => {
    const draft = {
      at: '2026-01-01T00:00:00.000Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'FamilyInvited',
      payload: {
        family_id: 'fam_invalid_payload',
        email: 'not-an-email',
        display_name: 'Invalid payload',
        locale: 'de',
      },
    } satisfies EventDraft
    await expect(
      appendEvents(env.DB, 0, [draft], luebben2027Profile.validation_view),
    ).rejects.toThrow()
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
    const events = await appendCanonicalEvents(env.DB, await eventHead(env.DB), [event])
    expect(events).toEqual([event])
    expect(events[0]?.seq).toBe(1)
    expect(
      (await readEvents(env.DB, luebben2027Profile.validation_view))[0]?.payload,
    ).toMatchObject({ family_id: 'fam_d1' })
  })

  test('reads a legacy person birthdate as age without rewriting the event', async () => {
    const seq = (await eventHead(env.DB)) + 1
    const payload = {
      person_id: 'per_legacy',
      family_id: 'fam_legacy',
      given_name: 'Legacy',
      family_name: 'Person',
      birthdate: '1990-10-05',
      role: 'adult',
    }
    await env.DB.prepare(
      'INSERT INTO event(seq, at, actor, type, subject, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
    )
      .bind(
        seq,
        '2027-01-01T00:00:00.000Z',
        'fixture',
        'PersonAdded',
        null,
        JSON.stringify(payload),
      )
      .run()

    const events = await readEvents(env.DB, luebben2027Profile.validation_view)
    expect(events.find((event) => event.seq === seq)?.payload).toMatchObject({ age: 36 })
    const row = await env.DB.prepare('SELECT payload FROM event WHERE seq = ?1')
      .bind(seq)
      .first<{ payload: string }>()
    expect(JSON.parse(row!.payload)).toHaveProperty('birthdate', '1990-10-05')
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
    const draft: EventDraft = {
      at: event.at,
      actor: event.actor,
      subject: event.subject,
      type: event.type,
      payload: event.payload,
    }
    await appendEvents(env.DB, await eventHead(env.DB), [draft], luebben2027Profile.validation_view)

    expect((await readEvents(env.DB, luebben2027Profile.validation_view))[0]).toMatchObject({
      type: 'BuildingAdded',
      payload: { building_id: 'bld_d1', name: 'D1 House', sort_key: 1 },
    })
  })
})
