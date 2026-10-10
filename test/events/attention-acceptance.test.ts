import { expect, test } from 'vitest'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import { profileAttention } from '../../src/attention/profile.js'
import { composeAttention, canonical } from '../../src/attention/engine.js'
import { coreAttentionChecks } from '../../src/attention/core.js'
import {
  attentionAllClear,
  attentionBlockers,
  acknowledgementFingerprint,
} from '../../src/attention/selectors.js'
import { admitProfileProposal } from '../../src/organiser/proposal.js'
import {
  roomFeasibility,
  buildRoomAssignmentInput,
  type RoomAssignmentParams,
} from '../../src/modules/room-assignment/index.js'
import { projectFamilyWorld, projectSharedWorld } from '../../src/events/world.js'
import type { AttentionContext } from '../../src/attention/types.js'
import type { Event, JsonValue } from '../../src/events/types.js'
const revisions = { build_revision: 'acceptance', compatibility_revision: 1 }
const evaluator = profileAttention(profile)
const event = (type: string, payload: JsonValue): Omit<Event, 'seq'> => ({
  type,
  payload,
  at: '2027-01-01T00:00:00.000Z',
  actor: 'organiser@example.test',
  subject: null,
})
const log = (entries: readonly Omit<Event, 'seq'>[]): Event[] =>
  entries.map((entry, index) => ({ ...entry, seq: index + 1 }))
const family = event('FamilyInvited', {
  family_id: 'fam_a',
  email: 'a@example.test',
  display_name: 'A',
  locale: 'de',
})
const person = (id: string, role = 'adult', age: number | null = 30) =>
  event('PersonAdded', {
    person_id: id,
    family_id: 'fam_a',
    given_name: id,
    family_name: 'A',
    age,
    role,
  })
const workshop = (id: string, capacity = 2) =>
  event('WorkshopAdded', {
    workshop_id: id,
    title: id,
    description: '',
    audience: 'all',
    age_min: 0,
    age_max: 99,
    capacity,
    participation_mode: 'assigned',
    leader_ids: [],
    needs: [],
    sort_key: 1,
  })
const label = (
  id: string,
  key: string,
  value: JsonValue,
  strength: 'required' | 'preferred' | null = null,
) => event('LabelSet', { entity_id: id, key, value, strength, note: null })
const resources = [
  event('WorkshopSpaceAdded', {
    workshop_space_id: 'wsp_a',
    name: 'Raum',
    location_description: 'Unten',
    capacity: 10,
    availability_starts_at: '2027-01-01T08:00:00Z',
    availability_ends_at: '2027-01-01T20:00:00Z',
    sort_key: 1,
  }),
  event('WorkshopSlotAdded', {
    slot_id: 'slot_a',
    starts_at: '2027-01-01T09:00:00Z',
    ends_at: '2027-01-01T10:00:00Z',
    sort_key: 1,
  }),
]
function context(entries: readonly Omit<Event, 'seq'>[]): AttentionContext {
  const world = derive(log(entries), profile.validation_view),
    contributions = composeSolverContributions(profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    ...revisions,
    event_date: profile.meta.starts_on,
    profile,
    seed: null,
  })
  return {
    domain: 'available',
    world,
    plan,
    profile,
    build_revision: revisions.build_revision,
    locale: 'de',
    now: '2027-01-01T00:00:00.000Z',
    audience: 'organiser',
  }
}
const items = (c: AttentionContext, code: string) =>
  evaluator(c).items.filter((i) => i.code === code)
test('catalogue has complete registration, bilingual copy, stable independent composition and coverage', () => {
  const c = context([
    family,
    person('per_a'),
    ...resources,
    workshop('wks_a'),
    event('WorkshopChoiceOpened', {}),
  ])
  const forward = evaluator(c),
    reverse = profileAttention({ ...profile, modules: [...profile.modules].reverse() })(c)
  expect(forward).toEqual(reverse)
  expect(forward.coverage.every((v) => v.state !== 'unavailable')).toBe(true)
  const en = evaluator({ ...c, locale: 'en' })
  expect(forward.items.map((i) => i.id)).toEqual(en.items.map((i) => i.id))
  expect(canonical(c.world)).toBe(
    canonical(
      context([
        family,
        person('per_a'),
        ...resources,
        workshop('wks_a'),
        event('WorkshopChoiceOpened', {}),
      ]).world,
    ),
  )
  for (const module of profile.modules)
    for (const check of module.contributions.attention_checks ?? []) {
      expect(check.owner).toBe(module.id)
      expect(check.code.startsWith(`${module.id}.`)).toBe(true)
      expect(check.title).toHaveProperty('de')
      expect(check.title).toHaveProperty('en')
    }
  expect(
    attentionAllClear({
      ...forward,
      coverage: [...forward.coverage, { code: 'failed', owner: 'core', state: 'unavailable' }],
    }),
  ).toBe(false)
})
test('missing plan/head/build and invalid proposals make required coverage unavailable', () => {
  const c = context([family, person('per_a'), workshop('wks_a')])
  for (const unavailable of [
    { ...c, plan: null },
    { ...c, plan: { ...c.plan!, meta: { ...c.plan!.meta, input_seq: 999 } } },
    { ...c, build_revision: 'other' },
    { ...c, domain: 'invalid-proposal' as const },
  ]) {
    expect(attentionAllClear(evaluator(unavailable))).toBe(false)
    expect(attentionBlockers(evaluator(unavailable), 'close-workshops').length).toBeGreaterThan(0)
  }
})
test('none, infancy, unopened choice and one eligible wish do not invent allocation tasks', () => {
  const none = context([
    family,
    person('per_a'),
    person('per_infant', 'infant', 0),
    ...resources,
    workshop('wks_a'),
    label('per_a', 'prefers-workshop', { workshop_id: null, rank: null }),
    event('WorkshopChoiceOpened', {}),
  ])
  expect(items(none, 'workshop-assignment.shortfall')).toEqual([])
  expect(items(none, 'workshop-rankings.response-missing')).toEqual([])
  const unopened = context([family, person('per_a'), ...resources, workshop('wks_a')])
  expect(items(unopened, 'workshop-rankings.response-missing')).toEqual([])
  const one = context([
    family,
    person('per_a'),
    ...resources,
    workshop('wks_a'),
    label('per_a', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
    event('WorkshopChoiceOpened', {}),
  ])
  expect(items(one, 'workshop-assignment.shortfall')).toEqual([])
  expect(one.world!.diagnostics.some((d) => d.id === 'kernel.invalid-resolver-value')).toBe(false)
})
test('rank inconsistency and partial fulfilment retain exact causes and truthful warning policy', () => {
  const c = context([
    family,
    person('per_a'),
    ...resources,
    workshop('wks_a', 0),
    label('per_a', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
    event('WorkshopChoiceOpened', {}),
  ])
  const item = items(c, 'workshop-assignment.shortfall')[0]!
  expect(item.evidence.expected).toBe(1)
  expect(item.blocks).toEqual([])
  expect(item.evidence.reasons).toEqual([{ workshop_id: 'wks_a', reason: 'hard.capacity' }])
  const mixed = context([
    family,
    person('per_a'),
    workshop('wks_a'),
    label('per_a', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
    label('per_a', 'prefers-workshop', { workshop_id: null, rank: null }),
  ])
  expect(items(mixed, 'workshop-rankings.invalid-response')).toHaveLength(1)
  const stale = context([
    family,
    person('per_a'),
    workshop('wks_a'),
    label('per_a', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
    event('WorkshopRetired', { workshop_id: 'wks_a', reason: null }),
  ])
  expect(items(stale, 'workshop-rankings.stale-selection')[0]?.actions[0]?.kind).toBe('clear-label')
})
test('neutral markers replay, reset, timestamps and contradictory held values are explicit', () => {
  const key = 'needs-accessible',
    base = [family, person('per_a')]
  const c = context([...base, label('fam_a', `response-${key}`, true)])
  expect(
    items(c, 'family-preferences.response-missing').some((i) => i.evidence.field === key),
  ).toBe(false)
  expect(c.world!.labels.find((l) => l.key === `response-${key}`)?.set_at).toBe(
    '2027-01-01T00:00:00.000Z',
  )
  const contradictory = context([
    ...base,
    label('fam_a', `response-${key}`, true),
    label('fam_a', key, 'accessible', 'required'),
  ])
  expect(items(contradictory, 'family-preferences.response-inconsistent')).toHaveLength(1)
  const reset = context([
    ...base,
    label('fam_a', `response-${key}`, true),
    event('LabelCleared', { entity_id: 'fam_a', key: `response-${key}`, value: null }),
  ])
  expect(
    items(reset, 'family-preferences.response-missing').some((i) => i.evidence.field === key),
  ).toBe(true)
})
test('semantic acknowledgement ignores locale and unrelated sequence; relevant evidence invalidates it', () => {
  const c = context([family, person('per_a'), workshop('wks_a')])
  const token = acknowledgementFingerprint(evaluator(c))
  expect(acknowledgementFingerprint(evaluator({ ...c, locale: 'en' }))).toBe(token)
  const renamed = context([
    family,
    person('per_a'),
    workshop('wks_a'),
    event('FamilyDisplayNameChanged', {
      family_id: 'fam_a',
      old_display_name: 'A',
      new_display_name: 'B',
    }),
  ])
  expect(acknowledgementFingerprint(evaluator(renamed))).toBe(token)
  const fixed = context([
    family,
    person('per_a'),
    workshop('wks_a'),
    label('wks_a', 'leader', 'per_a'),
  ])
  expect(acknowledgementFingerprint(evaluator(fixed))).not.toBe(token)
})
test('D30 accepts capacity changes and recomputes automatic attendance from the new input', () => {
  const entries = [
    family,
    person('per_a'),
    person('per_b'),
    ...resources,
    workshop('wks_a', 2),
    label('per_a', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
    label('per_b', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
  ]
  const committed = log(entries),
    decrease = label('wks_a', 'capacity', 1)
  const beforeWorld = derive(committed, profile.validation_view)
  const after = admitProfileProposal(committed, [decrease], profile, revisions)
  const contributions = composeSolverContributions(profile)
  const plan = (world: ReturnType<typeof derive>) =>
    solve(buildSolverInput(world, contributions), contributions, {
      ...revisions,
      event_date: profile.meta.starts_on,
      profile,
      seed: null,
    })
  const beforeAssignments = (
    plan(beforeWorld).sections['workshop-assignment'] as { assignments: unknown[] }
  ).assignments
  const afterAssignments = (
    plan(after.world).sections['workshop-assignment'] as { assignments: unknown[] }
  ).assignments
  expect(afterAssignments.length).toBeLessThan(beforeAssignments.length)
  const remove = event('LabelCleared', { entity_id: 'per_b', key: 'prefers-workshop', value: null })
  expect(() =>
    admitProfileProposal(committed, [remove, decrease], profile, revisions),
  ).not.toThrow()
  expect(() => admitProfileProposal(committed, [decrease, remove], profile, revisions)).not.toThrow()
  expect(() =>
    admitProfileProposal(committed, [label('wks_a', 'capacity', 3)], profile, revisions),
  ).not.toThrow()
  // Structural replay itself adds no solver-admission rule.
  expect(() =>
    derive([...committed, { ...decrease, seq: committed.length + 1 }], profile.validation_view),
  ).not.toThrow()
})
test('audience projections omit findings, sensitive facts and opaque relationship identifiers', () => {
  const c = context([
    family,
    person('per_a'),
    workshop('wks_a'),
    label('fam_a', 'family-note', 'sensitive'),
    label('per_a', 'needs', 'workshop-attendance-secret', 'required'),
  ])
  for (const projected of [projectFamilyWorld(c.world!, 'fam_a'), projectSharedWorld(c.world!)]) {
    expect(projected.diagnostics).toEqual([])
    expect(projected.summaries).toEqual({})
    expect(canonical(projected)).not.toContain('sensitive')
    expect(canonical(projected)).not.toContain('workshop-attendance-secret')
  }
  expect(evaluator({ ...c, audience: 'family' }).items).toEqual([])
})
test('indexed fixed-room feasibility shares required exclusions and blocked room rules', () => {
  const c = context([
    family,
    person('per_a'),
    event('BuildingAdded', { building_id: 'bld_a', name: 'Haus', sort_key: 1 }),
    event('RoomAdded', {
      room_id: 'rm_a',
      building_id: 'bld_a',
      number: '1',
      floor: 'ground',
      room_type: 'standard',
      sort_key: 1,
    }),
    event('BedAdded', {
      bed_id: 'bed_a',
      room_id: 'rm_a',
      label: '',
      bed_type: 'single',
      sleeps: 1,
      sort_key: 1,
    }),
    label('fam_a', 'excludes', 'rm_a', 'required'),
  ])
  const params = profile.modules.find((m) => m.id === 'room-assignment')!
    .parameters as RoomAssignmentParams
  const rows = roomFeasibility(buildRoomAssignmentInput(c.world!, params), params, [], 'fam_a')
  expect(rows[0]?.reasons.length).toBeGreaterThan(0)
  expect(items(c, 'room-assignment.required-contradiction')).toHaveLength(1)
  expect(
    evaluator(c)
      .items.filter((i) => i.areas.includes('accommodation'))
      .some((i) => i.code.startsWith('workshop-')),
  ).toBe(false)
})
test('registered operations have stable group/field identity and sanitized copy', () => {
  const c = context([])
  const result = evaluator({
    ...c,
    operations: [
      { id: 'request-1', code: 'invalid-field', group_id: 'group-1', field: 'capacity' },
      { id: 'request-1', code: 'invalid-field', group_id: 'group-2', field: 'title' },
    ],
  })
  const fields = result.items.filter((i) => i.code === 'operation.invalid-field')
  expect(fields).toHaveLength(2)
  expect(fields[0]?.source_refs.some((s) => s.kind === 'field')).toBe(true)
  expect(new Set(fields.map((i) => i.id)).size).toBe(2)
  expect(
    composeAttention(coreAttentionChecks)({ ...c, world: null, domain: 'failed' }).coverage.every(
      (v) => v.state === 'unavailable',
    ),
  ).toBe(true)
})

import { associateFindingGroups, eventInputFindings } from '../../src/organiser/proposal.js'
import { EventInputError } from '../../src/events/types.js'
test('rejected field facts bind only their exact draft group and keep the natural identity', () => {
  const findings = eventInputFindings(
    new EventInputError('private', ['capacity'], 2),
    profile,
    'test',
    '2027-01-01T00:00:00Z',
  )
  const groups = [
    { id: 'group-1', events: [label('wks_a', 'title', 'first')] },
    { id: 'group-2', events: [label('wks_a', 'capacity', 0)] },
  ]
  const bound = associateFindingGroups(findings, groups, 0)
  expect(bound[0]!.id).toBe(findings[0]!.id)
  expect(bound[0]!.basis.group_ids).toEqual(['group-2'])
  expect(bound[0]!.actions).toContainEqual({ kind: 'review-group', group_id: 'group-2' })
  expect(canonical(bound)).not.toContain('private')
})

import { buildWorkshopReportsProjection } from '../../src/modules/workshop-assignment/app/workshop-reports-view.js'
import type { WorkshopAssignmentSection } from '../../src/modules/workshop-assignment/index.js'
import type { WorkshopSchedulingSection } from '../../src/modules/workshop-scheduling/index.js'
test('simultaneous actual sources are retained in person and family reports and counted distinctly', () => {
  const c = context([family, person('per_a'), ...resources, workshop('wks_a'), workshop('wks_b')])
  const assignment = c.plan!.sections['workshop-assignment'] as WorkshopAssignmentSection
  const schedule = c.plan!.sections['workshop-scheduling'] as WorkshopSchedulingSection
  const plan = {
    ...c.plan!,
    sections: {
      ...c.plan!.sections,
      'workshop-scheduling': {
        ...schedule,
        placements: [
          { workshop_id: 'wks_a', slot_id: 'slot_a', space_id: 'wsp_a' },
          { workshop_id: 'wks_b', slot_id: 'slot_a', space_id: 'wsp_a' },
        ],
      },
      'workshop-assignment': {
        ...assignment,
        assignments: [
          {
            person_id: 'per_a',
            workshop_id: 'wks_a',
            slot_id: 'slot_a',
            reason: 'fixed' as const,
            rank: null,
          },
        ],
        signups: [
          { person_id: 'per_a', workshop_id: 'wks_a' },
          { person_id: 'per_a', workshop_id: 'wks_b' },
        ],
      },
    },
  }
  const report = buildWorkshopReportsProjection({
    world: c.world!,
    plan,
    time_zone: profile.meta.timezone,
  })
  expect(
    report.persons.find((p) => p.id === 'per_a')!.entries.filter((entry) => entry.workshop_id),
  ).toHaveLength(3)
  expect(report.persons.find((p) => p.id === 'per_a')!.workshop_count).toBe(2)
  expect(report.families[0]!.slots[0]!.cells[0]!.entries).toHaveLength(3)
  const overlaps = items({ ...c, plan }, 'workshop-assignment.actual-overlap')
  expect(overlaps).toHaveLength(1)
  expect(overlaps[0]!.evidence.workshop_ids).toEqual(['wks_a', 'wks_b'])
})
