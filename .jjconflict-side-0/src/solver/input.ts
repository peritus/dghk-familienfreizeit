import { canonicalJson, type JsonValue } from '../events/types.js'
import type { World } from '../events/fold.js'
import type {
  Plan,
  SolverContributions,
  SolverFamily,
  SolverInput,
  SolverLabel,
  SolverPerson,
} from './types.js'

export function buildSolverInput(
  world: World,
  contributions: SolverContributions = {},
  previousPlan: Plan | null = null,
): SolverInput {
  const familyIds = new Set(world.families.map(({ id }) => id))
  const persons = world.persons
    .map((person): SolverPerson | null => {
      const familyId = labelValue(world, person.id, 'member-of')
      return typeof familyId === 'string' && familyIds.has(familyId)
        ? { ...person, family_id: familyId }
        : null
    })
    .filter((person): person is SolverPerson => person !== null)
  const personsByFamily = new Map<string, string[]>()
  for (const person of persons)
    (
      personsByFamily.get(person.family_id) ??
      personsByFamily.set(person.family_id, []).get(person.family_id)!
    ).push(person.id)
  const families: SolverFamily[] = world.families.map((family) => ({
    ...family,
    person_ids: freezeSorted(personsByFamily.get(family.id) ?? [], (left, right) =>
      left.localeCompare(right),
    ),
  }))
  const labels: SolverLabel[] = world.labels.map((label) => ({
    entity_id: label.entity_id,
    key: label.key,
    value: label.value,
    strength: label.strength,
    set_seq: label.set_seq,
  }))
  const capabilities = new Map<string, ReadonlySet<string>>()
  for (const capability of world.capabilities) {
    const values = new Set(capabilities.get(capability.entity_id) ?? [])
    values.add(capability.key)
    capabilities.set(capability.entity_id, Object.freeze(values))
  }
  const moduleInputs = Object.fromEntries(
    (contributions.solver_input ?? [])
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((contribution) => [contribution.id, contribution.build(world)]),
  )
  return {
    input_seq: world.head_seq,
    families: freezeSorted(families, compareEntity),
    persons: freezeSorted(
      persons,
      (left, right) => left.family_id.localeCompare(right.family_id) || compareEntity(left, right),
    ),
    labels: sortedLabels(labels),
    capabilities,
    constraints: freezeSorted(
      world.constraints.map((constraint) => ({ ...constraint })),
      (left, right) =>
        firstNonZero([
          left.set_seq - right.set_seq,
          left.holder_id.localeCompare(right.holder_id),
          left.key.localeCompare(right.key),
          left.value.localeCompare(right.value),
        ]),
    ),
    requirements: freezeSorted(
      world.requirements.map((requirement) => ({ ...requirement })),
      compareRequirement,
    ),
    rules: Object.freeze(
      (contributions.rules ?? []).slice().sort((left, right) => left.id.localeCompare(right.id)),
    ),
    module_inputs: Object.freeze(moduleInputs),
    previous_plan: previousPlan,
  }
}

function labelValue(world: World, entityId: string, key: string): JsonValue | undefined {
  return world.labels_by_entity[entityId]?.find((label) => label.key === key)?.value
}

function compareEntity(
  left: { sort_key: number; id: string },
  right: { sort_key: number; id: string },
): number {
  return firstNonZero([left.sort_key - right.sort_key, left.id.localeCompare(right.id)])
}

/**
 * Sorts labels on a canonical form computed once per label rather than inside
 * the comparator. Canonicalizing during comparison re-serialized the same value
 * on every one of the O(n log n) comparisons across the whole label store — and
 * `deriveTransition` builds two solver inputs per organiser keystroke.
 */
function sortedLabels(labels: readonly SolverLabel[]): readonly SolverLabel[] {
  const keyed = labels.map((label) => ({ label, canonical: canonicalJson(label.value) }))
  keyed.sort((left, right) =>
    firstNonZero([
      left.label.entity_id.localeCompare(right.label.entity_id),
      left.label.key.localeCompare(right.label.key),
      left.canonical.localeCompare(right.canonical),
      (left.label.strength ?? '').localeCompare(right.label.strength ?? ''),
      left.label.set_seq - right.label.set_seq,
    ]),
  )
  return Object.freeze(keyed.map(({ label }) => label))
}

function compareRequirement(
  left: SolverInput['requirements'][number],
  right: SolverInput['requirements'][number],
): number {
  return firstNonZero([
    left.holder_id.localeCompare(right.holder_id),
    left.trait_key.localeCompare(right.trait_key),
    (left.capability_key ?? '').localeCompare(right.capability_key ?? ''),
    left.kind.localeCompare(right.kind),
    (left.structural ?? '').localeCompare(right.structural ?? ''),
    (left.value ?? '').localeCompare(right.value ?? ''),
    (left.strength ?? '').localeCompare(right.strength ?? ''),
    (left.weight ?? 0) - (right.weight ?? 0),
    (left.penalty ?? 0) - (right.penalty ?? 0),
    left.set_seq - right.set_seq,
  ])
}

function firstNonZero(comparisons: readonly number[]): number {
  for (const comparison of comparisons) if (comparison !== 0) return comparison
  return 0
}

function freezeSorted<T>(
  items: readonly T[],
  compare: (left: T, right: T) => number,
): readonly T[] {
  return Object.freeze(items.slice().sort(compare))
}
