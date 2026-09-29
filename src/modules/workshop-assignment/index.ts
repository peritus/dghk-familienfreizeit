import { z } from 'zod'
import { defineModule } from '../define.js'
import type { JsonValue } from '../../events/types.js'
import type { SolverInput, SolverStage, StageResult, TraceEntry } from '../../solver/types.js'
import type {
  OfficialWorkshopsSummary,
  WorkshopMode,
  WorkshopRecord,
} from '../official-workshops/index.js'
import type { WorkshopSchedulingSection } from '../workshop-scheduling/index.js'
import type { WorkshopRanking } from '../workshop-rankings/index.js'

export type WorkshopAssignmentParams = {
  top_n: number
  rank_weights: readonly number[]
  minimum_workshops: number
  fairness_targets: Readonly<Record<string, number>>
  fill_unassigned: boolean
  max_repair_passes: number
}

export type WorkshopAssignment = {
  person_id: string
  workshop_id: string
  slot_id: string
  rank: number | null
  reason: 'ranked' | 'fill' | 'fixed' | 'retained' | 'repaired'
}

export type WorkshopUnassigned = { person_id: string; workshop_id: string | null; reason: string }

export type WorkshopFixed = { person_id: string; workshop_id: string }

export type WorkshopFixedViolation = WorkshopFixed & { reasons: readonly string[] }

export type WorkshopRetentionDrop = {
  person_id: string
  workshop_id: string
  slot_id: string
  reason: string
}

export type WorkshopAssignmentSection = {
  assignments: readonly WorkshopAssignment[]
  unassigned: readonly WorkshopUnassigned[]
  signups: readonly { person_id: string; workshop_id: string }[]
  interests: readonly { person_id: string; workshop_id: string }[]
  fixed: readonly WorkshopFixed[]
  fixed_violations: readonly WorkshopFixedViolation[]
  retention_drops: readonly WorkshopRetentionDrop[]
}

function labelValue(input: SolverInput, entityId: string, key: string): JsonValue | undefined {
  return input.labels.find((label) => label.entity_id === entityId && label.key === key)?.value
}

function eligibleRole(personRole: JsonValue | undefined, workshop: WorkshopRecord): boolean {
  if (workshop.audience === 'children') return personRole === 'child'
  if (workshop.audience === 'adults') return personRole === 'adult'
  return true
}

function assignmentStage(params: WorkshopAssignmentParams): SolverStage<WorkshopAssignmentSection> {
  return {
    id: 'workshop-assignment.attendance',
    after: ['workshop-scheduling.placement', 'workshop-rankings.demand'],
    before: [],
    reads: ['workshop-scheduling.placement', 'workshop-rankings.demand'],
    run: (input: SolverInput, upstream): StageResult<WorkshopAssignmentSection> => {
      const schedule = upstream['workshop-scheduling.placement'] as WorkshopSchedulingSection
      const rankingOutput = upstream['workshop-rankings.demand'] as {
        rankings: readonly WorkshopRanking[]
      }
      const official = input.module_inputs['official-workshops'] as OfficialWorkshopsSummary
      const workshops = new Map(official.workshops.map((workshop) => [workshop.id, workshop]))
      const placements = new Map(
        schedule.placements.map((placement) => [placement.workshop_id, placement]),
      )
      const usedBySlot = new Map<string, Set<string>>()
      const counts = new Map<string, number>()
      const assignedCount = new Map<string, number>()
      const assignments: WorkshopAssignment[] = []
      const unassigned: WorkshopUnassigned[] = []
      const trace: TraceEntry[] = []
      const assignedPeople = input.persons.slice().sort((a, b) => a.id.localeCompare(b.id))
      const rankingByPerson = new Map(
        rankingOutput.rankings.map((ranking) => [ranking.person_id, ranking]),
      )
      const previous = input.previous_plan?.sections['workshop-assignment'] as
        | WorkshopAssignmentSection
        | undefined
      // A person leading any workshop cannot also attend a different one in
      // the same slot. Built from static leader/placement data, not
      // assignment order, so it applies uniformly to every placement path.
      const leaderSlots = new Map<string, Set<string>>()
      for (const workshop of official.workshops) {
        const slotId = placements.get(workshop.id)?.slot_id
        if (!slotId) continue
        for (const leaderId of workshop.leader_ids) {
          const slots = leaderSlots.get(leaderId) ?? new Set<string>()
          slots.add(slotId)
          leaderSlots.set(leaderId, slots)
        }
      }
      const place = (
        personId: string,
        workshop: WorkshopRecord,
        rank: number | null,
        reason: WorkshopAssignment['reason'],
      ): boolean => {
        const rejection = rejectionReason(personId, workshop)
        if (rejection) return false
        const placement = placements.get(workshop.id)!
        const count = counts.get(workshop.id) ?? 0
        counts.set(workshop.id, count + 1)
        const peopleAtSlot = usedBySlot.get(placement.slot_id) ?? new Set<string>()
        peopleAtSlot.add(personId)
        usedBySlot.set(placement.slot_id, peopleAtSlot)
        assignedCount.set(personId, (assignedCount.get(personId) ?? 0) + 1)
        assignments.push({
          person_id: personId,
          workshop_id: workshop.id,
          slot_id: placement.slot_id,
          rank,
          reason,
        })
        trace.push({
          stage: 'workshop-assignment.attendance',
          step: reason,
          subject: personId,
          text: `${personId} → ${workshop.id}`,
          detail: {
            chosen: {
              target: workshop.id,
              score: rank === null ? 0 : (params.rank_weights[rank - 1] ?? 0),
              terms: [[reason, rank ?? 0]],
            },
          },
        })
        return true
      }
      const rejectionReason = (personId: string, workshop: WorkshopRecord): string | null => {
        const placement = placements.get(workshop.id)
        if (!placement || workshop.cancelled) return 'hard.cancellation'
        if (workshop.mode !== 'assigned') return 'hard.mode-not-assigned'
        if (leaderSlots.get(personId)?.has(placement.slot_id)) return 'hard.leader-conflict'
        if (!eligibleRole(labelValue(input, personId, 'role'), workshop)) return 'hard.eligibility'
        if ((counts.get(workshop.id) ?? 0) >= workshop.capacity) return 'hard.capacity'
        if (usedBySlot.get(placement.slot_id)?.has(personId)) return 'hard.overlap'
        return null
      }

      // Step 1: apply feasible fixed attendance decisions first — they always
      // take precedence over automatic (retained/ranked/fill) choices, so they
      // claim capacity before anything else runs.
      const fixed = input.labels
        .filter((label) => label.key === 'workshop-attendance' && typeof label.value === 'string')
        .map((label) => ({ person_id: label.entity_id, workshop_id: String(label.value) }))
        .sort(
          (a, b) =>
            a.person_id.localeCompare(b.person_id) || a.workshop_id.localeCompare(b.workshop_id),
        )
      const fixedViolations: WorkshopFixedViolation[] = []
      for (const decision of fixed) {
        const workshop = workshops.get(decision.workshop_id)
        if (!workshop) {
          fixedViolations.push({ ...decision, reasons: ['hard.cancellation'] })
          continue
        }
        if (!place(decision.person_id, workshop, null, 'fixed')) {
          const reason = rejectionReason(decision.person_id, workshop) ?? 'hard.capacity'
          fixedViolations.push({ ...decision, reasons: [reason] })
        }
      }

      // Step 2: retain every still-feasible prior assignment for anyone with
      // no fixed decision this cycle, before any new ranking/fill decision
      // runs. A person may have retained more than one prior assignment
      // (e.g. minimum_workshops > 1) — every one of them is considered, not
      // just the first found.
      const fixedPersonIds = new Set(fixed.map(({ person_id: personId }) => personId))
      const retentionDrops: WorkshopRetentionDrop[] = []
      const drop = (personId: string, workshopId: string, slotId: string, reason: string): void => {
        retentionDrops.push({
          person_id: personId,
          workshop_id: workshopId,
          slot_id: slotId,
          reason,
        })
        trace.push({
          stage: 'workshop-assignment.attendance',
          step: 'retention-drop',
          subject: personId,
          text: `${personId} not retained in ${workshopId}: ${reason}`,
        })
      }
      if (previous)
        for (const person of assignedPeople) {
          if (fixedPersonIds.has(person.id)) continue
          const priorAssignments = previous.assignments.filter(
            ({ person_id: personId }) => personId === person.id,
          )
          for (const prior of priorAssignments) {
            const priorWorkshop = workshops.get(prior.workshop_id)
            if (!priorWorkshop) {
              drop(person.id, prior.workshop_id, prior.slot_id, 'hard.cancellation')
              continue
            }
            const currentPlacement = placements.get(priorWorkshop.id)
            if (!currentPlacement || currentPlacement.slot_id !== prior.slot_id) {
              drop(person.id, prior.workshop_id, prior.slot_id, 'hard.schedule-changed')
              continue
            }
            const stillRanked = rankingByPerson
              .get(person.id)
              ?.choices.some(
                (choice) => choice.workshop_id === prior.workshop_id && choice.rank !== null,
              )
            if (!stillRanked) {
              drop(person.id, prior.workshop_id, prior.slot_id, 'hard.no-longer-ranked')
              continue
            }
            if (!place(person.id, priorWorkshop, null, 'retained')) {
              const failure = rejectionReason(person.id, priorWorkshop) ?? 'hard.capacity'
              drop(person.id, prior.workshop_id, prior.slot_id, failure)
            }
          }
        }

      // Steps 3–4: ranked choices, then fill remaining minimums.
      for (const person of assignedPeople) {
        const ranking = rankingByPerson.get(person.id)
        const rankedChoices =
          ranking?.choices
            .filter((choice) => choice.workshop_id && choice.rank !== null)
            .slice()
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) ?? []
        let assigned = assignedCount.get(person.id) ?? 0
        for (const choice of rankedChoices) {
          if (assigned >= params.minimum_workshops && (choice.rank ?? 0) > params.top_n) break
          const workshop = choice.workshop_id ? workshops.get(choice.workshop_id) : undefined
          if (!workshop || !place(person.id, workshop, choice.rank, 'ranked')) continue
          assigned += 1
        }
        if (assigned < params.minimum_workshops && params.fill_unassigned) {
          const candidates = official.workshops
            .filter(
              (workshop) =>
                workshop.mode === 'assigned' &&
                !workshop.cancelled &&
                eligibleRole(labelValue(input, person.id, 'role'), workshop) &&
                !assignments.some(
                  (item) =>
                    item.person_id === person.id &&
                    item.slot_id === placements.get(workshop.id)?.slot_id,
                ),
            )
            .sort(
              (a, b) =>
                (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) ||
                a.sort_key - b.sort_key ||
                a.id.localeCompare(b.id),
            )
          for (const workshop of candidates)
            if (assigned < params.minimum_workshops && place(person.id, workshop, null, 'fill'))
              assigned += 1
        }
      }

      // Step 5: bounded deterministic repair — try to seat a still-unassigned
      // person by moving one non-fixed occupant to a different eligible
      // workshop with spare capacity. Never touches a 'fixed' assignment.
      const unplace = (item: WorkshopAssignment): void => {
        const index = assignments.indexOf(item)
        if (index === -1) return
        assignments.splice(index, 1)
        counts.set(item.workshop_id, (counts.get(item.workshop_id) ?? 1) - 1)
        usedBySlot.get(item.slot_id)?.delete(item.person_id)
        assignedCount.set(item.person_id, (assignedCount.get(item.person_id) ?? 1) - 1)
      }
      const stillUnassigned = () =>
        assignedPeople.filter((person) => (assignedCount.get(person.id) ?? 0) === 0)
      for (let pass = 0; pass < params.max_repair_passes; pass += 1) {
        let repaired = false
        for (const person of stillUnassigned()) {
          const candidateWorkshops = official.workshops.filter(
            (workshop) =>
              workshop.mode === 'assigned' &&
              !workshop.cancelled &&
              eligibleRole(labelValue(input, person.id, 'role'), workshop),
          )
          for (const workshop of candidateWorkshops) {
            const occupant = assignments.find(
              (item) => item.workshop_id === workshop.id && item.reason !== 'fixed',
            )
            if (!occupant) continue
            const occupantWorkshop = workshops.get(occupant.workshop_id)!
            const occupantRank = occupant.rank
            const occupantReason = occupant.reason
            // Tentatively vacate the occupant's seat before checking for an
            // alternative — otherwise their own current slot always looks
            // "occupied" to the overlap check, even when the alternative is
            // that same slot's other workshop.
            unplace(occupant)
            const alternative = official.workshops.find(
              (candidate) =>
                candidate.id !== workshop.id &&
                candidate.mode === 'assigned' &&
                !candidate.cancelled &&
                eligibleRole(labelValue(input, occupant.person_id, 'role'), candidate) &&
                rejectionReason(occupant.person_id, candidate) === null,
            )
            if (
              alternative &&
              place(person.id, workshop, null, 'repaired') &&
              place(occupant.person_id, alternative, occupantRank, 'repaired')
            ) {
              repaired = true
              break
            }
            // No usable alternative, or the repair could not be completed — re-seat the occupant.
            place(occupant.person_id, occupantWorkshop, occupantRank, occupantReason)
          }
          if (repaired) break
        }
        if (!repaired) break
      }

      for (const person of assignedPeople)
        if ((assignedCount.get(person.id) ?? 0) === 0)
          unassigned.push({
            person_id: person.id,
            workshop_id: null,
            reason: rankingByPerson.has(person.id)
              ? 'no eligible capacity'
              : 'no current workshop choice',
          })
      const signups = input.labels
        .filter((label) => label.key === 'signed-up-for' && typeof label.value === 'string')
        .map((label) => ({ person_id: label.entity_id, workshop_id: String(label.value) }))
      const interests = input.labels
        .filter((label) => label.key === 'interested-in' && typeof label.value === 'string')
        .map((label) => ({ person_id: label.entity_id, workshop_id: String(label.value) }))
      return {
        output: {
          assignments,
          unassigned,
          signups,
          interests,
          fixed: Object.freeze(fixed),
          fixed_violations: Object.freeze(fixedViolations),
          retention_drops: Object.freeze(retentionDrops),
        },
        trace,
        diagnostics: Object.freeze(
          fixedViolations.map((violation) => ({
            check: 'workshop-assignment.fixed-invalid' as const,
            severity: 'warning' as const,
            subjects: [violation.person_id, violation.workshop_id],
            text: `${violation.person_id} fixed in ${violation.workshop_id}: ${violation.reasons.join(', ')}`,
          })),
        ),
      }
    },
  }
}

export const workshopAssignment = defineModule<WorkshopAssignmentParams>({
  id: 'workshop-assignment',
  requires: ['official-workshops', 'workshop-rankings', 'workshop-scheduling'],
  params: z.object({
    top_n: z.number().int().min(1).default(2),
    rank_weights: z.array(z.number().int()).min(1).default([3, 2, 1]),
    minimum_workshops: z.number().int().min(0).default(0),
    fairness_targets: z.record(z.string(), z.number().int().min(0)).default({}),
    fill_unassigned: z.boolean().default(true),
    max_repair_passes: z.number().int().min(0).default(5),
  }),
  contribute: (params) => ({
    stages: [assignmentStage(params)],
    reports: [
      { id: 'workshop-roster' },
      { id: 'workshop-person-plan' },
      { id: 'workshop-family-plan' },
      { id: 'workshop-space-plan' },
    ],
  }),
})

export function workshopAssignmentSection(plan: {
  sections: Readonly<Record<string, unknown>>
}): WorkshopAssignmentSection {
  return (
    (plan.sections['workshop-assignment'] as WorkshopAssignmentSection | undefined) ?? {
      assignments: [],
      unassigned: [],
      signups: [],
      interests: [],
      fixed: [],
      fixed_violations: [],
      retention_drops: [],
    }
  )
}

export type { WorkshopMode }
