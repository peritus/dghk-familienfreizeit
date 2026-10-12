import { check, fact } from '../../attention/helpers.js'
import type { AttentionContext } from '../../attention/types.js'
import type { RoomAssignmentParams, RoomAssignmentSection } from './index.js'
import { buildRoomAssignmentInput } from './index.js'
function section(c: AttentionContext) {
  const s = c.plan!.sections['room-assignment']
  if (!s) throw new Error('missing room plan')
  return s as RoomAssignmentSection
}
export function roomAssignmentAttention(params: RoomAssignmentParams) {
  const cache = new WeakMap<
    NonNullable<AttentionContext['world']>,
    ReturnType<typeof buildRoomAssignmentInput>
  >()
  const input = (c: AttentionContext) => {
    const world = c.world!
    let value = cache.get(world)
    if (!value) {
      value = buildRoomAssignmentInput(world, params)
      cache.set(world, value)
    }
    return value
  }
  return [
    check(
      'room-assignment.no-families',
      'room-assignment',
      ['Keine Familien eingetragen', 'No families registered'],
      (c) =>
        c.world!.families.length ? [] : [fact(c, [], [], {}, { blocks: ['close-accommodation'] })],
      {
        kind: 'information',
        severity: 'info',
        unavailable_blocks: ['close-accommodation'],
        scopes: ['accommodation', 'closing'],
      },
    ),
    check(
      'room-assignment.no-capacity',
      'room-assignment',
      ['Keine nutzbaren Schlafplätze', 'No usable sleeping places'],
      (c) => {
        const i = input(c)
        const capacity = i.rooms.reduce((n, r) => n + r.capacity, 0)
        return capacity ? [] : [fact(c, [], [], { capacity }, { blocks: ['close-accommodation'] })]
      },
      {
        severity: 'error',
        unavailable_blocks: ['close-accommodation'],
        scopes: ['dashboard', 'accommodation', 'closing'],
      },
    ),
    ...(['requirement-arithmetic', 'required-contradiction'] as const).map((code) =>
      check(
        `room-assignment.${code}`,
        'room-assignment',
        code === 'requirement-arithmetic'
          ? ['Benötigte Schlafplätze nicht verfügbar', 'Required sleeping places unavailable']
          : ['Kein Zimmer erfüllt die Anforderungen', 'No room satisfies requirements'],
        (c) =>
          c
            .plan!.preflight.filter((f) => f.check === `room-assignment.${code}`)
            .map((f) =>
              fact(
                c,
                [f.subjects[0] ?? null, f.evidence?.trait ?? f.evidence?.capability ?? null],
                f.subjects.filter((id) => c.world!.entity_kind_by_id[id]),
                f.evidence ?? {},
                {
                  blocks: ['close-accommodation'],
                  sources: [{ kind: 'stage', stage: 'room-assignment.place' }],
                },
              ),
            ),
        {
          requires: ['world', 'plan'],
          severity: 'error',
          unavailable_blocks: ['close-accommodation'],
          scopes: ['dashboard', 'accommodation', 'closing'],
        },
      ),
    ),
    check(
      'room-assignment.unplaced-family',
      'room-assignment',
      ['Familie ohne Zimmer', 'Family without room'],
      (c) =>
        section(c).unplaced.map((f) =>
          fact(
            c,
            [f.family_id],
            [f.family_id],
            { person_ids: [...f.person_ids] },
            { sources: [{ kind: 'stage', stage: 'room-assignment.place' }] },
          ),
        ),
      { requires: ['world', 'plan'], scopes: ['dashboard', 'accommodation', 'print'] },
    ),
    check(
      'room-assignment.fixed-invalid',
      'room-assignment',
      ['Feste Zimmerentscheidung prüfen', 'Review fixed room decision'],
      (c) =>
        (section(c).fixed_violations ?? []).map((v) =>
          fact(
            c,
            [v.family_id, v.room_id],
            [v.family_id, v.room_id],
            {
              reasons: [...v.reasons].sort(),
              unplaced_person_ids: [...v.unplaced_person_ids].sort(),
            },
            { blocks: ['close-accommodation'] },
          ),
        ),
      {
        requires: ['world', 'plan'],
        unavailable_blocks: ['close-accommodation'],
        scopes: ['dashboard', 'accommodation', 'closing', 'print'],
      },
    ),
    check(
      'room-assignment.place-shortfall',
      'room-assignment',
      ['Schlafplätze fehlen bei der Belegung', 'Sleeping places missing in placement'],
      (c) => {
        const i = input(c),
          s = section(c)
        const assignedByFamily = new Map<string, number>()
        for (const assignment of s.assignments)
          if (assignment.place_id !== null)
            assignedByFamily.set(
              assignment.family_id,
              (assignedByFamily.get(assignment.family_id) ?? 0) + 1,
            )
        return i.families.flatMap((f) => {
          const actual = assignedByFamily.get(f.family_id) ?? 0
          return actual < f.bed_demand
            ? [
                fact(c, [f.family_id], [f.family_id], {
                  demand: f.bed_demand,
                  actual,
                  shortfall: f.bed_demand - actual,
                }),
              ]
            : []
        })
      },
      { requires: ['world', 'plan'], scopes: ['dashboard', 'accommodation', 'print'] },
    ),
    check(
      'room-assignment.total-shortfall',
      'room-assignment',
      ['Insgesamt zu wenige Schlafplätze', 'Overall sleeping place shortfall'],
      (c) => {
        const i = input(c),
          demand = i.families.reduce((n, f) => n + f.bed_demand, 0),
          capacity = i.rooms.reduce((n, r) => n + r.capacity, 0)
        return demand > capacity
          ? [fact(c, [], [], { demand, capacity, shortfall: demand - capacity })]
          : []
      },
      { scopes: ['dashboard', 'accommodation'] },
    ),
    check(
      'room-assignment.capability-shortfall',
      'room-assignment',
      [
        'Zu wenige Plätze mit benötigter Ausstattung',
        'Insufficient places with required capability',
      ],
      (c) => {
        const i = input(c),
          demand = new Map<string, number>()
        for (const f of i.families)
          for (const cap of new Set(
            f.requirements
              .filter((r) => r.strength === 'required' && r.capability_key)
              .map((r) => r.capability_key!),
          ))
            demand.set(cap, (demand.get(cap) ?? 0) + f.bed_demand)
        return [...demand].flatMap(([cap, d]) => {
          const capacity = i.rooms
            .filter((r) => r.capabilities.has(cap))
            .reduce((n, r) => n + r.capacity, 0)
          return d > capacity
            ? [
                fact(c, [cap], [], {
                  capability: cap,
                  demand: d,
                  capacity,
                  shortfall: d - capacity,
                }),
              ]
            : []
        })
      },
      { scopes: ['dashboard', 'accommodation'] },
    ),
  ]
}
