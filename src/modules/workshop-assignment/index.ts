import { z } from 'zod'
import { defineModule } from '../define.js'
import type { FindingRef, PhaseReadiness } from '../../config/phases.js'
import type { JsonValue } from '../../events/types.js'
import type { SolverInput, SolverStage, StageResult, TraceEntry } from '../../solver/types.js'
import type {
  OfficialWorkshopsSummary,
  WorkshopMode,
  WorkshopRecord,
} from '../official-workshops/index.js'
import type { WorkshopSchedulingSection } from '../workshop-scheduling/index.js'
import type { WorkshopChoice, WorkshopRanking } from '../workshop-rankings/index.js'

export type WorkshopAssignmentParams = {
  workshops_per_person: number
}

export type WorkshopAssignment = {
  person_id: string
  workshop_id: string
  slot_id: string
  rank: number | null
  reason: 'ranked' | 'fixed'
}

export type WorkshopAssignmentRoundDecision = {
  person_id: string
  workshop_id: string
  rank: number
  outcome: 'assigned' | 'fixed' | 'rejected' | 'not-needed'
  reason: string
  competing_workshop_id: string | null
}

export type WorkshopAssignmentRound = {
  rank: number
  decisions: readonly WorkshopAssignmentRoundDecision[]
  assignments: readonly WorkshopAssignment[]
}

export type WorkshopUnassigned = { person_id: string; workshop_id: string | null; reason: string }

export type WorkshopFixed = { person_id: string; workshop_id: string }

export type WorkshopFixedViolation = WorkshopFixed & { reasons: readonly string[] }

export type WorkshopAssignmentSection = {
  initial_assignments: readonly WorkshopAssignment[]
  rounds: readonly WorkshopAssignmentRound[]
  assignments: readonly WorkshopAssignment[]
  unassigned: readonly WorkshopUnassigned[]
  automatic_assignments: readonly WorkshopAssignment[]
  automatic_unassigned: readonly WorkshopUnassigned[]
  signups: readonly { person_id: string; workshop_id: string }[]
  interests: readonly { person_id: string; workshop_id: string }[]
  fixed: readonly WorkshopFixed[]
  fixed_violations: readonly WorkshopFixedViolation[]
}

function eligibleRole(personRole: JsonValue | undefined, workshop: WorkshopRecord): boolean {
  if (workshop.audience === 'children') return personRole === 'child'
  if (workshop.audience === 'adults') return personRole === 'adult'
  return true
}

function assignmentStage(
  params: WorkshopAssignmentParams,
  includeComparison = true,
): SolverStage<WorkshopAssignmentSection> {
  return {
    id: 'workshop-assignment.attendance',
    after: ['workshop-scheduling.placement', 'workshop-rankings.demand'],
    before: [],
    reads: ['workshop-scheduling.placement', 'workshop-rankings.demand'],
    run: (input: SolverInput, upstream, config): StageResult<WorkshopAssignmentSection> => {
      const schedule = upstream['workshop-scheduling.placement'] as WorkshopSchedulingSection
      const rankingOutput = upstream['workshop-rankings.demand'] as {
        rankings: readonly WorkshopRanking[]
        max_rank: number
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
      // `rejectionReason` runs once per candidate pair and asks for the
      // person's role every time; resolving that through `input.labels` meant
      // scanning every label in the occasion on each call.
      const roleByPerson = new Map<string, JsonValue>()
      for (const label of input.labels)
        if (label.key === 'role' && !roleByPerson.has(label.entity_id))
          roleByPerson.set(label.entity_id, label.value)
      // Ranked choices, filtered and ordered once per person for the round loop.
      const rankedChoicesByPerson = new Map<string, readonly WorkshopChoice[]>(
        rankingOutput.rankings.map((ranking) => [
          ranking.person_id,
          Object.freeze(
            ranking.choices
              .filter((choice) => choice.workshop_id && choice.rank !== null)
              .slice()
              .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
          ),
        ]),
      )
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
              score: 0,
              terms: [['rank', rank ?? 0]],
            },
          },
        })
        return true
      }
      const traceRejection = (
        personId: string,
        workshopId: string,
        step: string,
        reason: string,
      ): void => {
        trace.push({
          stage: 'workshop-assignment.attendance',
          step,
          subject: personId,
          text: `${personId} rejected for ${workshopId}: ${reason}`,
          detail: { chosen: { target: workshopId, score: 0, terms: [[reason, 0]] } },
        })
      }
      const rejectionReason = (personId: string, workshop: WorkshopRecord): string | null => {
        if (workshop.cancelled) return 'hard.cancellation'
        const placement = placements.get(workshop.id)
        if (!placement) return 'hard.unscheduled'
        if (workshop.mode !== 'assigned') return 'hard.mode-not-assigned'
        if (leaderSlots.get(personId)?.has(placement.slot_id)) return 'hard.leader-conflict'
        if (!eligibleRole(roleByPerson.get(personId), workshop)) return 'hard.eligibility'
        if ((counts.get(workshop.id) ?? 0) >= workshop.capacity) return 'hard.capacity'
        if (usedBySlot.get(placement.slot_id)?.has(personId)) return 'hard.overlap'
        return null
      }
      const competingWorkshopId = (personId: string, workshopId: string): string | null => {
        const slotId = placements.get(workshopId)?.slot_id
        return (
          assignments.find(
            (assignment) =>
              assignment.person_id === personId &&
              assignment.slot_id === slotId &&
              assignment.workshop_id !== workshopId,
          )?.workshop_id ?? null
        )
      }

      // Step 1: apply feasible fixed attendance decisions first — they always
      // take precedence over automatic ranked choices, so they
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

      const fixedChoiceKeys = new Set<string>()
      for (const assignment of assignments) {
        if (assignment.reason !== 'fixed') continue
        if (
          rankingByPerson
            .get(assignment.person_id)
            ?.choices.some(
              (choice) => choice.workshop_id === assignment.workshop_id && choice.rank !== null,
            )
        )
          fixedChoiceKeys.add(`${assignment.person_id}|${assignment.workshop_id}`)
      }
      const initialAssignments = assignments.map((assignment) => ({ ...assignment }))
      const rounds: WorkshopAssignmentRound[] = []

      // Step 2: process every configured ranked choice in Wahlrunde order. A
      // person may receive at most the configured number of automatic
      // assignments, but every lower-ranked choice remains explainable.
      for (let rank = 1; rank <= rankingOutput.max_rank; rank += 1) {
        const decisions: WorkshopAssignmentRoundDecision[] = []
        for (const person of assignedPeople) {
          for (const choice of rankedChoicesByPerson.get(person.id) ?? []) {
            if (choice.rank !== rank || !choice.workshop_id) continue
            const workshopId = choice.workshop_id
            const choiceKey = `${person.id}|${workshopId}`
            if (fixedChoiceKeys.has(choiceKey)) {
              decisions.push({
                person_id: person.id,
                workshop_id: workshopId,
                rank,
                outcome: 'fixed',
                reason: 'fixed',
                competing_workshop_id: null,
              })
              continue
            }
            if ((assignedCount.get(person.id) ?? 0) >= params.workshops_per_person) {
              traceRejection(person.id, workshopId, 'ranked-skipped', 'policy.target-reached')
              decisions.push({
                person_id: person.id,
                workshop_id: workshopId,
                rank,
                outcome: 'not-needed',
                reason: 'policy.target-reached',
                competing_workshop_id: null,
              })
              continue
            }
            const workshop = workshops.get(workshopId)
            if (!workshop) {
              traceRejection(person.id, workshopId, 'ranked-rejected', 'hard.cancellation')
              decisions.push({
                person_id: person.id,
                workshop_id: workshopId,
                rank,
                outcome: 'rejected',
                reason: 'hard.cancellation',
                competing_workshop_id: null,
              })
              continue
            }
            if (!place(person.id, workshop, choice.rank, 'ranked')) {
              const reason = rejectionReason(person.id, workshop) ?? 'hard.capacity'
              traceRejection(person.id, workshopId, 'ranked-rejected', reason)
              decisions.push({
                person_id: person.id,
                workshop_id: workshopId,
                rank,
                outcome: 'rejected',
                reason,
                competing_workshop_id:
                  reason === 'hard.overlap' ? competingWorkshopId(person.id, workshopId) : null,
              })
              continue
            }
            decisions.push({
              person_id: person.id,
              workshop_id: workshopId,
              rank,
              outcome: 'assigned',
              reason: 'ranked',
              competing_workshop_id: null,
            })
          }
        }
        rounds.push(
          Object.freeze({
            rank,
            decisions: Object.freeze(decisions.map((decision) => Object.freeze(decision))),
            assignments: Object.freeze(
              assignments.map((assignment) => Object.freeze({ ...assignment })),
            ),
          }),
        )
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
      const automaticOnly = includeComparison
        ? assignmentStage(params, false).run(
            {
              ...input,
              labels: input.labels.filter((label) => label.key !== 'workshop-attendance'),
            },
            Object.assign({}, upstream, {
              ['workshop-scheduling.placement']: {
                ...schedule,
                placements: schedule.automatic_placements,
                unscheduled: schedule.automatic_unscheduled,
                fixed: [],
                fixed_violations: [],
              } satisfies WorkshopSchedulingSection,
            }),
            config,
          ).output
        : null
      return {
        output: {
          initial_assignments: Object.freeze(
            initialAssignments.map((assignment) => Object.freeze({ ...assignment })),
          ),
          rounds: Object.freeze(rounds),
          assignments,
          unassigned,
          automatic_assignments: automaticOnly?.assignments ?? assignments,
          automatic_unassigned: automaticOnly?.unassigned ?? unassigned,
          signups,
          interests,
          fixed: Object.freeze(fixed),
          fixed_violations: Object.freeze(fixedViolations),
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
    workshops_per_person: z.number().int().min(1).default(2),
  }),
  contribute: (params) => ({
    phases: [
      {
        id: 'workshop-assignment.review',
        area: 'workshops',
        opens: { kind: 'always' },
        target: false,
        closed_by_area: false,
        readiness: workshopReviewReadiness,
      },
    ],
    stages: [assignmentStage(params)],
    reports: [
      { id: 'workshop-roster' },
      { id: 'workshop-person-plan' },
      { id: 'workshop-family-plan' },
      { id: 'workshop-space-plan' },
    ],
    screens: [
      {
        id: 'organiser-workshop-lists',
        route: '/organiser/workshops/lists',
        label: 'Listen',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-list-workshops',
        route: '/organiser/workshops/lists/workshops',
        label: 'Workshoplisten',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-list-persons',
        route: '/organiser/workshops/lists/persons',
        label: 'Personenpläne',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-list-families',
        route: '/organiser/workshops/lists/families',
        label: 'Familienpläne',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-list-rooms',
        route: '/organiser/workshops/lists/rooms',
        label: 'Raumpläne',
        audience: 'organiser',
      },
    ],
  }),
})

export function workshopAssignmentSection(plan: {
  sections: Readonly<Record<string, unknown>>
}): WorkshopAssignmentSection {
  return (
    (plan.sections['workshop-assignment'] as WorkshopAssignmentSection | undefined) ?? {
      initial_assignments: [],
      rounds: [],
      assignments: [],
      unassigned: [],
      automatic_assignments: [],
      automatic_unassigned: [],
      signups: [],
      interests: [],
      fixed: [],
      fixed_violations: [],
    }
  )
}

export type { WorkshopMode }

/**
 * The workshop review is ready once workshop choice has been opened, every active workshop is
 * placed, every fixed placement and attendance decision holds, and no workshop preflight finding
 * blocks the plan (spec/architecture/phases.md §4).
 */
export const workshopReviewReadiness: PhaseReadiness = ({ world, plan }) => {
  const findings: FindingRef[] = []
  if (world.phase_facts.opened['workshop-rankings.choice'] === undefined)
    findings.push({
      id: 'workshop-rankings.choice-not-opened',
      subject_id: null,
      message: 'Die Workshopwahl ist noch nicht geöffnet.',
    })
  if (!plan) {
    findings.push({
      id: 'phase.plan-unavailable',
      subject_id: null,
      message: 'Die Zuordnung ist noch nicht berechnet.',
    })
    return { ready: false, findings }
  }
  const scheduling = plan.sections['workshop-scheduling'] as WorkshopSchedulingSection | undefined
  const attendance = plan.sections['workshop-assignment'] as WorkshopAssignmentSection | undefined
  // Unscheduled and invalid fixed placements are reported once below, with readable text.
  const coveredChecks = new Set([
    'workshop-scheduling.unscheduled',
    'workshop-scheduling.fixed-invalid',
  ])
  for (const finding of plan.preflight)
    if (
      finding.severity === 'error' &&
      finding.check.startsWith('workshop-') &&
      !coveredChecks.has(finding.check)
    )
      findings.push({
        id: finding.check,
        subject_id: finding.subjects[0] ?? null,
        message: finding.text,
      })
  for (const { workshop_id: workshopId, reason } of scheduling?.unscheduled ?? [])
    findings.push({
      id: 'workshop-scheduling.unplaced',
      subject_id: workshopId,
      message: `Workshop ${workshopId} hat keinen Platz im Programm (${reason}).`,
    })
  for (const violation of attendance?.fixed_violations ?? [])
    findings.push({
      id: 'workshop-assignment.fixed-invalid',
      subject_id: violation.person_id,
      message: `Feste Teilnahme von ${violation.person_id} an ${violation.workshop_id} ist nicht erfüllbar.`,
    })
  return findings.length === 0 ? { ready: true } : { ready: false, findings }
}
