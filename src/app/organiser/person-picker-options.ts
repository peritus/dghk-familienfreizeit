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

/** Keeps human-readable picker labels unique while preserving identity in the option value. */
export function personPickerOptions(people: readonly PersonPickerIdentity[]): PersonPickerOption[] {
  const names = people.map((person) => (person.external ? `${person.name} (extern)` : person.name))
  const duplicateNames = counts(names)
  const labels = people.map((person, index) => {
    const name = names[index]!
    const family = person.family_name?.trim()
    return (duplicateNames.get(name) ?? 0) > 1 && family ? `${name} · Familie ${family}` : name
  })
  const duplicateLabels = counts(labels)
  const occurrences = new Map<string, number>()

  return people.map((person, index) => {
    const label = labels[index]!
    if ((duplicateLabels.get(label) ?? 0) <= 1) return { id: person.id, label }
    const occurrence = (occurrences.get(label) ?? 0) + 1
    occurrences.set(label, occurrence)
    return { id: person.id, label: `${label} · Person ${occurrence}` }
  })
}
