import { expect, test } from 'vitest'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive, type World } from '../../src/events/fold.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../src/solver/index.js'
import { profileAttention } from '../../src/attention/profile.js'
import { composeAttention, canonical } from '../../src/attention/engine.js'
import { coreAttentionChecks } from '../../src/attention/core.js'
import { phaseAttentionChecks } from '../../src/attention/phases.js'
import { operationalAttentionChecks } from '../../src/attention/operations.js'
import { fieldAttentionChecks } from '../../src/attention/fields.js'
import type { AttentionContext } from '../../src/attention/types.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import type { WorkshopSchedulingSection } from '../../src/modules/workshop-scheduling/index.js'
import type { WorkshopAssignmentSection } from '../../src/modules/workshop-assignment/index.js'
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

const inventory = [
  event('BuildingAdded', { building_id: 'bld_a', name: 'Haus', sort_key: 1 }),
  event('RoomAdded', {
    room_id: 'rm_a',
    building_id: 'bld_a',
    number: '1',
    floor: 'ground',
    room_type: 'standard',
    sort_key: 1,
  }),
  label('rm_a', 'sanitary', 'shared-floor'),
  label('rm_a', 'price-per-bed-eur', 0),
  event('BedAdded', {
    bed_id: 'bed_a',
    room_id: 'rm_a',
    label: '',
    bed_type: 'single',
    sleeps: 1,
    sort_key: 1,
  }),
]
const leader = event('ExternalLeaderAdded', {
  external_leader_id: 'ext_a',
  name: 'Leitung',
  phone: null,
  availability: ['slot_a'],
  sort_key: 1,
})
const choices = [
  label('per_a', 'prefers-workshop', { workshop_id: 'wks_a', rank: 1 }),
  event('WorkshopChoiceOpened', {}),
]
const responses = [
  ...['needs-accessible', 'needs-private-sanitary', 'sole-occupancy'].map((key) =>
    label('fam_a', `response-${key}`, true),
  ),
  label('per_a', 'diet', 'meat'),
]
const authored = workshop('wks_a', 1)
authored.payload = { ...(authored.payload as Record<string, JsonValue>), leader_ids: ['ext_a'] }
const entries = [
  family,
  person('per_a'),
  ...resources,
  leader,
  authored,
  ...choices,
  ...inventory,
  ...responses,
]
const clean = context(entries)
const world = (c: AttentionContext, patch: Partial<World>): AttentionContext => ({
  ...c,
  world: { ...c.world!, ...patch },
})
const section = (id: string, value: unknown): AttentionContext => ({
  ...clean,
  plan: { ...clean.plan!, sections: { ...clean.plan!.sections, [id]: value } },
})
const schedule = (patch: Partial<WorkshopSchedulingSection>) =>
  section('workshop-scheduling', {
    ...(clean.plan!.sections['workshop-scheduling'] as WorkshopSchedulingSection),
    ...patch,
  })
const attendance = (patch: Partial<WorkshopAssignmentSection>) =>
  section('workshop-assignment', {
    ...(clean.plan!.sections['workshop-assignment'] as WorkshopAssignmentSection),
    ...patch,
  })
const cases: Record<string, () => AttentionContext> = {
  'kernel.family-without-persons': () => context([family]),
  'kernel.child-age-missing': () => context([family, person('per_a', 'child', null)]),
  'phase.target-passed': () => ({ ...clean, now: '2028-01-01T00:00:00Z' }),
  'phase.closed': () =>
    world(clean, {
      phase_facts: {
        opened: clean.world!.phase_facts.opened,
        areas: {
          workshops: {
            closings: [],
            latest: { kind: 'closed', seq: 999, at: '2027-01-01T00:00:00Z' },
          },
        },
      },
    }),
  'phase.closed-result-changed': () => ({
    ...clean,
    closed_changes: [
      {
        area: 'workshops',
        seq: 999,
        changes: [{ aspect: 'attendance', before: null, after: 'wks_a' }],
        family_ids: ['fam_a'],
        closed: true,
      },
    ],
  }),
  'official-workshops.capacity-reduction-invalid': () => ({
    ...clean,
    capacity_rejections: [
      { workshop_id: 'wks_a', capacity: 0, attendance: 1, attendance_changed: true },
    ],
  }),
  'official-workshops.zero-capacity': () => context([...entries, label('wks_a', 'capacity', 0)]),
  'official-workshops.age-advisory': () =>
    context([...entries, label('wks_a', 'audience', 'adults'), label('wks_a', 'age-min', 0)]),
  'official-workshops.leader-missing': () =>
    context([
      ...entries,
      event('LabelCleared', { entity_id: 'wks_a', key: 'leader', value: null }),
    ]),
  'official-workshops.leader-unavailable': () =>
    world(clean, { entity_kind_by_id: { ...clean.world!.entity_kind_by_id, ext_a: undefined! } }),
  'workshop-scheduling.unscheduled': () =>
    schedule({ placements: [], unscheduled: [{ workshop_id: 'wks_a', reason: 'hard.capacity' }] }),
  'workshop-scheduling.fixed-invalid': () =>
    schedule({
      fixed_violations: [
        {
          workshop_id: 'wks_a',
          slot_id: 'slot_a',
          space_id: 'wsp_a',
          reasons: ['hard.space-capacity'],
        },
      ],
    }),
  'workshop-scheduling.resources-missing': () =>
    context([family, person('per_a'), leader, authored]),
  'workshop-scheduling.leader-availability': () =>
    context([
      ...entries,
      event('LabelCleared', {
        entity_id: 'ext_a',
        key: 'external-leader-availability',
        value: null,
      }),
    ]),
  'workshop-rankings.choice-not-opened': () =>
    world(clean, { phase_facts: { ...clean.world!.phase_facts, opened: {} } }),
  'workshop-rankings.response-missing': () => context(entries.filter((e) => e !== choices[0])),
  'workshop-rankings.invalid-response': () =>
    context([...entries, label('per_a', 'prefers-workshop', { workshop_id: null, rank: null })]),
  'workshop-rankings.stale-selection': () =>
    context([
      ...entries,
      label('per_a', 'prefers-workshop', { workshop_id: 'wks_retired', rank: 2 }),
    ]),
  'workshop-rankings.ineligible-selection': () =>
    context([...entries, label('wks_a', 'age-min', 50)]),
  'workshop-rankings.demand': () => context([...entries, label('wks_a', 'capacity', 0)]),
  'workshop-rankings.overlap': () => {
    const c = context([
      ...entries,
      workshop('wks_b'),
      label('per_a', 'prefers-workshop', { workshop_id: 'wks_b', rank: 2 }),
    ])
    return {
      ...c,
      plan: {
        ...c.plan!,
        sections: {
          ...c.plan!.sections,
          'workshop-scheduling': {
            ...(c.plan!.sections['workshop-scheduling'] as WorkshopSchedulingSection),
            placements: [
              { workshop_id: 'wks_a', slot_id: 'slot_a', space_id: 'wsp_a' },
              { workshop_id: 'wks_b', slot_id: 'slot_a', space_id: 'wsp_b' },
            ],
          },
        },
      },
    }
  },
  'workshop-assignment.no-workshops': () => context([family, person('per_a')]),
  'workshop-assignment.fixed-invalid': () =>
    attendance({
      fixed_violations: [{ person_id: 'per_a', workshop_id: 'wks_a', reasons: ['hard.capacity'] }],
    }),
  'workshop-assignment.over-capacity': () =>
    attendance({ signups: [{ person_id: 'per_b', workshop_id: 'wks_a' }] }),
  'workshop-assignment.shortfall': () => context([...entries, label('wks_a', 'capacity', 0)]),
  'workshop-assignment.actual-overlap': () => {
    const c = cases['workshop-rankings.overlap']!()
    return {
      ...c,
      plan: {
        ...c.plan!,
        sections: {
          ...c.plan!.sections,
          'workshop-assignment': {
            ...(c.plan!.sections['workshop-assignment'] as WorkshopAssignmentSection),
            signups: [{ person_id: 'per_a', workshop_id: 'wks_b' }],
          },
        },
      },
    }
  },
  'workshop-assignment.signup-unscheduled': () =>
    attendance({ signups: [{ person_id: 'per_a', workshop_id: 'wks_a' }], assignments: [] }),
  'workshop-assignment.ineligible-signup': () =>
    attendance({ signups: [{ person_id: 'per_a', workshop_id: 'wks_a' }] }),
  'room-inventory.room-without-places': () => context(entries.filter((e) => e.type !== 'BedAdded')),
  'room-assignment.no-families': () => context([]),
  'room-assignment.no-capacity': () => context(entries.filter((e) => e.type !== 'BedAdded')),
  'room-assignment.requirement-arithmetic': () => context([...entries, person('per_b')]),
  'room-assignment.required-contradiction': () =>
    context([...entries, label('fam_a', 'excludes', 'rm_a', 'required')]),
  'room-assignment.unplaced-family': () => context([...entries, person('per_b')]),
  'room-assignment.fixed-invalid': () =>
    section('room-assignment', {
      ...(clean.plan!.sections['room-assignment'] as object),
      fixed_violations: [
        {
          family_id: 'fam_a',
          room_id: 'rm_a',
          reasons: ['hard.room-unavailable'],
          unplaced_person_ids: ['per_a'],
        },
      ],
    }),
  'room-assignment.place-shortfall': () => context([...entries, person('per_b')]),
  'room-assignment.total-shortfall': () => context([...entries, person('per_b')]),
  'room-assignment.capability-shortfall': () =>
    context([...entries, label('fam_a', 'needs-accessible', 'accessible', 'required')]),
  'room-assignment.unmet-preference': () =>
    context([...entries, label('fam_a', 'needs-accessible', 'accessible', 'preferred')]),
  'family-preferences.response-missing': () =>
    context(
      entries.filter(
        (e) =>
          !(
            e.type === 'LabelSet' &&
            (e.payload as Record<string, JsonValue>).key === 'response-needs-accessible'
          ),
      ),
    ),
  'family-preferences.response-inconsistent': () =>
    context([...entries, label('fam_a', 'needs-accessible', 'accessible', 'preferred')]),
  'family-preferences.late-save': () =>
    context([
      ...entries,
      { ...label('fam_a', 'response-needs-accessible', true), at: '2027-05-01T00:00:00Z' },
    ]),
}
// A signup without a schedule uses actual schedule absence, not an attendance classifier.
cases['workshop-assignment.signup-unscheduled'] = () => {
  const c = attendance({ signups: [{ person_id: 'per_a', workshop_id: 'wks_a' }], assignments: [] })
  return {
    ...c,
    plan: {
      ...c.plan!,
      sections: {
        ...c.plan!.sections,
        'workshop-scheduling': {
          ...(clean.plan!.sections['workshop-scheduling'] as WorkshopSchedulingSection),
          placements: [],
        },
      },
    },
  }
}
for (const check of coreAttentionChecks.filter((check) => !cases[check.code]))
  cases[check.code] = () =>
    world(clean, {
      diagnostics: [
        {
          id: check.code,
          subject_id: 'per_a',
          severity: 'warning',
          message: 'internal text is never presentation',
          evidence: { key: 'unknown', value: true, seq: 1 },
        },
      ],
    })
for (const check of operationalAttentionChecks)
  cases[check.code] = () => ({
    ...clean,
    operations: [
      {
        id: 'request',
        code: check.code.slice('operation.'.length) as NonNullable<
          AttentionContext['operations']
        >[number]['code'],
      },
    ],
  })
for (const check of fieldAttentionChecks)
  cases[check.code] = () => ({
    ...clean,
    operations: [
      {
        id: 'input',
        code: 'invalid-field',
        validation_code: check.code.slice('input.'.length) as NonNullable<
          AttentionContext['operations']
        >[number]['validation_code'],
      },
    ],
  })
const checks = [
  ...coreAttentionChecks,
  ...phaseAttentionChecks,
  ...operationalAttentionChecks,
  ...fieldAttentionChecks,
  ...profile.modules.flatMap((m) => m.contributions.attention_checks ?? []),
]
test('the catalogue accounts for every loaded check exactly once', () => {
  expect(Object.keys(cases).sort()).toEqual(checks.map((check) => check.code).sort())
  expect(evaluator(clean).coverage.every((entry) => entry.state !== 'unavailable')).toBe(true)
})
for (const check of checks)
  test(`${check.code}: trigger, resolution, identity, locale, prospective basis, privacy and missing input`, () => {
    const evaluate = composeAttention([check]),
      trigger = cases[check.code]!(),
      before = canonical(trigger)
    const result = evaluate(trigger)
    expect(result.coverage[0]!.state).toBe('evaluated')
    expect(result.items.length).toBeGreaterThan(0)
    expect(evaluate(clean).items.filter((i) => i.code === check.code)).toEqual([])
    expect(evaluate(trigger)).toEqual(result)
    expect(canonical(trigger)).toBe(before)
    const en = evaluate({ ...trigger, locale: 'en' })
    expect(en.items.map((i) => i.id)).toEqual(result.items.map((i) => i.id))
    for (const item of en.items) {
      expect(item.wording.title).toBeTruthy()
      expect(item.wording.detail).toBeTruthy()
      expect(canonical(item.wording)).not.toContain('internal text')
    }
    const prospective = evaluate({
      ...trigger,
      basis: { mode: 'prospective', group_ids: ['group-1'] },
    })
    expect(prospective.items.map((i) => i.id)).toEqual(result.items.map((i) => i.id))
    expect(prospective.items.every((i) => i.basis.mode === 'prospective')).toBe(true)
    expect(
      evaluate({ ...trigger, audience: 'family', rejected_findings: result.items }).items,
    ).toEqual([])
    if (check.requires.length) {
      expect(
        evaluate({ ...trigger, world: null, plan: null, domain: 'failed' }).coverage[0]!.state,
      ).toBe('unavailable')
    }
  })

test('repeated operation and field occurrences have distinct natural identities', () => {
  for (const check of [...operationalAttentionChecks, ...fieldAttentionChecks]) {
    const c = cases[check.code]!(),
      operation = c.operations![0]!
    const result = composeAttention([check])({
      ...c,
      operations: [operation, { ...operation, id: 'second', group_id: 'group-2' }],
    })
    expect(result.items).toHaveLength(2)
    expect(result.items[0]!.id).not.toBe(result.items[1]!.id)
  }
})
test('notes never become any catalogue check wording or evidence', () => {
  for (const check of checks) {
    const c = cases[check.code]!()
    if (!c.world) continue
    const withNotes = world(c, {
      labels: c.world.labels.map((label) => ({ ...label, note: 'restricted-secret-note' })),
    })
    expect(canonical(composeAttention([check])(withNotes).items)).not.toContain(
      'restricted-secret-note',
    )
  }
})

test('closing advisories explain their cause in both locales', () => {
  const context = cases['official-workshops.age-advisory']!()
  const german = evaluator(context).items.find(
    (item) => item.code === 'official-workshops.age-advisory',
  )!
  const english = evaluator({ ...context, locale: 'en' }).items.find(
    (item) => item.code === 'official-workshops.age-advisory',
  )!
  expect(german.wording.detail).toContain('Mindestalter liegt unter 16')
  expect(english.wording.detail).toContain('minimum age is below 16')
  expect(german.wording.detail).not.toBe(german.wording.title)
  expect(german.id).toBe(english.id)
})

test('requested response wording names its configured field without changing identity', () => {
  const context = cases['family-preferences.response-missing']!()
  const finding = evaluator(context).items.find(
    (item) => item.code === 'family-preferences.response-missing',
  )!
  expect(finding.wording.title).not.toBe('Antwort nicht dokumentiert')
  expect(finding.wording.title).toContain(': Antwort nicht dokumentiert')
  expect(
    evaluator({ ...context, locale: 'en' }).items.find((item) => item.id === finding.id)?.wording
      .title,
  ).toContain(': Response not recorded')
})
