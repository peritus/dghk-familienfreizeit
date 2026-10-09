import { check, fact } from '../../attention/helpers.js'
import type { AttentionContext } from '../../attention/types.js'
import type { OfficialWorkshopsSummary } from '../official-workshops/index.js'
import type { WorkshopAssignmentSection } from './index.js'
import type { WorkshopSchedulingSection } from '../workshop-scheduling/index.js'
import type { WorkshopRankingsSummary } from '../workshop-rankings/index.js'
import { eligible } from '../workshop-rankings/attention.js'
function section(c: AttentionContext) {
  const s = c.plan!.sections['workshop-assignment']
  if (!s) throw new Error('missing attendance')
  return s as WorkshopAssignmentSection
}

function official(c: AttentionContext) {
  return c.world!.summaries['official-workshops'] as OfficialWorkshopsSummary
}
export function workshopAssignmentAttention(target: number) {
  return [
    check(
      'workshop-assignment.no-workshops',
      'workshop-assignment',
      ['Keine aktiven Workshops', 'No active workshops'],
      (c) =>
        official(c).workshops.length ? [] : [fact(c, [], [], {}, { blocks: ['close-workshops'] })],
      {
        kind: 'information',
        severity: 'info',
        unavailable_blocks: ['close-workshops'],
        scopes: ['allocation', 'closing'],
      },
    ),
    check(
      'workshop-assignment.fixed-invalid',
      'workshop-assignment',
      ['Feste Teilnahme prüfen', 'Review fixed attendance'],
      (c) =>
        section(c).fixed_violations.map((v) =>
          fact(
            c,
            [v.person_id, v.workshop_id],
            [v.person_id, v.workshop_id],
            { reasons: [...v.reasons].sort() },
            { blocks: ['close-workshops'] },
          ),
        ),
      {
        requires: ['world', 'plan'],
        unavailable_blocks: ['close-workshops'],
        scopes: ['dashboard', 'allocation', 'closing', 'print'],
      },
    ),
    check(
      'workshop-assignment.over-capacity',
      'workshop-assignment',
      ['Mehr Teilnahmen als Plätze', 'More attendance than places'],
      (c) => {
        const s = section(c)
        return official(c).workshops.flatMap((w) => {
          const people = new Set(
            [...s.assignments, ...s.signups]
              .filter((a) => a.workshop_id === w.id)
              .map((a) => a.person_id),
          )
          return people.size > w.capacity
            ? [
                fact(c, [w.id], [w.id], {
                  people: [...people].sort(),
                  attendance: people.size,
                  capacity: w.capacity,
                }),
              ]
            : []
        })
      },
      { requires: ['world', 'plan'], scopes: ['dashboard', 'workshop', 'allocation', 'print'] },
    ),
    check(
      'workshop-assignment.shortfall',
      'workshop-assignment',
      ['Gewählte Teilnahme nicht vollständig zugeordnet', 'Chosen attendance not fully assigned'],
      (c) => {
        const s = section(c),
          r = c.world!.summaries['workshop-rankings'] as WorkshopRankingsSummary
        return r.rankings.flatMap((r) => {
          const asked = [
            ...new Set(r.choices.flatMap((v) => (v.workshop_id ? [v.workshop_id] : []))),
          ].filter((id) => {
            const w = official(c).workshops.find((w) => w.id === id)
            return w?.mode === 'assigned' && !eligible(c, r.person_id, w)
          })
          const fulfilled = asked.filter((id) =>
            s.assignments.some((a) => a.person_id === r.person_id && a.workshop_id === id),
          )
          const expected = Math.min(target, asked.length)
          return fulfilled.length < expected
            ? [
                fact(c, [r.person_id], [r.person_id], {
                  asked: asked.sort(),
                  fulfilled: fulfilled.sort(),
                  expected,
                  reasons: s.rounds.flatMap((round) =>
                    round.decisions
                      .filter((d) => d.person_id === r.person_id && d.outcome === 'rejected')
                      .map((d) => ({ workshop_id: d.workshop_id, reason: d.reason })),
                  ),
                }),
              ]
            : []
        })
      },
      { requires: ['world', 'plan'], scopes: ['dashboard', 'allocation', 'family', 'print'] },
    ),
    check(
      'workshop-assignment.actual-overlap',
      'workshop-assignment',
      ['Gleichzeitige Teilnahme oder Leitung', 'Simultaneous attendance or leadership'],
      (c) => {
        const s = section(c),
          schedule = c.plan!.sections['workshop-scheduling'] as WorkshopSchedulingSection
        const slots = new Map(schedule.placements.map((p) => [p.workshop_id, p.slot_id]))
        const rows = [
          ...s.assignments,
          ...s.signups,
          ...official(c).workshops.flatMap((w) =>
            w.leader_ids.map((personId) => ({ person_id: personId, workshop_id: w.id })),
          ),
        ]
        const groups = new Map<string, { person: string; slot: string; ids: Set<string> }>()
        for (const a of rows) {
          const slot = slots.get(a.workshop_id)
          if (!slot) continue
          const key = JSON.stringify([a.person_id, slot])
          const g = groups.get(key) ?? { person: a.person_id, slot, ids: new Set<string>() }
          g.ids.add(a.workshop_id)
          groups.set(key, g)
        }
        return [...groups.values()]
          .filter((g) => g.ids.size > 1)
          .map((g) =>
            fact(c, [g.person, g.slot], [g.person, ...g.ids], {
              slot_id: g.slot,
              workshop_ids: [...g.ids].sort(),
            }),
          )
      },
      { requires: ['world', 'plan'], scopes: ['dashboard', 'programme', 'allocation', 'print'] },
    ),
    check(
      'workshop-assignment.signup-unscheduled',
      'workshop-assignment',
      ['Anmeldung ohne Programmeintrag', 'Signup without schedule'],
      (c) => {
        const schedule = c.plan!.sections['workshop-scheduling'] as WorkshopSchedulingSection
        return section(c)
          .signups.filter(
            (a) =>
              official(c).workshops.some((w) => w.id === a.workshop_id) &&
              !schedule.placements.some((p) => p.workshop_id === a.workshop_id),
          )
          .map((a) => fact(c, [a.person_id, a.workshop_id], [a.person_id, a.workshop_id], {}))
      },
      { requires: ['world', 'plan'], scopes: ['dashboard', 'allocation', 'programme'] },
    ),
    check(
      'workshop-assignment.ineligible-signup',
      'workshop-assignment',
      ['Anmeldung passt nicht zur Teilnahme', 'Signup does not match attendance eligibility'],
      (c) =>
        section(c).signups.flatMap((a) => {
          const w = official(c).workshops.find((w) => w.id === a.workshop_id)
          const reason = w
            ? (eligible(c, a.person_id, w) ??
              (w.mode !== 'sign-up' ? 'hard.mode-not-assigned' : null))
            : null
          return w && reason ? [fact(c, [a.person_id, w.id], [a.person_id, w.id], { reason })] : []
        }),
      { requires: ['world', 'plan'], scopes: ['dashboard', 'allocation', 'family'] },
    ),
  ]
}
