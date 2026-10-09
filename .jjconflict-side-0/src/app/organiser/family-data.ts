import { attentionLabel } from './attention-label.js'
import type { AttentionResult } from '../../attention/types.js'
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
  age: number | null
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

export function labelNumber(labels: readonly Label[], key: string): number | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null
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
    age: labelNumber(labels, 'age'),
    role: labelValue(labels, 'role') ?? 'adult',
  }
}

export function personName(person: Pick<FamilyPerson, 'given_name' | 'family_name'>): string {
  return `${person.given_name} ${person.family_name}`.trim()
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

/** Completeness selects core/response attention; placement warnings do not change it. */
export function familyStatus(
  world: World,
  row: FamilyRow,
  attention: AttentionResult,
): FamilyStatus {
  const ids = new Set([row.family.id, ...row.persons.map((p) => p.id)])
  const codes = new Set([
    'kernel.family-without-persons',
    'kernel.child-age-missing',
    'family-preferences.response-missing',
    'family-preferences.response-inconsistent',
    'workshop-rankings.response-missing',
    'workshop-rankings.invalid-response',
  ])
  const open = attention.items
    .filter((i) => codes.has(i.code) && i.subjects.some((s) => ids.has(s.id)))
    .map((i) => attentionLabel(i, world, row.family.id))
  const unavailable = attention.coverage.some((c) => codes.has(c.code) && c.state === 'unavailable')
  return {
    complete: !unavailable && open.length === 0,
    open: unavailable ? [...open, 'Die Prüfung ist noch nicht vollständig.'] : open,
  }
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
