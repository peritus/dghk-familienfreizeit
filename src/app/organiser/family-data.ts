import type { Entity, World, Label } from '../../events/fold.js'

export type FamilyRow = {
  family: Entity
  display_name: string
  email: string
  persons: readonly Entity[]
}

export type FamilyPerson = {
  entity: Entity
  given_name: string
  family_name: string
  birthdate: string | null
  role: string
}

export type FamilyStatus = {
  complete: boolean
  open: readonly string[]
}

export function labelValue(labels: readonly Label[], key: string): string | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'string' ? value : null
}

export function labelBoolean(labels: readonly Label[], key: string): boolean | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'boolean' ? value : null
}

const roleLabels: Record<string, string> = {
  adult: 'Erwachsene(r)',
  child: 'Kind',
  infant: 'Baby',
}

const eventTypeLabels: Record<string, string> = {
  FamilyInvited: 'Familie eingeladen',
  PersonAdded: 'Person hinzugefügt',
  PersonUpdated: 'Person geändert',
  PersonWithdrawn: 'Person zurückgenommen',
  ['FamilyDisplayNameChanged']: 'Familienname geändert',
}

export function roleLabel(role: string): string {
  return roleLabels[role] ?? role
}

export function personView(world: World, person: Entity): FamilyPerson {
  const labels = world.labels_by_entity[person.id] ?? []
  return {
    entity: person,
    given_name: labelValue(labels, 'given-name') ?? '',
    family_name: labelValue(labels, 'family-name') ?? '',
    birthdate: labelValue(labels, 'birthdate'),
    role: labelValue(labels, 'role') ?? 'adult',
  }
}

export function personName(person: Pick<FamilyPerson, 'given_name' | 'family_name'>): string {
  return `${person.given_name} ${person.family_name}`.trim()
}

export function personAge(birthdate: string | null, today = new Date()): number | null {
  if (!birthdate) return null
  const date = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(date.valueOf())) return null
  let age = today.getFullYear() - date.getFullYear()
  const beforeBirthday =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

export function familyPeople(world: World, familyId: string): readonly FamilyPerson[] {
  return world.persons
    .filter((person) =>
      (world.labels_by_entity[person.id] ?? []).some(
        (label) => label.key === 'member-of' && label.value === familyId,
      ),
    )
    .map((person) => personView(world, person))
}

function workshopWishCount(world: World, personId: string): number {
  return (world.labels_by_entity[personId] ?? []).filter(
    (label) => label.key === 'prefers-workshop',
  ).length
}

/** The list status is a projection of the same labels edited by the detail views. */
export function familyStatus(world: World, row: FamilyRow): FamilyStatus {
  const open: string[] = []
  const familyLabels = world.labels_by_entity[row.family.id] ?? []
  for (const [key, label] of [
    ['needs-private-sanitary', 'Eigenes Bad'],
    ['needs-accessible', 'Barrierearmes Zimmer'],
    ['sole-occupancy', 'Zimmer allein'],
  ] as const) {
    if (!familyLabels.some((label) => label.key === key)) open.push(label)
  }

  if (row.persons.length === 0) open.push('Personen')
  for (const person of row.persons.map((entity) => personView(world, entity))) {
    const name = personName(person) || person.entity.id
    if (person.role === 'child' && !person.birthdate) open.push(`${name}: Alter`)
    if (!world.labels_by_entity[person.entity.id]?.some((label) => label.key === 'diet')) {
      open.push(`${name}: Essen`)
    }
    const target = person.role === 'infant' ? 0 : person.role === 'child' ? 2 : 1
    if (workshopWishCount(world, person.entity.id) < target) open.push(`${name}: Workshops`)
  }
  return { complete: open.length === 0, open }
}

export function eventTypeLabel(type: string): string {
  return eventTypeLabels[type] ?? type
}

export function familyRows(world: World): FamilyRow[] {
  return world.families.map((family) => {
    const labels = world.labels_by_entity[family.id] ?? []
    const persons = world.persons.filter((person) =>
      (world.labels_by_entity[person.id] ?? []).some(
        (label) => label.key === 'member-of' && label.value === family.id,
      ),
    )
    return {
      family,
      display_name: labelValue(labels, 'display-name') ?? family.id,
      email: labelValue(labels, 'email') ?? '—',
      persons,
    }
  })
}

export function findFamily(world: World, familyId: string): FamilyRow | null {
  return familyRows(world).find(({ family }) => family.id === familyId) ?? null
}
