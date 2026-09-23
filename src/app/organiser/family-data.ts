import type { Entity, KernelWorld, Label } from '../../events/fold.js'

export type FamilyRow = {
  family: Entity
  display_name: string
  email: string
  persons: readonly Entity[]
}

export function labelValue(labels: readonly Label[], key: string): string | null {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'string' ? value : null
}

export function familyRows(world: KernelWorld): FamilyRow[] {
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

export function findFamily(world: KernelWorld, familyId: string): FamilyRow | null {
  return familyRows(world).find(({ family }) => family.id === familyId) ?? null
}
