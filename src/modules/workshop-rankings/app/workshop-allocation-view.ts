import type { KernelWorld, Label } from '../../../events/fold.js'
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

export type WorkshopAllocationTraceEvent = {
  id: string
  person_id: string
  workshop_id: string
  workshop_title: string
  rank: number | null
  outcome: WorkshopAllocationTraceOutcome
  detail: string
}

export type WorkshopAllocationProjection = {
  answers: readonly WorkshopAllocationAnswer[]
  demand: readonly WorkshopAllocationDemand[]
  trace_events: readonly WorkshopAllocationTraceEvent[]
  person_names: readonly { id: string; name: string }[]
  fixed_violation_count: number
  unassigned_count: number
  has_workshops: boolean
  has_answers: boolean
}

export type WorkshopAllocationTraceStage = {
  id: string
  label: string
  description: string
  fulfilled: number
  capacity: number
  overlap: number
  leader: number
  unscheduled: number
  open: number
  details?: string
  selected_summary?: string
}

type AllocationPerson = {
  id: string
  name: string
  group: Exclude<WorkshopAllocationGroup, 'all'>
  age_label: string
}

export type WorkshopAllocationProjectionInput = {
  world: KernelWorld
  plan: Plan
  event_date: string
  time_zone: string
  max_rank: number
}

function labelValue(labels: readonly Label[], key: string): string | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'string' ? value : null
}

function personName(world: KernelWorld, personId: string): string {
  const labels = world.labels_by_entity[personId] ?? []
  return (
    [labelValue(labels, 'given-name'), labelValue(labels, 'family-name')]
      .filter((value): value is string => Boolean(value))
      .join(' ') || personId
  )
}

function personGroup(
  world: KernelWorld,
  personId: string,
): Exclude<WorkshopAllocationGroup, 'all'> {
  return labelValue(world.labels_by_entity[personId] ?? [], 'role') === 'adult'
    ? 'adults'
    : 'children'
}

function ageLabel(world: KernelWorld, personId: string, eventDate: string): string {
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
  const reason = entry?.detail?.chosen?.terms?.[0]?.[0]
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

function outcomeLabel(outcome: WorkshopAllocationTraceOutcome): string {
  return {
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
  }[outcome]
}

function traceText(outcome: WorkshopAllocationTraceOutcome, entry?: TraceEntry): string {
  if (outcome === 'fulfilled') return 'Wunsch erfüllt.'
  if (outcome === 'retained') return 'Aus der vorherigen Berechnung übernommen.'
  if (outcome === 'dropped') return entry?.text ?? 'Aus der vorherigen Berechnung entfernt.'
  return entry?.text ?? outcomeLabel(outcome)
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
  for (const person of people) {
    const ranking = rankingsByPerson.get(person.id)
    for (const choice of ranking?.choices ?? []) {
      if (!choice.workshop_id || choice.rank === null) continue
      const workshop = workshops.get(choice.workshop_id)
      const key = `${person.id}|${choice.workshop_id}`
      const placed = assignmentByChoice.get(key)
      const trace = traceByChoice.get(key)
      const outcome: WorkshopAllocationTraceOutcome = placed
        ? placed.reason === 'retained'
          ? 'retained'
          : 'fulfilled'
        : traceReason(trace)
      traceEvents.push({
        id: `${person.id}-${choice.workshop_id}-${choice.rank}`,
        person_id: person.id,
        workshop_id: choice.workshop_id,
        workshop_title: workshop?.title ?? choice.workshop_id,
        rank: choice.rank,
        outcome,
        detail: traceText(outcome, trace),
      })
    }
  }
  for (const drop of assignment.retention_drops) {
    traceEvents.push({
      id: `drop-${drop.person_id}-${drop.workshop_id}-${drop.slot_id}`,
      person_id: drop.person_id,
      workshop_id: drop.workshop_id,
      workshop_title: workshops.get(drop.workshop_id)?.title ?? drop.workshop_id,
      rank: null,
      outcome: 'dropped',
      detail: drop.reason,
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
    person_names: people.map(({ id, name }) => ({ id, name })),
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
  const total = events.filter((event) => event.rank !== null).length
  const stages: WorkshopAllocationTraceStage[] = [
    {
      id: 'answers',
      label: 'Wünsche abgegeben',
      description: `von ${new Set(events.map((event) => event.person_id)).size} Personen`,
      fulfilled: 0,
      capacity: 0,
      overlap: 0,
      leader: 0,
      unscheduled: 0,
      open: total,
    },
  ]
  const maxRank = Math.max(0, ...events.map((event) => event.rank ?? 0))
  let processed = 0
  for (let rank = 1; rank <= maxRank; rank += 1) {
    const round = events.filter((event) => event.rank === rank)
    const count = (outcome: WorkshopAllocationTraceOutcome) =>
      round.filter((event) => event.outcome === outcome).length
    const fulfilled = count('fulfilled') + count('retained')
    const capacity = count('capacity')
    const overlap = count('overlap')
    const leader = count('leader')
    const unscheduled = count('unscheduled')
    processed += fulfilled + capacity + overlap + leader + unscheduled
    const examples = round
      .filter((event) => event.outcome !== 'fulfilled')
      .slice(0, 2)
      .map((event) => `${event.workshop_title}: ${outcomeLabel(event.outcome)}`)
      .join(' · ')
    stages.push({
      id: `round-${rank}`,
      label: `Runde ${rank}`,
      description: `${rank === 1 ? 'Erstwünsche' : `${rank}. Wünsche`} · ${round.length} Wünsche`,
      fulfilled,
      capacity,
      overlap,
      leader,
      unscheduled,
      open: Math.max(0, total - processed),
      details: examples || undefined,
    })
  }
  const retained = events.filter((event) => event.outcome === 'retained').length
  const dropped = events.filter((event) => event.outcome === 'dropped').length
  if (retained || dropped) {
    stages.splice(1, 0, {
      id: 'retention',
      label: 'Übernommen',
      description: 'aus der vorherigen Berechnung',
      fulfilled: retained,
      capacity: 0,
      overlap: 0,
      leader: 0,
      unscheduled: 0,
      open: Math.max(0, total - retained),
      details: dropped ? `${dropped} Wunsch nicht mehr passend` : undefined,
    })
  }
  if (selectedPersonId) {
    const selected = projection.answers.find((answer) => answer.id === selectedPersonId)
    const selectedEvents = events.filter((event) => event.person_id === selectedPersonId)
    for (const stage of stages) {
      const stageEvents = selectedEvents.filter((event) => {
        if (stage.id === 'answers') return true
        if (stage.id === 'retention')
          return event.outcome === 'retained' || event.outcome === 'dropped'
        return event.rank === Number(stage.id.replace('round-', ''))
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
