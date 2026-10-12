import { check, fact } from '../../attention/helpers.js'
import type { AttentionContext } from '../../attention/types.js'
import type { OfficialWorkshopsSummary } from '../official-workshops/index.js'
import { workshopEligibilityFailure } from '../official-workshops/eligibility.js'
import type { WorkshopRankingsSummary } from './index.js'
import type { WorkshopSchedulingSection } from '../workshop-scheduling/index.js'
function rankings(c: AttentionContext) {
  return (c.world!.summaries['workshop-rankings'] as WorkshopRankingsSummary).rankings
}

function official(c: AttentionContext) {
  return c.world!.summaries['official-workshops'] as OfficialWorkshopsSummary
}
export function eligible(
  c: AttentionContext,
  person: string,
  workshop: OfficialWorkshopsSummary['workshops'][number],
) {
  const labels = c.world!.labels_by_entity[person] ?? []
  return workshopEligibilityFailure(
    {
      age: (labels.find((l) => l.key === 'age')?.value as number | null) ?? null,
      role: labels.find((l) => l.key === 'role')?.value,
    },
    workshop,
  )
}

export function workshopRankingAttention(maxRank: number) {
  return [
    check(
      'workshop-rankings.choice-not-opened',
      'workshop-rankings',
      ['Workshopwahl noch nicht geöffnet', 'Workshop choice not opened'],
      (c) =>
        c.world!.phase_facts.opened['workshop-rankings.choice']
          ? []
          : [fact(c, [], [], {}, { blocks: ['close-workshops'] })],
      {
        kind: 'information',
        severity: 'info',
        unavailable_blocks: ['close-workshops'],
        scopes: ['allocation', 'closing'],
      },
    ),
    check(
      'workshop-rankings.invalid-response',
      'workshop-rankings',
      ['Workshopantwort widersprüchlich', 'Inconsistent workshop response'],
      (c) =>
        rankings(c)
          .filter((r) => {
            const ranked = r.choices.filter((v) => v.rank !== null)
            const ranks = ranked.map((v) => v.rank!)
            return (
              (ranked.length > 0 && ranked.length !== r.choices.length) ||
              new Set(ranks).size !== ranks.length ||
              new Set(ranked.map((v) => v.workshop_id)).size !== ranked.length ||
              ranks.some((v) => v > maxRank) ||
              [...ranks].sort((a, b) => a - b).some((v, i) => v !== i + 1)
            )
          })
          .map((r) =>
            fact(c, [r.person_id], [r.person_id], {
              choices: r.choices.map((v) => ({ ...v })),
              max_rank: maxRank,
            }),
          ),
      { scopes: ['dashboard', 'family', 'allocation'] },
    ),
    check(
      'workshop-rankings.stale-selection',
      'workshop-rankings',
      ['Auswahl nicht mehr verfügbar', 'Selection unavailable'],
      (c) => {
        const active = new Set(official(c).workshops.map((w) => w.id))
        return c
          .world!.labels.filter((l) =>
            ['prefers-workshop', 'signed-up-for', 'interested-in'].includes(l.key),
          )
          .flatMap((l) => {
            const v = l.value
            const target =
              typeof v === 'string'
                ? v.split(':')[0]
                : v && typeof v === 'object' && !Array.isArray(v)
                  ? v.workshop_id
                  : null
            return typeof target === 'string' && !active.has(target)
              ? [
                  fact(
                    c,
                    [l.entity_id, l.key, target],
                    [l.entity_id, target],
                    { key: l.key, target },
                    {
                      sources: [
                        {
                          kind: 'label',
                          entity_id: l.entity_id,
                          key: l.key,
                          value: l.value,
                          seq: l.set_seq,
                        },
                      ],
                      actions: [
                        {
                          kind: 'clear-label',
                          entity_id: l.entity_id,
                          key: l.key,
                          value: l.value,
                          seq: l.set_seq,
                        },
                      ],
                    },
                  ),
                ]
              : []
          })
      },
      { scopes: ['dashboard', 'family', 'allocation'] },
    ),
    check(
      'workshop-rankings.ineligible-selection',
      'workshop-rankings',
      ['Auswahl passt nicht zur Teilnahme', 'Selection does not match attendance eligibility'],
      (c) => {
        const workshops = new Map(official(c).workshops.map((workshop) => [workshop.id, workshop]))
        return rankings(c).flatMap((r) =>
          r.choices.flatMap((v) => {
            const w = v.workshop_id === null ? undefined : workshops.get(v.workshop_id)
            const reason = w
              ? (eligible(c, r.person_id, w) ??
                (w.mode !== 'assigned' ? 'hard.mode-not-assigned' : null))
              : null
            return w && reason
              ? [fact(c, [r.person_id, w.id], [r.person_id, w.id], { reason })]
              : []
          }),
        )
      },
      { scopes: ['dashboard', 'family', 'allocation'] },
    ),
    check(
      'workshop-rankings.demand',
      'workshop-rankings',
      ['Mehr Wünsche als Plätze', 'More wishes than places'],
      (c) => {
        const demand = new Map<string, Set<string>>()
        for (const ranking of rankings(c))
          for (const choice of ranking.choices) {
            if (choice.workshop_id === null) continue
            const people = demand.get(choice.workshop_id) ?? new Set<string>()
            people.add(ranking.person_id)
            demand.set(choice.workshop_id, people)
          }
        return official(c)
          .workshops.filter((w) => w.mode === 'assigned')
          .flatMap((w) => {
            const count = demand.get(w.id)?.size ?? 0
            return count > w.capacity
              ? [fact(c, [w.id], [w.id], { demand: count, capacity: w.capacity })]
              : []
          })
      },
      { kind: 'information', severity: 'info', scopes: ['workshop', 'allocation'] },
    ),
    check(
      'workshop-rankings.overlap',
      'workshop-rankings',
      ['Gewählte Workshops überschneiden sich', 'Chosen workshops overlap'],
      (c) => {
        const schedule = c.plan!.sections['workshop-scheduling'] as
          | WorkshopSchedulingSection
          | undefined
        if (!schedule) return 'not-applicable'
        const slots = new Map(schedule.placements.map((p) => [p.workshop_id, p.slot_id]))
        const groups = new Map<
          string,
          { a: string; b: string; slot: string; people: Set<string> }
        >()
        for (const r of rankings(c)) {
          const ids = [
            ...new Set(
              r.choices
                .filter((v) => v.rank !== null && v.rank <= maxRank)
                .flatMap((v) => (v.workshop_id ? [v.workshop_id] : [])),
            ),
          ].sort()
          for (let i = 0; i < ids.length; i++)
            for (const b of ids.slice(i + 1)) {
              const a = ids[i]!,
                slot = slots.get(a)
              if (!slot || slots.get(b) !== slot) continue
              const key = JSON.stringify([a, b, slot]),
                group = groups.get(key) ?? { a, b, slot, people: new Set<string>() }
              group.people.add(r.person_id)
              groups.set(key, group)
            }
        }
        return [...groups.values()].map((g) =>
          fact(c, [g.a, g.b, g.slot], [g.a, g.b, ...[...g.people].sort()], {
            workshop_ids: [g.a, g.b],
            person_ids: [...g.people].sort(),
            slot_id: g.slot,
            count: g.people.size,
          }),
        )
      },
      {
        requires: ['world', 'plan'],
        kind: 'information',
        severity: 'info',
        scopes: ['programme', 'allocation'],
      },
    ),
  ]
}
