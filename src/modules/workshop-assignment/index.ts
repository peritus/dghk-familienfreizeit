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
  reason: 'ranked' | 'fill' | 'fixed'
}

export type WorkshopUnassigned = { person_id: string; workshop_id: string | null; reason: string }

export type WorkshopAssignmentSection = {
  assignments: readonly WorkshopAssignment[]
  unassigned: readonly WorkshopUnassigned[]
  signups: readonly { person_id: string; workshop_id: string }[]
  interests: readonly { person_id: string; workshop_id: string }[]
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
      const assignments: WorkshopAssignment[] = []
      const unassigned: WorkshopUnassigned[] = []
      const trace: TraceEntry[] = []
      const assignedPeople = input.persons.slice().sort((a, b) => a.id.localeCompare(b.id))
      const rankingByPerson = new Map(
        rankingOutput.rankings.map((ranking) => [ranking.person_id, ranking]),
      )
      const place = (
        personId: string,
        workshop: WorkshopRecord,
        rank: number | null,
        reason: WorkshopAssignment['reason'],
      ): boolean => {
        const placement = placements.get(workshop.id)
        if (!placement || workshop.mode !== 'assigned') return false
        const count = counts.get(workshop.id) ?? 0
        if (count >= workshop.capacity) return false
        const peopleAtSlot = usedBySlot.get(placement.slot_id) ?? new Set<string>()
        if (peopleAtSlot.has(personId)) return false
        counts.set(workshop.id, count + 1)
        peopleAtSlot.add(personId)
        usedBySlot.set(placement.slot_id, peopleAtSlot)
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
      for (const person of assignedPeople) {
        const ranking = rankingByPerson.get(person.id)
        const rankedChoices =
          ranking?.choices
            .filter((choice) => choice.workshop_id && choice.rank !== null)
            .slice()
            .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) ?? []
        let assigned = 0
        for (const choice of rankedChoices) {
          if (assigned >= params.minimum_workshops && (choice.rank ?? 0) > params.top_n) break
          const workshop = choice.workshop_id ? workshops.get(choice.workshop_id) : undefined
          if (
            !workshop ||
            workshop.cancelled ||
            !eligibleRole(labelValue(input, person.id, 'role'), workshop) ||
            !place(person.id, workshop, choice.rank, 'ranked')
          )
            continue
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
        if (assigned === 0)
          unassigned.push({
            person_id: person.id,
            workshop_id: null,
            reason: ranking ? 'no eligible capacity' : 'no current workshop choice',
          })
      }
      const signups = input.labels
        .filter((label) => label.key === 'signed-up-for' && typeof label.value === 'string')
        .map((label) => ({ person_id: label.entity_id, workshop_id: String(label.value) }))
      const interests = input.labels
        .filter((label) => label.key === 'interested-in' && typeof label.value === 'string')
        .map((label) => ({ person_id: label.entity_id, workshop_id: String(label.value) }))
      return { output: { assignments, unassigned, signups, interests }, trace, diagnostics: [] }
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
    }
  )
}

export type { WorkshopMode }
