import type { World, Label } from '../../../events/fold.js'
import type { Plan, TraceEntry } from '../../../solver/types.js'
import { officialWorkshopsWorld } from '../../official-workshops/index.js'
import { workshopAssignmentSection } from '../../workshop-assignment/index.js'
import { workshopRankingsWorld, type WorkshopRanking } from '../index.js'
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
  | 'retained'
  | 'dropped'
  | 'fixed'
  | 'repaired'
  | 'open'

export type WorkshopAllocationTracePhase = 'round' | 'retention' | 'repair' | 'fixed' | 'result'

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

export type WorkshopAllocationProjection = {
  answers: readonly WorkshopAllocationAnswer[]
  demand: readonly WorkshopAllocationDemand[]
  trace_events: readonly WorkshopAllocationTraceEvent[]
  trace_people: readonly WorkshopAllocationTracePerson[]
  person_names: readonly { id: string; name: string }[]
  unassigned_person_ids: readonly string[]
  fixed_violation_count: number
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

function personName(world: World, personId: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  return (
    [labelValue(labels, 'given-name'), labelValue(labels, 'family-name')]
      .filter((value): value is string => Boolean(value))
      .join(' ') || personId
  )
}

function personGroup(world: World, personId: string): Exclude<WorkshopAllocationGroup, 'all'> {
  return labelValue(world.labels_by_entity[personId] ?? [], 'role') === 'adult'
    ? 'adults'
    : 'children'
}

function ageLabel(world: World, personId: string, eventDate: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  const birthdate = labelValue(labels, 'birthdate')
  const role = labelValue(labels, 'role')
  if (!birthdate) return role === 'adult' ? 'erwachsen' : 'Kind'
  const birth = new globalThis.Date(`${birthdate}T00:00:00Z`)
  const event = new globalThis.Date(`${eventDate}T00:00:00Z`)
  let age = event.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    event.getUTCMonth() < birth.getUTCMonth() ||
    (event.getUTCMonth() === birth.getUTCMonth() && event.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? `${age} Jahre` : role === 'adult' ? 'erwachsen' : 'Kind'
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

function audienceLabel(value: string): string {
  return { children: 'Kinder', adults: 'Erwachsene', all: 'Alle' }[value] ?? value
}

function traceReason(entry: TraceEntry | undefined): WorkshopAllocationTraceOutcome {
  const reason = entry?.detail?.chosen?.terms?.find(([term]) => term.startsWith('hard.'))?.[0]
  return reasonOutcome(reason)
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
      return 'eligibility'
    case 'hard.cancellation':
      return 'cancellation'
    default:
      return 'unprocessed'
  }
}

function assignmentOutcome(reason: string): WorkshopAllocationTraceOutcome {
  const outcomeByReason: Record<string, WorkshopAllocationTraceOutcome> = {
    ranked: 'fulfilled',
    retained: 'retained',
    fixed: 'fixed',
    repaired: 'repaired',
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
    retained: 'übernommen',
    dropped: 'nicht mehr passend',
    fixed: 'fest zugeordnet',
    repaired: 'repariert',
    open: 'offen',
  }
  return labels[outcome]
}

function traceText(outcome: WorkshopAllocationTraceOutcome, entry?: TraceEntry): string {
  if (outcome === 'fulfilled') return 'Wunsch erfüllt.'
  if (outcome === 'retained') return 'Aus der vorherigen Berechnung übernommen.'
  if (outcome === 'dropped') return entry?.text ?? 'Aus der vorherigen Berechnung entfernt.'
  return entry?.text ?? outcomeLabel(outcome)
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
      return `${event.person_name}: ${event.workshop_title}${rank} nicht erfüllt, weil ${event.slot_label ?? 'der Slot'} schon ${event.competing_workshop_title ?? 'ein anderer Workshop'} belegt ist`
    case 'leader':
      return `${event.person_name}: ${event.workshop_title}${rank} nicht erfüllt, weil ${event.slot_label ?? 'der Slot'} selbst ${event.competing_workshop_title ?? 'ein anderer Workshop'} geleitet wird`
    case 'unscheduled':
      return `${event.workshop_title}: ${event.person_name}${rank} · ohne Termin`
    case 'fulfilled':
    case 'retained':
    case 'fixed':
    case 'repaired':
      return `${event.workshop_title}: ${event.person_name}${rank}${slot ? ` · ${slot.slice(3)}` : ''}`
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
    case 'retained':
      return `Übernommen · ${wishes}`
    case 'dropped':
      return `Nicht mehr passend · ${wishes}`
    case 'fixed':
      return `Fest zugeordnet · ${count} ${count === 1 ? 'Person' : 'Personen'}`
    case 'repaired':
      return `Repariert · ${count} ${count === 1 ? 'Person' : 'Personen'}`
    case 'open':
      return `Offen · ${count} ${count === 1 ? 'Fall' : 'Fälle'}`
    default:
      return `${outcomeLabel(outcome)} · ${wishes}`
  }
}

function detailBoldPrefix(event: WorkshopAllocationTraceEvent): string | undefined {
  return ['fulfilled', 'retained', 'capacity', 'unscheduled'].includes(event.outcome)
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
  if (reason === 'retained') return 'retention'
  if (reason === 'repaired') return 'repair'
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
      group: personGroup(input.world, person.id),
      age_label: ageLabel(input.world, person.id, input.event_date),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))
  const rankingsByPerson = answerRankings(rankings, input.max_rank)
  const workshops = new Map(official.workshops.map((workshop) => [workshop.id, workshop]))
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
  const traces = input.plan.trace.filter(
    (entry) => entry.stage === 'workshop-assignment.attendance',
  )
  const assignmentByChoice = new Map(
    assignment.assignments.map((item) => [`${item.person_id}|${item.workshop_id}`, item]),
  )
  const traceByChoice = new Map<string, TraceEntry>()
  for (const entry of traces) {
    const target = entry.detail?.chosen?.target
    if (target) traceByChoice.set(`${entry.subject}|${target}`, entry)
  }
  const traceEvents: WorkshopAllocationTraceEvent[] = []
  const eventIds = new Set<string>()
  const assignmentAtSlot = (personId: string, slotId: string | undefined, workshopId: string) =>
    slotId
      ? assignment.assignments.find(
          (item) =>
            item.person_id === personId &&
            item.slot_id === slotId &&
            item.workshop_id !== workshopId,
        )
      : undefined
  const addEvent = (event: WorkshopAllocationTraceEvent): void => {
    traceEvents.push(event)
    eventIds.add(event.id)
  }
  for (const person of people) {
    const ranking = rankingsByPerson.get(person.id)
    for (const choice of ranking?.choices ?? []) {
      if (!choice.workshop_id || choice.rank === null) continue
      const workshop = workshops.get(choice.workshop_id)
      const key = `${person.id}|${choice.workshop_id}`
      const placed = assignmentByChoice.get(key)
      const trace = traceByChoice.get(key)
      const outcome = placed ? assignmentOutcome(placed.reason) : traceReason(trace)
      const placement = placements.get(choice.workshop_id)
      const competing = assignmentAtSlot(person.id, placement?.slot_id, choice.workshop_id)
      addEvent({
        id: `${person.id}-${choice.workshop_id}-${choice.rank}`,
        person_id: person.id,
        person_name: person.name,
        workshop_id: choice.workshop_id,
        workshop_title: workshop?.title ?? choice.workshop_id,
        rank: choice.rank,
        phase: placed ? tracePhase(placed.reason) : 'round',
        outcome,
        detail: placed
          ? outcome === 'fulfilled'
            ? `${choice.rank}. Wunsch erfüllt.`
            : traceText(outcome, trace)
          : reasonText(outcome),
        slot_label: slotLabel(choice.workshop_id, placements, slots, input.time_zone),
        capacity: workshop?.capacity ?? null,
        competing_workshop_title: competing
          ? (workshops.get(competing.workshop_id)?.title ?? competing.workshop_id)
          : null,
        queue_position: null,
        queue_size: null,
      })
    }
  }
  for (const item of assignment.assignments) {
    if (item.rank !== null) continue
    const workshop = workshops.get(item.workshop_id)
    const eventId = `${item.reason}-${item.person_id}-${item.workshop_id}-${item.slot_id}`
    if (eventIds.has(eventId)) continue
    addEvent({
      id: eventId,
      person_id: item.person_id,
      person_name: personName(input.world, item.person_id),
      workshop_id: item.workshop_id,
      workshop_title: workshop?.title ?? item.workshop_id,
      rank: null,
      phase: tracePhase(item.reason),
      outcome: assignmentOutcome(item.reason),
      detail:
        item.reason === 'fixed'
          ? 'Feste Zuordnung.'
          : item.reason === 'repaired'
            ? 'Durch Reparatur zugeordnet.'
            : 'Zuordnung übernommen.',
      slot_label: slotLabel(item.workshop_id, placements, slots, input.time_zone),
      capacity: workshop?.capacity ?? null,
      competing_workshop_title: null,
      queue_position: null,
      queue_size: null,
    })
  }
  for (const drop of assignment.retention_drops) {
    const slot = slots.get(drop.slot_id)
    addEvent({
      id: `drop-${drop.person_id}-${drop.workshop_id}-${drop.slot_id}`,
      person_id: drop.person_id,
      person_name: personName(input.world, drop.person_id),
      workshop_id: drop.workshop_id,
      workshop_title: workshops.get(drop.workshop_id)?.title ?? drop.workshop_id,
      rank: null,
      phase: 'retention',
      outcome: 'dropped',
      detail: `Nicht mehr übernommen: ${reasonText(reasonOutcome(drop.reason))}`,
      slot_label: slot
        ? `${dateLabel(slot.starts_at, input.time_zone)} ${timeLabel(slot.starts_at, slot.ends_at, input.time_zone)}`
        : null,
      capacity: workshops.get(drop.workshop_id)?.capacity ?? null,
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
      detail: `Feste Zuordnung nicht möglich: ${reasonText(reasonOutcome(violation.reasons[0]))}.`,
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
        ['fulfilled', 'retained', 'fixed', 'repaired'].includes(event.outcome),
      ).length,
    }
  })
  const rankedPeople = people.filter((person) => {
    const ranking = rankingsByPerson.get(person.id)
    return ranking?.choices.some((choice) => choice.workshop_id !== null) ?? false
  })
  const demand = official.workshops
    .filter((workshop) => workshop.mode === 'assigned' && !workshop.cancelled)
    .map((workshop) => {
      const choices = rankedPeople.flatMap((person) =>
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
  return {
    answers,
    demand,
    trace_events: traceEvents,
    trace_people: tracePeople,
    person_names: people.map(({ id, name }) => ({ id, name })),
    unassigned_person_ids: assignment.unassigned.map(({ person_id: personId }) => personId),
    fixed_violation_count: assignment.fixed_violations.length,
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
  const rankedEvents = events.filter((event) => event.rank !== null)
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
      'capacity',
      'overlap',
      'leader',
      'unscheduled',
      'fulfilled',
      'retained',
      'dropped',
      'fixed',
      'repaired',
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
    const canGroup = ['fulfilled', 'retained', 'capacity', 'unscheduled'].includes(outcome)
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
    fulfilled: items.filter((event) =>
      ['fulfilled', 'retained', 'fixed', 'repaired'].includes(event.outcome),
    ).length,
    capacity: items.filter((event) => event.outcome === 'capacity').length,
    overlap: items.filter((event) => event.outcome === 'overlap').length,
    leader: items.filter((event) => event.outcome === 'leader').length,
    unscheduled: items.filter((event) => event.outcome === 'unscheduled').length,
    eligibility: items.filter((event) => event.outcome === 'eligibility').length,
    cancellation: items.filter((event) => event.outcome === 'cancellation').length,
    unprocessed: items.filter((event) => event.outcome === 'unprocessed').length,
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
      open: total,
      detail_items: [],
    },
  ]
  const retentionEvents = events.filter((event) => event.phase === 'retention')
  let processed = retentionEvents.filter((event) => event.outcome === 'retained').length
  if (retentionEvents.length) {
    const retentionCounts = counts(retentionEvents)
    stages.push({
      id: 'retention',
      label: 'Übernommen',
      description: 'aus der vorherigen Berechnung',
      phase: 'retention',
      rank: null,
      ...retentionCounts,
      open: Math.max(0, total - processed),
      details: retentionEvents.some((event) => event.outcome === 'dropped')
        ? `${retentionEvents.filter((event) => event.outcome === 'dropped').length} Wunsch nicht mehr passend`
        : undefined,
      detail_items: detailItems(retentionEvents),
      detail_groups: detailGroups(retentionEvents),
    })
  }
  const maxRank = Math.max(0, ...rankedEvents.map((event) => event.rank ?? 0))
  for (let rank = 1; rank <= maxRank; rank += 1) {
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
  const resultEvents = events.filter((event) => event.rank === null && event.phase !== 'retention')
  if (resultEvents.length) {
    const resultCounts = counts(resultEvents)
    stages.push({
      id: 'result',
      label: 'Ergebnis',
      description: 'Auffüllen, feste Zuordnungen und offene Fälle',
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
        if (stage.id === 'retention') return event.phase === 'retention'
        if (stage.id === 'result') return event.rank === null && event.phase !== 'retention'
        return event.phase === 'round' && event.rank === stage.rank
      })
      stage.selected_summary =
        stage.id === 'answers'
          ? selected?.ranks.length
            ? `Rangfolge: ${selected.ranks.join(' · ')}`
            : selected?.status
          : stageEvents.length
            ? stageEvents
                .map((event) => `${event.workshop_title}: ${outcomeLabel(event.outcome)}`)
                .join(' · ')
            : '—'
    }
  }
  return stages
}
