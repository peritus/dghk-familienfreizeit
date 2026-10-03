import type { Event, JsonValue } from '../../src/events/types.js'

/**
 * Entity counts a generated log produces. Reported alongside each measurement so
 * a bench row states its own shape instead of only an opaque event total.
 */
export type SyntheticScale = {
  buildings: number
  rooms: number
  beds: number
  spaces: number
  slots: number
  workshops: number
  families: number
  persons: number
  rankings: number
  requirements: number
}

const eventDays = ['2027-04-30', '2027-05-01']
const slotsPerDay = 4
const sanitaryValues = ['private', 'shared-floor', 'remote-shared']
const floors = ['ground', 'first', 'second', 'attic']
const audiences = ['children', 'adults', 'all']

/**
 * Scales what actually grows between two occasions. The programme grid stays
 * fixed because it is bounded by the length of the occasion, not by how many
 * families attend: slots and spaces are a venue's timetable, and generating
 * thousands of them would measure the slot-overlap validator rather than the
 * fold.
 */
export function syntheticScale(factor: number): SyntheticScale {
  const rooms = 25 * factor
  const families = 30 * factor
  const persons = families * 3
  return {
    buildings: 4,
    rooms,
    beds: rooms * 3,
    spaces: 12,
    slots: slotsPerDay * eventDays.length,
    workshops: 15 * factor,
    families,
    persons,
    rankings: persons * 3,
    // Sparse on purpose: most families state no special need, and inflating
    // this would measure a population the occasion does not have.
    requirements: requirementLabels(families).length,
  }
}

/**
 * Per-family accommodation needs, at the density a real occasion shows them.
 * These are what reach the resolver as constraints, requirements and
 * capabilities, so a log without them exercises neither `resolve` nor the
 * shared-world projection.
 */
function requirementLabels(families: number): readonly { family: number; label: LabelWrite }[] {
  const labels: { family: number; label: LabelWrite }[] = []
  for (let index = 0; index < families; index += 1) {
    if (index % 4 === 0)
      labels.push({
        family: index,
        label: { key: 'needs-private-sanitary', value: 'private-sanitary', strength: 'preferred' },
      })
    if (index % 5 === 0)
      labels.push({
        family: index,
        label: { key: 'needs-accessible', value: 'accessible', strength: 'required' },
      })
    if (index % 3 === 0)
      labels.push({
        family: index,
        label: { key: 'needs-ground-floor', value: 'ground-floor', strength: 'preferred' },
      })
    if (index % 11 === 0)
      labels.push({
        family: index,
        label: { key: 'sole-occupancy', value: 'no-other-families', strength: 'required' },
      })
    if (index % 7 === 0 && families > 1)
      labels.push({
        family: index,
        label: {
          key: 'apart-from',
          value: `fam_${(index + 1) % families}`,
          strength: 'required',
        },
      })
  }
  return labels
}

type LabelWrite = { key: string; value: JsonValue; strength: 'required' | 'preferred' | null }

/**
 * A deterministic event log valid for `familienfreizeit-2027`: every event
 * passes its module validator, and rooms carry both `exactly-one` traits so the
 * measurement is not distorted by thousands of cardinality diagnostics.
 */
export function syntheticLog(scale: SyntheticScale): Event[] {
  const events: Event[] = []
  let seq = 0
  const append = (type: string, payload: JsonValue): void => {
    seq += 1
    events.push({
      seq,
      at: '2027-01-01T00:00:00Z',
      actor: 'bench@example.test',
      subject: null,
      type,
      payload,
    })
  }

  for (let index = 0; index < scale.buildings; index += 1)
    append('BuildingAdded', {
      building_id: `bld_${index}`,
      name: `Haus ${index}`,
      sort_key: index + 1,
    })

  for (let index = 0; index < scale.rooms; index += 1) {
    const roomId = `rm_${index}`
    append('RoomAdded', {
      room_id: roomId,
      building_id: `bld_${index % scale.buildings}`,
      number: String(index + 1),
      floor: floors[index % floors.length] ?? null,
      room_type: index % 7 === 0 ? 'apartment' : 'standard',
      sort_key: index + 1,
    })
    append('LabelSet', {
      entity_id: roomId,
      key: 'sanitary',
      value: sanitaryValues[index % sanitaryValues.length] ?? 'shared-floor',
      strength: null,
      note: null,
    })
    append('LabelSet', {
      entity_id: roomId,
      key: 'price-per-bed-eur',
      value: 60 + (index % 40),
      strength: null,
      note: null,
    })
  }

  for (let index = 0; index < scale.beds; index += 1) {
    const roomIndex = index % scale.rooms
    append('BedAdded', {
      bed_id: `bed_${index}`,
      room_id: `rm_${roomIndex}`,
      label: `B${index}`,
      bed_type: index % 3 === 0 ? 'double' : 'single',
      sleeps: index % 3 === 0 ? 2 : 1,
      sort_key: index + 1,
    })
  }

  for (let index = 0; index < scale.spaces; index += 1)
    append('WorkshopSpaceAdded', {
      workshop_space_id: `wsp_${index}`,
      name: `Raum ${index}`,
      location_description: `Haus ${index % scale.buildings}`,
      capacity: 12 + (index % 10),
      availability_windows: [{ starts_at: windowStart(), ends_at: windowEnd() }],
      sort_key: index + 1,
    })

  for (let index = 0; index < scale.slots; index += 1) {
    const day = eventDays[Math.floor(index / slotsPerDay)] ?? eventDays[0]
    const hour = 9 + 2 * (index % slotsPerDay)
    // 90 minutes long, starting every two hours: a 30 minute gap keeps
    // consecutive slots from touching, which the slot validator rejects.
    append('WorkshopSlotAdded', {
      slot_id: `slot_${index}`,
      starts_at: `${day}T${pad(hour)}:00:00Z`,
      ends_at: `${day}T${pad(hour + 1)}:30:00Z`,
      sort_key: index + 1,
    })
  }

  for (let index = 0; index < scale.workshops; index += 1)
    append('WorkshopAdded', {
      workshop_id: `wks_${index}`,
      title: `Workshop ${index}`,
      description: `Beschreibung ${index}`,
      audience: audiences[index % audiences.length] ?? 'all',
      age_min: 6,
      age_max: 99,
      capacity: 8 + (index % 12),
      participation_mode: 'assigned',
      leader_ids: [],
      needs: [],
      sort_key: index + 1,
    })

  const personsPerFamily = Math.max(1, Math.round(scale.persons / scale.families))
  let personIndex = 0
  for (let index = 0; index < scale.families; index += 1) {
    const familyId = `fam_${index}`
    append('FamilyInvited', {
      family_id: familyId,
      email: `f${index}@example.test`,
      display_name: `Familie ${index}`,
      locale: 'de',
    })
    for (let member = 0; member < personsPerFamily && personIndex < scale.persons; member += 1) {
      append('PersonAdded', {
        person_id: `per_${personIndex}`,
        family_id: familyId,
        given_name: `Vorname ${personIndex}`,
        family_name: `Familie ${index}`,
        birthdate: member === 0 ? '1986-06-15' : '2017-06-15',
        role: member === 0 ? 'adult' : 'child',
      })
      personIndex += 1
    }
  }

  // After every family exists, so an `apart-from` reference never dangles.
  for (const { family, label } of requirementLabels(scale.families))
    append('LabelSet', {
      entity_id: `fam_${family}`,
      key: label.key,
      value: label.value,
      strength: label.strength,
      note: null,
    })

  const ranksPerPerson = Math.max(1, Math.round(scale.rankings / Math.max(1, personIndex)))
  for (let person = 0; person < personIndex; person += 1)
    for (let rank = 1; rank <= ranksPerPerson; rank += 1)
      append('LabelSet', {
        entity_id: `per_${person}`,
        key: 'prefers-workshop',
        value: { workshop_id: `wks_${(person * ranksPerPerson + rank) % scale.workshops}`, rank },
        strength: null,
        note: null,
      })

  return events
}

function windowStart(): string {
  return `${eventDays[0]}T08:00:00Z`
}

function windowEnd(): string {
  return `${eventDays[eventDays.length - 1]}T20:00:00Z`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
