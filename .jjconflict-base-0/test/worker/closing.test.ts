import { derive } from '../../src/events/fold.js'
import { composeAttention } from '../../src/attention/engine.js'
import { acknowledgementFingerprint } from '../../src/attention/selectors.js'
import { officialWorkshopAttention } from '../../src/modules/official-workshops/attention.js'
import { expect, test } from 'vitest'
import { env } from 'cloudflare:workers'
import { app } from '../../src/worker/index.js'
import { issueMagicLink, redeemMagicLink } from '../../src/auth/service.js'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'
import { readEvents } from '../../src/events/store.js'

const organiserEnv = {
  ...env,
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'organiser@example.test' as const,
}

async function organiserCookie(): Promise<string> {
  const options = {
    now: () => '2027-01-01T00:00:00.000Z',
    isOrganiser: (email: string) => email === 'organiser@example.test',
  }
  const link = await issueMagicLink(env.DB, 'organiser@example.test', null, false, options)
  const session = await redeemMagicLink(env.DB, link.token!, options)
  if (!session) throw new Error('organiser session was not created')
  return `sid=${session.session}`
}

async function apply(
  cookie: string,
  inputSeq: number,
  events: readonly { type: string; payload: unknown }[],
  revision = buildRevision,
) {
  const response = await app.request(
    '/api/organiser/apply',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        input_seq: inputSeq,
        build_revision: revision,
        compatibility_revision: compatibilityRevision,
        events,
      }),
    },
    organiserEnv,
  )
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

const stored = async () => readEvents(env.DB, luebben2027Profile.validation_view)

const familyInvited = {
  type: 'FamilyInvited',
  payload: {
    family_id: 'fam_close',
    email: 'close@example.test',
    display_name: 'Schluss',
    locale: 'de',
  },
}

test('the Worker fills a staged closing with the reviewed result and its revisions', async () => {
  const cookie = await organiserCookie()
  const inventory = [
    { type: 'BuildingAdded', payload: { building_id: 'bld_test', name: 'Haus', sort_key: 1 } },
    {
      type: 'RoomAdded',
      payload: {
        room_id: 'rm_test',
        building_id: 'bld_test',
        number: '1',
        floor: 'ground',
        room_type: 'standard',
        sort_key: 1,
      },
    },
    {
      type: 'BedAdded',
      payload: {
        bed_id: 'bed_test',
        room_id: 'rm_test',
        label: '',
        bed_type: 'single',
        sleeps: 1,
        sort_key: 1,
      },
    },
    {
      type: 'LabelSet',
      payload: {
        entity_id: 'rm_test',
        key: 'sanitary',
        value: 'shared-floor',
        strength: null,
        note: null,
      },
    },
    {
      type: 'LabelSet',
      payload: {
        entity_id: 'rm_test',
        key: 'price-per-bed-eur',
        value: 0,
        strength: null,
        note: null,
      },
    },
  ]
  const closed = await apply(cookie, 0, [
    ...inventory,
    familyInvited,
    { type: 'AccommodationClosed', payload: {} },
  ])
  expect(closed.status).toBe(200)
  const events = await stored()
  expect(events.slice(-2).map(({ type }) => type)).toEqual(['FamilyInvited', 'AccommodationClosed'])
  expect(events.at(-1)!.payload).toEqual({
    placements: [],
    unplaced: [{ family_id: 'fam_close' }],
    build_revision: buildRevision,
    compatibility_revision: compatibilityRevision,
  })
  expect(closed.body.events).toEqual(JSON.parse(JSON.stringify(events)))

  const reclosed = await apply(cookie, events.length, [
    { type: 'AccommodationClosed', payload: {} },
  ])
  expect(reclosed.status).toBe(200)
  const reopened = await apply(cookie, events.length + 1, [
    { type: 'AccommodationReopened', payload: {} },
  ])
  expect(reopened.status).toBe(200)
  expect((await stored()).slice(-4).map(({ type }) => type)).toEqual([
    'FamilyInvited',
    'AccommodationClosed',
    'AccommodationClosed',
    'AccommodationReopened',
  ])
})

test('a client-supplied result is rejected', async () => {
  const cookie = await organiserCookie()
  const response = await apply(cookie, 0, [
    {
      type: 'AccommodationClosed',
      payload: {
        placements: [],
        unplaced: [],
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
      },
    },
  ])
  expect(response).toEqual({
    status: 400,
    body: { error: 'closing_payload_supplied', type: 'AccommodationClosed' },
  })
  expect(await stored()).toEqual([])
})

test('a closing whose review phase is not ready is refused with its findings', async () => {
  const cookie = await organiserCookie()
  const response = await apply(cookie, 0, [{ type: 'WorkshopsClosed', payload: {} }])
  expect(response.status).toBe(409)
  expect(response.body).toMatchObject({
    error: 'area_not_ready',
    area: 'workshops',
    findings: expect.arrayContaining([
      expect.objectContaining({ code: 'workshop-rankings.choice-not-opened' }),
    ]),
  })
  expect(await stored()).toEqual([])
})

test('a stale head or build is refused before anything is computed', async () => {
  const cookie = await organiserCookie()
  await apply(cookie, 0, [familyInvited])
  const stale = await apply(cookie, 0, [{ type: 'AccommodationClosed', payload: {} }])
  expect(stale.status).toBe(409)
  expect(stale.body).toMatchObject({ error: 'stale_head', expected_head: 0, actual_head: 1 })
  const staleBuild = await apply(cookie, 1, [{ type: 'AccommodationClosed', payload: {} }], 'old')
  expect(staleBuild.status).toBe(409)
  expect(staleBuild.body).toMatchObject({ error: 'stale_build' })
  expect((await stored()).map(({ type }) => type)).toEqual(['FamilyInvited'])
})

test('closings cannot be appended outside the organiser apply path', async () => {
  const cookie = await organiserCookie()
  const response = await app.request(
    '/api/events',
    {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        expected_head: 0,
        events: [{ type: 'AccommodationClosed', payload: {} }],
      }),
    },
    organiserEnv,
  )
  expect(response.status).toBe(403)
  expect(await stored()).toEqual([])
})

test('an area without content cannot be closed', async () => {
  const cookie = await organiserCookie()
  const accommodation = await apply(cookie, 0, [{ type: 'AccommodationClosed', payload: {} }])
  expect(accommodation.status).toBe(409)
  expect(accommodation.body).toMatchObject({
    error: 'area_not_ready',
    area: 'accommodation',
    findings: expect.arrayContaining([
      expect.objectContaining({ code: 'room-assignment.no-families' }),
    ]),
  })
  const workshops = await apply(cookie, 0, [{ type: 'WorkshopsClosed', payload: {} }])
  expect(workshops.status).toBe(409)
  expect(workshops.body).toMatchObject({
    area: 'workshops',
    findings: expect.arrayContaining([
      expect.objectContaining({ code: 'workshop-assignment.no-workshops' }),
    ]),
  })
  expect(await stored()).toEqual([])
})

const readyWorkshops = [
  {
    type: 'WorkshopSpaceAdded',
    payload: {
      workshop_space_id: 'wsp_test',
      name: 'Raum',
      location_description: 'Erdgeschoss',
      capacity: 10,
      sort_key: 1,
    },
  },
  {
    type: 'WorkshopSlotAdded',
    payload: {
      slot_id: 'slot_test',
      starts_at: '2027-05-01T09:00:00+02:00',
      ends_at: '2027-05-01T11:00:00+02:00',
      sort_key: 1,
    },
  },
  {
    type: 'WorkshopAdded',
    payload: {
      workshop_id: 'wks_test',
      title: 'Workshop',
      description: '',
      audience: 'adults',
      age_min: 12,
      age_max: 99,
      capacity: 4,
      participation_mode: 'assigned',
      leader_ids: [],
      needs: [],
      sort_key: 1,
    },
  },
  { type: 'WorkshopChoiceOpened', payload: {} },
]

test('a team acknowledgement applies only to the immediately following new closing attempt', async () => {
  const cookie = await organiserCookie()
  expect(await apply(cookie, 0, readyWorkshops)).toMatchObject({ status: 200 })
  const before = await stored()
  const world = derive(before, luebben2027Profile.validation_view)
  const fingerprint = acknowledgementFingerprint(
    composeAttention(officialWorkshopAttention)({
      domain: 'available',
      world,
      plan: null,
      profile: luebben2027Profile,
      build_revision: buildRevision,
      locale: 'de',
      now: '2027-01-01T00:00:00Z',
      audience: 'organiser',
    }),
  )
  const ack = { type: 'WorkshopWarningsAcknowledged', payload: { fingerprint } }
  expect(
    (await apply(cookie, before.length, [{ type: 'WorkshopsClosed', payload: {} }])).body,
  ).toMatchObject({ error: 'workshop_review_required' })
  expect((await apply(cookie, before.length, [ack])).status).toBe(409)
  expect(
    (
      await apply(cookie, before.length, [
        { ...ack, payload: { fingerprint: '0000000000000000' } },
        { type: 'WorkshopsClosed', payload: {} },
      ])
    ).status,
  ).toBe(409)
  expect(await stored()).toEqual(before)
  expect(
    (await apply(cookie, before.length, [ack, { type: 'WorkshopsClosed', payload: {} }])).status,
  ).toBe(200)
  const closed = await stored()
  expect(closed.at(-2)).toMatchObject({
    type: 'WorkshopWarningsAcknowledged',
    actor: 'organiser@example.test',
    payload: { fingerprint },
  })
  expect(closed.at(-1)?.payload).toMatchObject({
    placements: [{ workshop_id: 'wks_test', slot_id: 'slot_test', space_id: 'wsp_test' }],
    build_revision: buildRevision,
  })
  expect(
    (await apply(cookie, closed.length, [{ type: 'WorkshopsClosed', payload: {} }])).status,
  ).toBe(409)
  expect(
    (await apply(cookie, closed.length, [ack, { type: 'WorkshopsClosed', payload: {} }])).status,
  ).toBe(200)
})

test('acknowledgement does not weaken existing readiness blockers', async () => {
  const cookie = await organiserCookie()
  expect(
    (
      await apply(cookie, 0, [
        { type: 'WorkshopWarningsAcknowledged', payload: { fingerprint: '0000000000000000' } },
        { type: 'WorkshopsClosed', payload: {} },
      ])
    ).body,
  ).toMatchObject({ error: 'area_not_ready' })
  expect(await stored()).toEqual([])
})
