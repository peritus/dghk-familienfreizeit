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
