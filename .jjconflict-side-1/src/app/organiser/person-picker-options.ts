export type PersonPickerIdentity = {
  id: string
  name: string
  family_name?: string | null
  external?: boolean
}

export type PersonPickerOption = { id: string; label: string }

function counts(values: readonly string[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1)
  return result
}

function shortId(id: string): string {
  return (id.split('_').at(-1) ?? id).slice(-4)
}

/** Keeps visible picker labels unique while preserving person identity in the option value. */
export function personPickerOptions(people: readonly PersonPickerIdentity[]): PersonPickerOption[] {
  const names = people.map((person) => (person.external ? `${person.name} (extern)` : person.name))
  const duplicateNames = counts(names)
  const labels = people.map((person, index) => {
    const name = names[index]!
    const family = person.family_name?.trim()
    return (duplicateNames.get(name) ?? 0) > 1 && family ? `${name} · Familie ${family}` : name
  })
  const duplicateLabels = counts(labels)
  const withShortIds = people.map((person, index) =>
    (duplicateLabels.get(labels[index]!) ?? 0) > 1
      ? `${labels[index]} · ${shortId(person.id) || person.id}`
      : labels[index]!,
  )
  const duplicateShortLabels = counts(withShortIds)

  return people.map((person, index) => ({
    id: person.id,
    label:
      (duplicateShortLabels.get(withShortIds[index]!) ?? 0) > 1
        ? `${withShortIds[index]} · ${person.id}`
        : withShortIds[index]!,
  }))
}
