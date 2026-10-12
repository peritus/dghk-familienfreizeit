import { attentionReason } from '../../../attention/reasons.js'
import type { World, Label } from '../../../events/fold.js'
import type { Plan } from '../../../solver/types.js'
import { compareFixedDecisions } from '../../../solver/fixed-decision.js'
import { officialWorkshopsWorld } from '../../official-workshops/index.js'
import { workshopAssignmentSection } from '../../workshop-assignment/index.js'
import { workshopRankingsWorld, type WorkshopChoice, type WorkshopRanking } from '../index.js'
import {
  workshopSchedulingWorld,
  type WorkshopSchedulingSection,
} from '../../workshop-scheduling/index.js'

export type WorkshopAllocationGroup = 'all' | 'children' | 'adults'

export type WorkshopAllocationAnswer = {
  id: string
  name: string
  age_label: string
  status: 'Rangfolge' | 'Keine Präferenz' | 'Keine Antwort'
  status_tone?: 'attention' | 'neutral'
  ranks: readonly string[]
  group: Exclude<WorkshopAllocationGroup, 'all'>
}

export type WorkshopAllocationDemand = {
  id: string
  title: string
  audience: string
  slot: string
  capacity: number
  first_choices: number
  ranked_count: number
  placement_label: string
}

export type WorkshopAllocationTraceOutcome =
  | 'fulfilled'
  | 'capacity'
  | 'overlap'
  | 'leader'
  | 'unscheduled'
  | 'eligibility'
  | 'cancellation'
  | 'unprocessed'
  | 'fixed'
  | 'not-needed'
  | 'open'

export type WorkshopAllocationTracePhase = 'round' | 'fixed' | 'result'

export type WorkshopAllocationTraceEvent = {
  id: string
  person_id: string
  person_name: string
  workshop_id: string
  workshop_title: string
  rank: number | null
  phase: WorkshopAllocationTracePhase
  outcome: WorkshopAllocationTraceOutcome
  detail: string
  slot_label: string | null
  capacity: number | null
  competing_workshop_title: string | null
  queue_position: number | null
  queue_size: number | null
}

export type WorkshopAllocationTracePerson = {
  id: string
  name: string
  age_label: string
  status: WorkshopAllocationAnswer['status']
  matching_workshop_count: number
  leading_workshops: readonly string[]
  wish_count: number
  fulfilled_count: number
}

export type WorkshopParticipationSlot = {
  id: string
  day_label: string
  start_label: string
  end_label: string
}

export type WorkshopParticipationEntry = {
  workshop_id: string
  title: string
  rank: number | null
  reason: 'ranked' | 'fixed' | 'leader' | 'sign-up' | 'interest'
}

export type WorkshopParticipationCell = {
  kind: 'free' | 'assignment' | 'leader' | 'sign-up' | 'interest'
  entries: readonly WorkshopParticipationEntry[]
}

export type WorkshopParticipationRank = {
  workshop_id: string
  title: string
  rank: number
  received: boolean
}

export type WorkshopParticipationPerson = {
  id: string
  name: string
  age_label: string
  group: Exclude<WorkshopAllocationGroup, 'all'>
  ranks: readonly WorkshopParticipationRank[]
  workshop_count: number
  cells: readonly WorkshopParticipationCell[]
}

export type WorkshopParticipationView = {
  slots: readonly WorkshopParticipationSlot[]
  people: readonly WorkshopParticipationPerson[]
}

export type WorkshopAllocationProjection = {
  max_rank: number
  answers: readonly WorkshopAllocationAnswer[]
  participation: WorkshopParticipationView
  demand: readonly WorkshopAllocationDemand[]
  demand_by_group?: Readonly<Record<WorkshopAllocationGroup, readonly WorkshopAllocationDemand[]>>
  trace_events: readonly WorkshopAllocationTraceEvent[]
  trace_people: readonly WorkshopAllocationTracePerson[]
  person_names: readonly { id: string; name: string; family_name?: string | null }[]
  unassigned_person_ids: readonly string[]
  fixed_violation_count: number
  fixed_reviews?: readonly {
    id: string
    subject: string
    fixed_target: string
    automatic_targets: readonly string[]
    status: 'same' | 'overrides' | 'no-automatic' | 'invalid'
  }[]
  unassigned_count: number
  has_workshops: boolean
  has_answers: boolean
}

export type WorkshopAllocationTraceStage = {
  id: string
  label: string
  description: string
  phase: WorkshopAllocationTracePhase | 'answers'
  rank: number | null
  fulfilled: number
  capacity: number
  overlap: number
  leader: number
  unscheduled: number
  eligibility: number
  cancellation: number
  unprocessed: number
  not_needed: number
  open: number
  details?: string
  detail_items: readonly string[]
  detail_groups?: readonly WorkshopAllocationTraceDetailGroup[]
  selected_summary?: string
}

export type WorkshopAllocationTraceDetailGroup = {
  id: string
  heading: string
  items: readonly WorkshopAllocationTraceDetailItem[]
}

export type WorkshopAllocationTraceDetailItem = {
  id: string
  person_id: string | null
  people: readonly { id: string; name: string }[]
  text: string
  bold_prefix?: string
  strike_people?: boolean
}

type AllocationPerson = {
  id: string
  name: string
  family_name: string | null
  group: Exclude<WorkshopAllocationGroup, 'all'>
  age_label: string
}

export type WorkshopAllocationProjectionInput = {
  world: World
  plan: Plan
  event_date: string
  time_zone: string
  max_rank: number
}

function labelValue(labels: readonly Label[], key: string): string | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'string' ? value : null
}

function labelNumber(labels: readonly Label[], key: string): number | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
}

function personName(world: World, personId: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  return (
    [labelValue(labels, 'given-name'), labelValue(labels, 'family-name')]
      .filter((value): value is string => Boolean(value))
      .join(' ') || 'Name nicht verfügbar'
  )
}

function familyName(world: World, personId: string): string | null {
  const familyId = labelValue(world.labels_by_entity[personId] ?? [], 'member-of')
  return familyId ? labelValue(world.labels_by_entity[familyId] ?? [], 'display-name') : null
}

function personGroup(world: World, personId: string): Exclude<WorkshopAllocationGroup, 'all'> {
  return labelValue(world.labels_by_entity[personId] ?? [], 'role') === 'adult'
    ? 'adults'
    : 'children'
}

function ageLabel(world: World, personId: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  const age = labelNumber(labels, 'age')
  const role = labelValue(labels, 'role')
  return age === null ? (role === 'adult' ? 'erwachsen' : 'Kind') : `${age} Jahre`
}

function dateLabel(value: string, timeZone: string): string {
  return new globalThis.Date(value).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    ['timeZone']: timeZone,
  })
}

function timeLabel(startsAt: string, endsAt: string, timeZone: string): string {
  const starts = new globalThis.Date(startsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: timeZone,
  })
  const ends = new globalThis.Date(endsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: timeZone,
  })
  return `${starts}–${ends}`
}

function weekdayLabel(value: string, timeZone: string): string {
  return new globalThis.Date(value)
    .toLocaleDateString('de-DE', { weekday: 'short', ['timeZone']: timeZone })
    .replace(/\.$/u, '')
}

function clockLabel(value: string, timeZone: string): string {
  return new globalThis.Date(value).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: timeZone,
  })
}

function audienceLabel(value: string): string {
  return { children: 'Kinder', adults: 'Erwachsene', all: 'Alle' }[value] ?? value
}

function reasonOutcome(reason: string | undefined): WorkshopAllocationTraceOutcome {
  switch (reason) {
    case 'hard.capacity':
      return 'capacity'
    case 'hard.overlap':
      return 'overlap'
    case 'hard.leader-conflict':
      return 'leader'
    case 'hard.unscheduled':
      return 'unscheduled'
    case 'hard.eligibility':
    case 'hard.mode-not-assigned':
      return 'eligibility'
    case 'hard.cancellation':
      return 'cancellation'
    case 'policy.target-reached':
      return 'not-needed'
    default:
      return 'unprocessed'
  }
}

function assignmentOutcome(reason: string): WorkshopAllocationTraceOutcome {
  const outcomeByReason: Record<string, WorkshopAllocationTraceOutcome> = {
    ranked: 'fulfilled',
    fixed: 'fixed',
  }
  return outcomeByReason[reason] ?? 'unprocessed'
}

function outcomeLabel(outcome: WorkshopAllocationTraceOutcome): string {
  const labels: Record<WorkshopAllocationTraceOutcome, string> = {
    fulfilled: 'erfüllt',
    capacity: 'voll',
    overlap: 'Überschneidung',
    leader: 'leitet selbst',
    unscheduled: 'ohne Termin',
    eligibility: 'passt nicht',
    cancellation: 'abgesagt',
    unprocessed: 'noch offen',
    fixed: 'fest zugeordnet',
    'not-needed': 'nicht benötigt',
    open: 'offen',
  }
  return labels[outcome]
}

function selectedRankingLabel(ranks: readonly string[]): string {
  return `Rangfolge: ${ranks.map((rank, index) => `(${index + 1}) ${rank}`).join(' · ')}`
}

function selectedEventLabel(event: WorkshopAllocationTraceEvent): string {
  const rank = event.rank ? ` (${event.rank}. Wahl)` : ''
  return `${event.workshop_title}${rank}: ${outcomeLabel(event.outcome)}`
}

function reasonText(outcome: WorkshopAllocationTraceOutcome): string {
  const labels: Partial<Record<WorkshopAllocationTraceOutcome, string>> = {
    capacity: 'voll',
    overlap: 'Überschneidung',
    leader: 'leitet selbst',
    unscheduled: 'ohne Termin',
    eligibility: 'passt nicht',
    cancellation: 'abgesagt',
    unprocessed: 'noch offen',
    'not-needed': 'Ziel bereits erreicht',
  }
  return labels[outcome] ?? outcomeLabel(outcome)
}

function traceDetailText(event: WorkshopAllocationTraceEvent): string {
  const rank = event.rank ? ` (${event.rank}. Wahl)` : ''
  const slot = event.slot_label ? ` · ${event.slot_label}` : ''
  switch (event.outcome) {
    case 'capacity':
      return `${event.workshop_title}${event.capacity ? ` (nur ${event.capacity} Plätze${event.slot_label ? `, ${event.slot_label}` : ''})` : ''}, daher nicht erfüllt für ${event.person_name}`
    case 'overlap':
      return `${event.person_name}: ${event.workshop_title}${rank} nicht erfüllt, weil ${event.slot_label ?? 'der Slot'} schon ${event.competing_workshop_title ?? 'ein anderer Kurs'} belegt ist`
    case 'leader':
      return `${event.person_name}: ${event.workshop_title}${rank} nicht erfüllt, weil ${event.slot_label ?? 'der Slot'} selbst ${event.competing_workshop_title ?? 'ein anderer Kurs'} geleitet wird`
    case 'unscheduled':
      return `${event.workshop_title}: ${event.person_name}${rank} · ohne Termin`
    case 'fulfilled':
    case 'fixed':
      return `${event.workshop_title}: ${event.person_name}${rank}${slot ? ` · ${slot.slice(3)}` : ''}`
    case 'not-needed':
      return `${event.person_name}: ${event.workshop_title}${rank} nicht mehr benötigt, Ziel bereits erreicht`
    default:
      return `${event.person_name}: ${event.workshop_title}${rank} · ${event.detail}`
  }
}

function detailHeading(outcome: WorkshopAllocationTraceOutcome, count: number): string {
  const wishes = `${count} ${count === 1 ? 'Wunsch' : 'Wünsche'}`
  switch (outcome) {
    case 'capacity':
      return `Voll · ${wishes} nicht erfüllt`
    case 'overlap':
      return `Überschneidung · ${wishes} nicht erfüllt`
    case 'leader':
      return `Leitet selbst · ${wishes} nicht erfüllt`
    case 'unscheduled':
      return `Ohne Termin · ${wishes} nicht erfüllt`
    case 'fulfilled':
      return `Erfüllt · ${wishes}`
    case 'fixed':
      return `Fest zugeordnet · ${count} ${count === 1 ? 'Person' : 'Personen'}`
    case 'not-needed':
      return `${wishes} übersprungen · Zuordnungsgrenze erreicht`
    case 'open':
      return `Offen · ${count} ${count === 1 ? 'Fall' : 'Fälle'}`
    default:
      return `${outcomeLabel(outcome)} · ${wishes}`
  }
}

function detailBoldPrefix(event: WorkshopAllocationTraceEvent): string | undefined {
  return ['fulfilled', 'capacity', 'unscheduled', 'not-needed'].includes(event.outcome)
    ? event.workshop_title
    : undefined
}

function detailStrikesPeople(outcome: WorkshopAllocationTraceOutcome): boolean {
  return ['capacity', 'overlap', 'leader', 'unscheduled', 'eligibility', 'cancellation'].includes(
    outcome,
  )
}

function answerRankings(
  rankings: readonly WorkshopRanking[],
  maxRank: number,
): Map<string, WorkshopRanking> {
  return new Map(
    rankings.map((ranking) => [
      ranking.person_id,
      {
        ...ranking,
        choices: ranking.choices.filter(
          (choice) => choice.rank === null || (choice.rank > 0 && choice.rank <= maxRank),
        ),
      },
    ]),
  )
}

function placementLabel(
  workshopId: string,
  placements: ReadonlyMap<string, { slot_id: string; space_id: string }>,
  slots: ReadonlyMap<string, { starts_at: string; ends_at: string }>,
  reasons: ReadonlyMap<string, string>,
  timeZone: string,
): string {
  const placement = placements.get(workshopId)
  if (!placement) return reasons.get(workshopId) ?? 'ohne Termin'
  const slot = slots.get(placement.slot_id)
  return slot
    ? `${dateLabel(slot.starts_at, timeZone)} ${timeLabel(slot.starts_at, slot.ends_at, timeZone)}`
    : 'Im Programm platziert'
}

function slotLabel(
  workshopId: string,
  placements: ReadonlyMap<string, { slot_id: string; space_id: string }>,
  slots: ReadonlyMap<string, { starts_at: string; ends_at: string }>,
  timeZone: string,
): string | null {
  const placement = placements.get(workshopId)
  const slot = placement ? slots.get(placement.slot_id) : undefined
  return slot
    ? `${dateLabel(slot.starts_at, timeZone)} ${timeLabel(slot.starts_at, slot.ends_at, timeZone)}`
    : null
}

function tracePhase(reason: string): WorkshopAllocationTracePhase {
  if (reason === 'fixed') return 'fixed'
  return 'round'
}

export function buildWorkshopAllocationProjection(
  input: WorkshopAllocationProjectionInput,
): WorkshopAllocationProjection {
  const official = officialWorkshopsWorld(input.world)
  const schedule = workshopSchedulingWorld(input.world)
  const rankings = workshopRankingsWorld(input.world).rankings
  const assignment = workshopAssignmentSection(input.plan)
  const people: readonly AllocationPerson[] = input.world.persons
    .map((person) => ({
      id: person.id,
      name: personName(input.world, person.id),
      family_name: familyName(input.world, person.id),
      group: personGroup(input.world, person.id),
      age_label: ageLabel(input.world, person.id),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))
  const rankingsByPerson = answerRankings(rankings, input.max_rank)
  const workshops = new Map(
    [...official.workshops, ...official.cancelled].map((workshop) => [workshop.id, workshop]),
  )
  const scheduling = input.plan.sections['workshop-scheduling'] as
    | WorkshopSchedulingSection
    | undefined
  const placements = new Map(
    (scheduling?.placements ?? []).map((placement) => [placement.workshop_id, placement]),
  )
  const slots = new Map(schedule.slots.map((slot) => [slot.id, slot]))
  const unscheduled = new Map(
    (scheduling?.unscheduled ?? []).map((item) => [item.workshop_id, item.reason]),
  )
  const fixedReview = compareFixedDecisions(
    assignment.fixed.map((decision) => ({
      subject_id: decision.person_id,
      target_id: decision.workshop_id,
    })),
    assignment.automatic_assignments.map((decision) => ({
      subject_id: decision.person_id,
      target_id: decision.workshop_id,
    })),
    new Set(
      assignment.fixed_violations.map(
        (decision) => `${decision.person_id}|${decision.workshop_id}`,
      ),
    ),
  ).map((review) => ({
    id: `fixed-${review.subject_id}-${review.fixed_target_id}`,
    subject: personName(input.world, review.subject_id),
    fixed_target: workshops.get(review.fixed_target_id)?.title ?? review.fixed_target_id,
    automatic_targets: review.automatic_target_ids.map(
      (workshopId) => workshops.get(workshopId)?.title ?? 'Workshop ohne Titel',
    ),
    status: review.status,
  }))
  const traceEvents: WorkshopAllocationTraceEvent[] = []
  const eventIds = new Set<string>()
  const addEvent = (event: WorkshopAllocationTraceEvent): void => {
    if (eventIds.has(event.id)) throw new Error(`duplicate workshop trace event: ${event.id}`)
    traceEvents.push(event)
    eventIds.add(event.id)
  }
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const roundChoiceKeys = new Set<string>()
  for (const round of assignment.rounds)
    for (const decision of round.decisions) {
      const person = peopleById.get(decision.person_id)
      const workshop = workshops.get(decision.workshop_id)
      const outcome =
        decision.outcome === 'assigned'
          ? 'fulfilled'
          : decision.outcome === 'fixed'
            ? 'fixed'
            : decision.outcome === 'not-needed'
              ? 'not-needed'
              : reasonOutcome(decision.reason)
      roundChoiceKeys.add(`${decision.person_id}|${decision.workshop_id}`)
      addEvent({
        id: `choice-${decision.person_id}-${decision.workshop_id}-${decision.rank}`,
        person_id: decision.person_id,
        person_name: person?.name ?? personName(input.world, decision.person_id),
        workshop_id: decision.workshop_id,
        workshop_title: workshop?.title ?? decision.workshop_id,
        rank: decision.rank,
        phase: outcome === 'fixed' ? 'fixed' : 'round',
        outcome,
        detail:
          outcome === 'fulfilled'
            ? `${decision.rank}. Wunsch erfüllt.`
            : outcome === 'fixed'
              ? 'Feste Zuordnung.'
              : outcome === 'not-needed'
                ? 'Ziel bereits erreicht.'
                : reasonText(outcome),
        slot_label: slotLabel(decision.workshop_id, placements, slots, input.time_zone),
        capacity: workshop?.capacity ?? null,
        competing_workshop_title: decision.competing_workshop_id
          ? (workshops.get(decision.competing_workshop_id)?.title ?? decision.competing_workshop_id)
          : null,
        queue_position: null,
        queue_size: null,
      })
    }
  for (const item of assignment.initial_assignments) {
    if (roundChoiceKeys.has(`${item.person_id}|${item.workshop_id}`)) continue
    const workshop = workshops.get(item.workshop_id)
    const eventId = `${item.reason}-${item.person_id}-${item.workshop_id}-${item.slot_id}`
    addEvent({
      id: eventId,
      person_id: item.person_id,
      person_name: personName(input.world, item.person_id),
      workshop_id: item.workshop_id,
      workshop_title: workshop?.title ?? item.workshop_id,
      rank: null,
      phase: tracePhase(item.reason),
      outcome: assignmentOutcome(item.reason),
      detail: item.reason === 'fixed' ? 'Feste Zuordnung.' : 'Automatisch zugeordnet.',
      slot_label: slotLabel(item.workshop_id, placements, slots, input.time_zone),
      capacity: workshop?.capacity ?? null,
      competing_workshop_title: null,
      queue_position: null,
      queue_size: null,
    })
  }
  const answers = people.map((person) => {
    const ranking = rankingsByPerson.get(person.id)
    const noPreference = ranking?.choices.some((choice) => choice.workshop_id === null)
    return {
      id: person.id,
      name: person.name,
      age_label: person.age_label,
      status: (ranking
        ? noPreference
          ? 'Keine Präferenz'
          : 'Rangfolge'
        : 'Keine Antwort') as WorkshopAllocationAnswer['status'],
      status_tone: (ranking && !noPreference
        ? undefined
        : ranking
          ? 'neutral'
          : 'attention') as WorkshopAllocationAnswer['status_tone'],
      ranks: (ranking?.choices ?? [])
        .filter((choice) => choice.workshop_id !== null)
        .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))
        .map((choice) => workshops.get(choice.workshop_id!)?.title ?? choice.workshop_id!),
      group: person.group,
    }
  })
  for (const violation of assignment.fixed_violations) {
    const workshop = workshops.get(violation.workshop_id)
    addEvent({
      id: `fixed-violation-${violation.person_id}-${violation.workshop_id}`,
      person_id: violation.person_id,
      person_name: personName(input.world, violation.person_id),
      workshop_id: violation.workshop_id,
      workshop_title: workshop?.title ?? violation.workshop_id,
      rank: null,
      phase: 'fixed',
      outcome: reasonOutcome(violation.reasons[0]),
      detail: `Feste Zuordnung bleibt bestehen. Konflikte: ${violation.reasons.map((reason) => attentionReason(reason)).join(', ')}.`,
      slot_label: slotLabel(violation.workshop_id, placements, slots, input.time_zone),
      capacity: workshop?.capacity ?? null,
      competing_workshop_title: null,
      queue_position: null,
      queue_size: null,
    })
  }
  for (const item of assignment.unassigned) {
    addEvent({
      id: `unassigned-${item.person_id}`,
      person_id: item.person_id,
      person_name: personName(input.world, item.person_id),
      workshop_id: item.workshop_id ?? '',
      workshop_title: item.workshop_id
        ? (workshops.get(item.workshop_id)?.title ?? item.workshop_id)
        : 'Keine Zuordnung',
      rank: null,
      phase: 'result',
      outcome: 'open',
      detail: `Keine Zuordnung: ${item.reason}.`,
      slot_label: null,
      capacity: null,
      competing_workshop_title: null,
      queue_position: null,
      queue_size: null,
    })
  }
  const tracePeople = people.map((person): WorkshopAllocationTracePerson => {
    const ranking = rankingsByPerson.get(person.id)
    const matchingWorkshopCount = official.workshops.filter(
      (workshop) =>
        workshop.mode === 'assigned' &&
        !workshop.cancelled &&
        placements.has(workshop.id) &&
        (workshop.audience === 'all' ||
          (workshop.audience === 'children') === (person.group === 'children')),
    ).length
    const leadingWorkshops = official.workshops
      .filter((workshop) => workshop.leader_ids.includes(person.id))
      .map((workshop) => workshop.title)
    const personEvents = traceEvents.filter((event) => event.person_id === person.id)
    return {
      id: person.id,
      name: person.name,
      age_label: person.age_label,
      status: answers.find((answer) => answer.id === person.id)!.status,
      matching_workshop_count: matchingWorkshopCount,
      leading_workshops: leadingWorkshops,
      wish_count: ranking?.choices.filter((choice) => choice.workshop_id !== null).length ?? 0,
      fulfilled_count: personEvents.filter((event) =>
        ['fulfilled', 'fixed'].includes(event.outcome),
      ).length,
    }
  })
  const participationSlots: WorkshopParticipationSlot[] = schedule.slots
    .slice()
    .sort(
      (left, right) =>
        left.sort_key - right.sort_key ||
        new globalThis.Date(left.starts_at).getTime() -
          new globalThis.Date(right.starts_at).getTime() ||
        left.id.localeCompare(right.id),
    )
    .map((slot) => ({
      id: slot.id,
      day_label: weekdayLabel(slot.starts_at, input.time_zone),
      start_label: clockLabel(slot.starts_at, input.time_zone),
      end_label: clockLabel(slot.ends_at, input.time_zone),
    }))
  type SlotEntries = {
    assignments: WorkshopParticipationEntry[]
    leaders: WorkshopParticipationEntry[]
    signups: WorkshopParticipationEntry[]
    interests: WorkshopParticipationEntry[]
  }
  const slotEntriesByPerson = new Map<string, Map<string, SlotEntries>>()
  const slotEntries = (personId: string, slotId: string): SlotEntries => {
    const personSlots = slotEntriesByPerson.get(personId) ?? new Map<string, SlotEntries>()
    slotEntriesByPerson.set(personId, personSlots)
    const entries = personSlots.get(slotId) ?? {
      assignments: [],
      leaders: [],
      signups: [],
      interests: [],
    }
    personSlots.set(slotId, entries)
    return entries
  }
  for (const item of assignment.assignments) {
    const entries = slotEntries(item.person_id, item.slot_id)
    entries.assignments.push({
      workshop_id: item.workshop_id,
      title: workshops.get(item.workshop_id)?.title ?? item.workshop_id,
      rank: item.rank,
      reason: item.reason,
    })
  }
  for (const workshop of official.workshops) {
    const placement = placements.get(workshop.id)
    if (!placement) continue
    for (const leaderId of workshop.leader_ids)
      slotEntries(leaderId, placement.slot_id).leaders.push({
        workshop_id: workshop.id,
        title: workshop.title,
        rank: null,
        reason: 'leader',
      })
  }
  for (const item of assignment.signups) {
    const placement = placements.get(item.workshop_id)
    if (!placement) continue
    slotEntries(item.person_id, placement.slot_id).signups.push({
      workshop_id: item.workshop_id,
      title: workshops.get(item.workshop_id)?.title ?? item.workshop_id,
      rank: null,
      reason: 'sign-up',
    })
  }
  for (const item of assignment.interests) {
    const placement = placements.get(item.workshop_id)
    if (!placement) continue
    slotEntries(item.person_id, placement.slot_id).interests.push({
      workshop_id: item.workshop_id,
      title: workshops.get(item.workshop_id)?.title ?? item.workshop_id,
      rank: null,
      reason: 'interest',
    })
  }
  const participationPeople: WorkshopParticipationPerson[] = people
    .map((person) => {
      const ranking = rankingsByPerson.get(person.id)
      const assignedWorkshopIds = new Set(
        assignment.assignments
          .filter((item) => item.person_id === person.id)
          .map((item) => item.workshop_id),
      )
      const ranks: WorkshopParticipationRank[] = (ranking?.choices ?? [])
        .filter(
          (choice): choice is WorkshopChoice & { workshop_id: string; rank: number } =>
            choice.workshop_id !== null && choice.rank !== null,
        )
        .map((choice) => ({
          workshop_id: choice.workshop_id,
          title: workshops.get(choice.workshop_id)?.title ?? choice.workshop_id,
          rank: choice.rank,
          received: assignedWorkshopIds.has(choice.workshop_id),
        }))
      const cells: WorkshopParticipationCell[] = participationSlots.map((slot) => {
        const entries = slotEntriesByPerson.get(person.id)?.get(slot.id)
        if (entries) {
          const all = [
            ...entries.leaders,
            ...entries.assignments,
            ...entries.signups,
            ...entries.interests,
          ]
          if (all.length)
            return {
              kind: entries.leaders.length
                ? 'leader'
                : entries.assignments.length
                  ? 'assignment'
                  : entries.signups.length
                    ? 'sign-up'
                    : 'interest',
              entries: all,
            }
        }
        return { kind: 'free', entries: [] }
      })
      return {
        id: person.id,
        name: person.name,
        age_label: person.age_label,
        group: person.group,
        ranks,
        workshop_count: new Set(
          [...assignment.assignments, ...assignment.signups]
            .filter((item) => item.person_id === person.id)
            .map((item) => item.workshop_id),
        ).size,
        cells,
      }
    })
    .sort(
      (left, right) => left.name.localeCompare(right.name, 'de') || left.id.localeCompare(right.id),
    )
  const participation: WorkshopParticipationView = {
    slots: participationSlots,
    people: participationPeople,
  }
  const rankedPeople = people.filter((person) => {
    const ranking = rankingsByPerson.get(person.id)
    return ranking?.choices.some((choice) => choice.workshop_id !== null) ?? false
  })
  const demandForPeople = (selectedPeople: readonly AllocationPerson[]) =>
    official.workshops
      .filter((workshop) => workshop.mode === 'assigned' && !workshop.cancelled)
      .map((workshop) => {
        const choices = selectedPeople.flatMap((person) =>
          (rankingsByPerson.get(person.id)?.choices ?? []).filter(
            (choice) => choice.workshop_id === workshop.id,
          ),
        )
        return {
          id: workshop.id,
          title: workshop.title,
          audience: audienceLabel(workshop.audience),
          slot: placementLabel(workshop.id, placements, slots, unscheduled, input.time_zone),
          capacity: workshop.capacity,
          first_choices: choices.filter((choice) => choice.rank === 1).length,
          ranked_count: choices.length,
          placement_label: placements.has(workshop.id) ? 'platziert' : 'ohne Termin',
        }
      })
      .sort(
        (left, right) =>
          right.first_choices / Math.max(right.capacity, 1) -
            left.first_choices / Math.max(left.capacity, 1) ||
          right.ranked_count - left.ranked_count ||
          left.title.localeCompare(right.title, 'de'),
      )
  const demandByGroup: Readonly<
    Record<WorkshopAllocationGroup, readonly WorkshopAllocationDemand[]>
  > = {
    all: demandForPeople(rankedPeople),
    children: demandForPeople(rankedPeople.filter((person) => person.group === 'children')),
    adults: demandForPeople(rankedPeople.filter((person) => person.group === 'adults')),
  }
  const demand = demandByGroup.all
  return {
    max_rank: input.max_rank,
    answers,
    participation,
    demand,
    demand_by_group: demandByGroup,
    trace_events: traceEvents,
    trace_people: tracePeople,
    person_names: people.map(({ id, name, family_name: familyName }) => ({
      id,
      name,
      family_name: familyName,
    })),
    unassigned_person_ids: assignment.unassigned.map(({ person_id: personId }) => personId),
    fixed_violation_count: assignment.fixed_violations.length,
    fixed_reviews: fixedReview,
    unassigned_count: assignment.unassigned.length,
    has_workshops: official.workshops.length > 0,
    has_answers: rankings.length > 0,
  }
}

export function workshopAllocationPeople(
  projection: WorkshopAllocationProjection,
  group: WorkshopAllocationGroup,
): readonly WorkshopAllocationAnswer[] {
  return projection.answers.filter((answer) => group === 'all' || answer.group === group)
}

export function buildWorkshopAllocationTraceStages(
  projection: WorkshopAllocationProjection,
  group: WorkshopAllocationGroup,
  selectedPersonId?: string,
  onlySelected = false,
): readonly WorkshopAllocationTraceStage[] {
  const events = projection.trace_events.filter((event) => {
    const answer = projection.answers.find((item) => item.id === event.person_id)
    return (
      answer &&
      (group === 'all' || answer.group === group) &&
      (!onlySelected || event.person_id === selectedPersonId)
    )
  })
  const rankedEvents = events.filter(
    (event) => event.rank !== null && ['round', 'fixed'].includes(event.phase),
  )
  const total = rankedEvents.length
  const detailGroups = (
    items: readonly WorkshopAllocationTraceEvent[],
  ): readonly WorkshopAllocationTraceDetailGroup[] => {
    const groups = new Map<WorkshopAllocationTraceOutcome, WorkshopAllocationTraceEvent[]>()
    for (const event of items) {
      const list = groups.get(event.outcome) ?? []
      list.push(event)
      groups.set(event.outcome, list)
    }
    const detailOrder: WorkshopAllocationTraceOutcome[] = [
      'fixed',
      'fulfilled',
      'capacity',
      'overlap',
      'leader',
      'unscheduled',
      'not-needed',
      'open',
      'eligibility',
      'cancellation',
      'unprocessed',
    ]
    return detailOrder.flatMap((outcome) => {
      const groupedItems = groups.get(outcome)
      return groupedItems
        ? [
            {
              id: outcome,
              heading: detailHeading(outcome, groupedItems.length),
              items: detailItemsForOutcome(outcome, groupedItems),
            },
          ]
        : []
    })
  }
  const detailItemsForOutcome = (
    outcome: WorkshopAllocationTraceOutcome,
    items: readonly WorkshopAllocationTraceEvent[],
  ): readonly WorkshopAllocationTraceDetailItem[] => {
    const canGroup = ['fulfilled', 'capacity', 'unscheduled', 'not-needed'].includes(outcome)
    if (!canGroup) {
      return items.map((event) => ({
        id: event.id,
        person_id: event.person_id,
        people: [{ id: event.person_id, name: event.person_name }],
        text: traceDetailText(event),
        bold_prefix: detailBoldPrefix(event),
        strike_people: detailStrikesPeople(event.outcome),
      }))
    }
    const grouped = new Map<string, WorkshopAllocationTraceEvent[]>()
    for (const event of items) {
      const key = `${event.workshop_id}|${event.slot_label ?? ''}`
      const group = grouped.get(key) ?? []
      group.push(event)
      grouped.set(key, group)
    }
    return [...grouped].map(([id, events]) => {
      const first = events[0]
      if (!first) return { id, person_id: null, people: [], text: '' }
      const names = events.map((event) => event.person_name).join(', ')
      const slot = first.slot_label ? ` (${first.slot_label})` : ''
      const text =
        outcome === 'capacity'
          ? `${first.workshop_title}${first.capacity ? ` (nur ${first.capacity} Plätze${first.slot_label ? `, ${first.slot_label}` : ''})` : ''}, daher nicht erfüllt für ${names}`
          : outcome === 'unscheduled'
            ? `${first.workshop_title}: ${names}`
            : outcome === 'not-needed'
              ? events.length === 1
                ? `${first.workshop_title}${slot}: ${first.person_name}${first.rank === null ? '' : ` · ${first.rank}. Wunsch`} übersprungen (Zuordnungsgrenze erreicht)`
                : `${first.workshop_title}${slot}: ${names} · Zuordnungsgrenze erreicht`
              : `${first.workshop_title}${slot}: ${names}`
      return {
        id,
        person_id: events.length === 1 ? first.person_id : null,
        people: events.map((event) => ({ id: event.person_id, name: event.person_name })),
        text,
        bold_prefix: first.workshop_title,
        strike_people: detailStrikesPeople(outcome),
      }
    })
  }
  const detailItems = (items: readonly WorkshopAllocationTraceEvent[]): readonly string[] => {
    return detailGroups(items).map(
      (group) => `${group.heading}: ${group.items.map((item) => item.text).join(', ')}`,
    )
  }
  const counts = (items: readonly WorkshopAllocationTraceEvent[]) => ({
    fulfilled: items.filter((event) => ['fulfilled', 'fixed'].includes(event.outcome)).length,
    capacity: items.filter((event) => event.outcome === 'capacity').length,
    overlap: items.filter((event) => event.outcome === 'overlap').length,
    leader: items.filter((event) => event.outcome === 'leader').length,
    unscheduled: items.filter((event) => event.outcome === 'unscheduled').length,
    eligibility: items.filter((event) => event.outcome === 'eligibility').length,
    cancellation: items.filter((event) => event.outcome === 'cancellation').length,
    unprocessed: items.filter((event) => event.outcome === 'unprocessed').length,
    not_needed: items.filter((event) => event.outcome === 'not-needed').length,
  })
  const stages: WorkshopAllocationTraceStage[] = [
    {
      id: 'answers',
      label: 'Wünsche abgegeben',
      description: `von ${new Set(rankedEvents.map((event) => event.person_id)).size} Personen`,
      phase: 'answers',
      rank: null,
      fulfilled: 0,
      capacity: 0,
      overlap: 0,
      leader: 0,
      unscheduled: 0,
      eligibility: 0,
      cancellation: 0,
      unprocessed: 0,
      not_needed: 0,
      open: total,
      detail_items: [],
    },
  ]
  const fixedRankedEvents = events.filter((event) => event.phase === 'fixed' && event.rank !== null)
  let processed = fixedRankedEvents.length
  for (let rank = 1; rank <= projection.max_rank; rank += 1) {
    const round = events.filter((event) => event.phase === 'round' && event.rank === rank)
    const roundCounts = counts(round)
    processed += Object.values(roundCounts).reduce((sum, value) => sum + value, 0)
    stages.push({
      id: `round-${rank}`,
      label: `Runde ${rank}`,
      description: `${rank === 1 ? 'Erstwünsche' : `${rank}. Wünsche`} · ${round.length} Wünsche`,
      phase: 'round',
      rank,
      ...roundCounts,
      open: Math.max(0, total - processed),
      details: detailItems(round).slice(0, 2).join(' · ') || undefined,
      detail_items: detailItems(round),
      detail_groups: detailGroups(round),
    })
  }
  const resultEvents = events.filter((event) => event.rank === null)
  if (resultEvents.length) {
    const resultCounts = counts(resultEvents)
    stages.push({
      id: 'result',
      label: 'Ergebnis',
      description: 'Feste Zuordnungen und offene Fälle',
      phase: 'result',
      rank: null,
      ...resultCounts,
      open: resultEvents.filter((event) => event.outcome === 'open').length,
      details: detailItems(resultEvents).slice(0, 2).join(' · ') || undefined,
      detail_items: detailItems(resultEvents),
      detail_groups: detailGroups(resultEvents),
    })
  }
  if (selectedPersonId) {
    const selected = projection.answers.find((answer) => answer.id === selectedPersonId)
    const selectedEvents = events.filter((event) => event.person_id === selectedPersonId)
    for (const stage of stages) {
      const stageEvents = selectedEvents.filter((event) => {
        if (stage.id === 'answers') return true
        if (stage.id === 'result') return event.rank === null
        return event.phase === 'round' && event.rank === stage.rank
      })
      stage.selected_summary =
        stage.id === 'answers'
          ? selected?.ranks.length
            ? selectedRankingLabel(selected.ranks)
            : selected?.status
          : stageEvents.length
            ? stageEvents.map(selectedEventLabel).join(' · ')
            : '—'
    }
  }
  return stages
}
