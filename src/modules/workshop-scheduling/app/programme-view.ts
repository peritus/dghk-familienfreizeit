import type { WorkshopRecord } from '../../official-workshops/index.js'
import type { WorkshopRanking } from '../../workshop-rankings/index.js'
import type { SpaceSlotBlock, WorkshopPlacement, WorkshopSlot } from '../index.js'
import type { WorkshopSpace } from '../../workshop-space/index.js'

export type ProgrammeCellProjection = {
  id: string
  state: 'blocked' | 'empty' | 'placed'
  title?: string
  audience?: string
  age_range?: string
  leaders?: string
  capacity_label?: string
  demand_label?: string
}

export type ProgrammeRowProjection = {
  id: string
  day_label: string
  slot_label: string
  cells: readonly ProgrammeCellProjection[]
}

export type UnplacedWorkshopProjection = {
  id: string
  title: string
  reason: string
  demand_label?: string
}

export type WorkshopOverlapProjection = {
  id: string
  workshops: string
  slot: string
  people_count: number
  people: readonly string[]
}

export type ProgrammeViewProjection = {
  rooms: readonly { id: string; label: string }[]
  rows: readonly ProgrammeRowProjection[]
  unplaced: readonly UnplacedWorkshopProjection[]
  overlaps: readonly WorkshopOverlapProjection[]
}

export type ProgrammeProjectionInput = {
  workshops: readonly WorkshopRecord[]
  slots: readonly WorkshopSlot[]
  spaces: readonly WorkshopSpace[]
  blocks: readonly SpaceSlotBlock[]
  placements: readonly WorkshopPlacement[]
  unscheduled: readonly { workshop_id: string; reason: string }[]
  demand: Readonly<Record<string, number>>
  assignments: readonly { person_id: string; workshop_id: string }[]
  signups: readonly { person_id: string; workshop_id: string }[]
  interests: readonly { person_id: string; workshop_id: string }[]
  rankings: readonly WorkshopRanking[]
  person_names: ReadonlyMap<string, string>
  leader_names: ReadonlyMap<string, string>
  overlap_rank: number
  time_zone: string
}

function dateLabel(value: string, timeZone: string): string {
  return new globalThis.Date(value).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    timeZone,
  })
}

function timeLabel(startsAt: string, endsAt: string, timeZone: string): string {
  const starts = new globalThis.Date(startsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  const ends = new globalThis.Date(endsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  return `${starts}–${ends}`
}

function audienceLabel(audience: string): string {
  return { children: 'Kinder', adults: 'Erwachsene', all: 'Alle' }[audience] ?? audience
}

function placementLabel(slot: WorkshopSlot | undefined, timeZone: string): string {
  if (!slot) return 'Im Programm platziert'
  return `${dateLabel(slot.starts_at, timeZone)}, ${timeLabel(slot.starts_at, slot.ends_at, timeZone)}`
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'hard.space-occupied':
      return 'Alle passenden Raum-Slots sind bereits belegt.'
    case 'hard.space-capacity':
      return 'Kein passender Raum bietet genügend Plätze.'
    case 'hard.space-unavailable':
      return 'Kein passender Raum ist in einem Slot verfügbar.'
    case 'hard.space-slot-blocked':
      return 'Passende Raum-Slots sind gesperrt.'
    case 'hard.missing-capability':
      return 'Kein Raum erfüllt die benötigten Eigenschaften.'
    case 'hard.leader-conflict':
      return 'Eine Leitung ist in den passenden Slots bereits eingeplant.'
    case 'hard.no-slot-or-space':
      return 'Es gibt keinen passenden Slot oder Raum.'
    default:
      return reason
  }
}

export function buildProgrammeView(input: ProgrammeProjectionInput): ProgrammeViewProjection {
  const workshops = new Map(input.workshops.map((workshop) => [workshop.id, workshop]))
  const placements = new Map(
    input.placements.map((placement) => [placement.workshop_id, placement]),
  )
  const slots = new Map(input.slots.map((slot) => [slot.id, slot]))
  const unscheduled = new Map(input.unscheduled.map((item) => [item.workshop_id, item.reason]))
  const attendance = new Map<string, number>()
  for (const item of [...input.assignments, ...input.signups])
    attendance.set(item.workshop_id, (attendance.get(item.workshop_id) ?? 0) + 1)
  const interests = new Map<string, number>()
  for (const item of input.interests)
    interests.set(item.workshop_id, (interests.get(item.workshop_id) ?? 0) + 1)

  const rooms = input.spaces.map((space) => ({ id: space.id, label: space.name }))
  const rows = input.slots.map((slot) => ({
    id: slot.id,
    day_label: dateLabel(slot.starts_at, input.time_zone),
    slot_label: timeLabel(slot.starts_at, slot.ends_at, input.time_zone),
    cells: rooms.map((room) => {
      const blocked = input.blocks.some(
        (block) => block.slot_id === slot.id && block.space_id === room.id,
      )
      if (blocked) return { id: `${slot.id}-${room.id}`, state: 'blocked' as const }
      const placement = input.placements.find(
        (candidate) => candidate.slot_id === slot.id && candidate.space_id === room.id,
      )
      const workshop = placement ? workshops.get(placement.workshop_id) : undefined
      if (!workshop) return { id: `${slot.id}-${room.id}`, state: 'empty' as const }
      const leaderNames = workshop.leader_ids
        .map((leaderId) => input.leader_names.get(leaderId) ?? leaderId)
        .join(', ')
      const count = attendance.get(workshop.id) ?? 0
      const remaining = workshop.capacity - count
      const capacityLabel =
        workshop.mode === 'interest'
          ? `${interests.get(workshop.id) ?? 0} Interessen`
          : `${count} / ${workshop.capacity} · ${
              remaining > 0 ? `${remaining} frei` : remaining === 0 ? 'voll' : 'über Kapazität'
            }`
      return {
        id: workshop.id,
        state: 'placed' as const,
        title: workshop.title,
        audience: audienceLabel(workshop.audience),
        age_range: `${workshop.age_min}–${workshop.age_max} Jahre`,
        leaders: leaderNames,
        capacity_label: capacityLabel,
        demand_label: input.demand[workshop.id]
          ? `${input.demand[workshop.id]} Wünsche`
          : undefined,
      }
    }),
  }))

  const unplaced = input.workshops
    .filter((workshop) => !placements.has(workshop.id))
    .map((workshop) => ({
      id: workshop.id,
      title: workshop.title,
      reason: reasonLabel(unscheduled.get(workshop.id) ?? 'hard.no-slot-or-space'),
      demand_label:
        workshop.mode === 'assigned'
          ? `${input.demand[workshop.id] ?? 0} Wünsche · Kapazität ${workshop.capacity}`
          : workshop.mode === 'sign-up'
            ? `${input.signups.filter((item) => item.workshop_id === workshop.id).length} Anmeldungen`
            : `${input.interests.filter((item) => item.workshop_id === workshop.id).length} Interessen`,
    }))

  const overlapPeople = new Map<string, Set<string>>()
  for (const ranking of input.rankings) {
    const choices = ranking.choices
      .filter(
        (choice): choice is { workshop_id: string; rank: number } =>
          choice.workshop_id !== null && choice.rank !== null && choice.rank <= input.overlap_rank,
      )
      .filter((choice) => placements.has(choice.workshop_id))
    for (let first = 0; first < choices.length; first += 1) {
      for (let second = first + 1; second < choices.length; second += 1) {
        const firstId = choices[first]?.workshop_id
        const secondId = choices[second]?.workshop_id
        if (!firstId || !secondId) continue
        if (placements.get(firstId)?.slot_id !== placements.get(secondId)?.slot_id) continue
        const key = [firstId, secondId].sort().join(':')
        const people = overlapPeople.get(key) ?? new Set<string>()
        people.add(ranking.person_id)
        overlapPeople.set(key, people)
      }
    }
  }
  const overlaps = [...overlapPeople.entries()]
    .map(([id, people]) => {
      const [firstId, secondId] = id.split(':')
      const first = firstId ? workshops.get(firstId) : undefined
      const second = secondId ? workshops.get(secondId) : undefined
      const placement = firstId ? placements.get(firstId) : undefined
      return {
        id,
        workshops: `${first?.title ?? firstId} + ${second?.title ?? secondId}`,
        slot: placementLabel(placement ? slots.get(placement.slot_id) : undefined, input.time_zone),
        people_count: people.size,
        people: [...people]
          .map((personId) => input.person_names.get(personId) ?? personId)
          .sort((a, b) => a.localeCompare(b, 'de')),
      }
    })
    .sort(
      (first, second) =>
        second.people_count - first.people_count ||
        first.workshops.localeCompare(second.workshops, 'de'),
    )

  return { rooms, rows, unplaced, overlaps }
}
