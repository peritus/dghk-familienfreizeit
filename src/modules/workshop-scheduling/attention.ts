import { check, fact } from '../../attention/helpers.js'
import type { AttentionContext } from '../../attention/types.js'
import type { OfficialWorkshopsSummary } from '../official-workshops/index.js'
import type { WorkshopSchedulingSection } from './index.js'
function section(c: AttentionContext) {
  const s = c.plan!.sections['workshop-scheduling']
  if (!s) throw new Error('missing schedule')
  return s as WorkshopSchedulingSection
}
export const workshopSchedulingAttention = [
  check(
    'workshop-scheduling.unscheduled',
    'workshop-scheduling',
    ['Kurs nicht eingeplant', 'Workshop unscheduled'],
    (c) => {
      const s = section(c)
      const fixed = new Set(s.fixed_violations.map((v) => v.workshop_id))
      const reasonsByWorkshop = new Map<string, Set<string>>()
      for (const entry of c.plan!.trace) {
        if (entry.stage !== 'workshop-scheduling.placement' || entry.step !== 'unscheduled')
          continue
        const reasons = reasonsByWorkshop.get(entry.subject) ?? new Set<string>()
        for (const rejection of entry.detail?.rejected ?? []) reasons.add(rejection.rule)
        reasonsByWorkshop.set(entry.subject, reasons)
      }
      return s.unscheduled
        .filter((v) => !fixed.has(v.workshop_id))
        .map((v) =>
          fact(
            c,
            [v.workshop_id],
            [v.workshop_id],
            {
              reasons: [...(reasonsByWorkshop.get(v.workshop_id) ?? [])].sort(),
              reason: v.reason,
            },
            {
              blocks: ['close-workshops'],
              sources: [{ kind: 'stage', stage: 'workshop-scheduling.placement' }],
            },
          ),
        )
    },
    {
      severity: 'error',
      requires: ['world', 'plan'],
      unavailable_blocks: ['close-workshops'],
      scopes: ['dashboard', 'programme', 'closing', 'print'],
    },
  ),
  check(
    'workshop-scheduling.fixed-invalid',
    'workshop-scheduling',
    ['Feste Platzierung nicht erfüllbar', 'Fixed placement infeasible'],
    (c) =>
      section(c).fixed_violations.map((v) =>
        fact(
          c,
          [v.workshop_id],
          [v.workshop_id, v.slot_id, v.space_id],
          { slot_id: v.slot_id, space_id: v.space_id, reasons: [...v.reasons].sort() },
          { blocks: ['close-workshops'] },
        ),
      ),
    {
      severity: 'error',
      requires: ['world', 'plan'],
      unavailable_blocks: ['close-workshops'],
      scopes: ['dashboard', 'programme', 'closing', 'print'],
    },
  ),
  check(
    'workshop-scheduling.resources-missing',
    'workshop-scheduling',
    ['Räume oder Slots fehlen', 'Spaces or slots missing'],
    (c) => {
      const slots = c.world!.entities_by_kind['workshop-slot'] ?? [],
        spaces = c.world!.entities_by_kind['workshop-space'] ?? []
      return slots.length && spaces.length
        ? []
        : [fact(c, [], [], { slots: slots.length, spaces: spaces.length })]
    },
    { kind: 'information', severity: 'info', scopes: ['programme'] },
  ),
  check(
    'workshop-scheduling.leader-availability',
    'workshop-scheduling',
    ['Externe Leitung zu diesem Slot nicht verfügbar', 'External leader unavailable in this slot'],
    (c) => {
      const s = section(c)
      const o = c.world!.summaries['official-workshops'] as OfficialWorkshopsSummary
      const external = new Map(o.external_leaders.map((l) => [l.id, l]))
      return o.workshops.flatMap((w) => {
        const p = s.placements.find((p) => p.workshop_id === w.id)
        return p
          ? w.leader_ids
              .filter(
                (id) => external.has(id) && !external.get(id)!.availability.includes(p.slot_id),
              )
              .map((id) =>
                fact(c, [w.id, id, p.slot_id], [w.id, id, p.slot_id], {
                  leader_id: id,
                  slot_id: p.slot_id,
                  availability: [...external.get(id)!.availability].sort(),
                }),
              )
          : []
      })
    },
    { requires: ['world', 'plan'], scopes: ['dashboard', 'programme'] },
  ),
]
