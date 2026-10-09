import type { World } from '../events/fold.js'

/** The audience one feature serves (spec/architecture/features.md §1). */
export type FeatureAudience = 'family' | 'organiser'

export type FeatureReadinessResult =
  | { ready: true }
  | { ready: false; reason: string; finding_id: string }

/** Module-owned, pure readiness over the derived world. */
export type FeatureReadiness = (world: World) => FeatureReadinessResult

/** A module-owned capability offered to one audience (features.md §3). */
export type FeatureDefinition = {
  id: string
  audience: FeatureAudience
  subject_kind: string | null
  requires_features: readonly string[]
  requires_phases: readonly string[]
  activation_mode: 'all' | 'any'
  readiness?: FeatureReadiness
  /** The organiser feature offering the same writes; required for a family feature (D24). */
  organiser_counterpart?: string
}

export type DeclaredFeature = FeatureDefinition & { owner: string }

type FeatureModule = {
  id: string
  requires: readonly string[]
  deselected_features: readonly string[]
  contributions: {
    features?: readonly FeatureDefinition[]
    entity_kinds?: readonly { id: string }[]
    phases?: readonly { id: string }[]
  }
}

/** The Worker binding name of one feature (features.md §6). */
export function featureBindingName(feature: string): string {
  return `DGHK_FEATURE_${feature.toUpperCase().replace(/[.-]/g, '_')}`
}

/** Every feature declared by the selected modules, keyed by id, in module order. */
export function declaredFeatures(
  modules: readonly Pick<FeatureModule, 'id' | 'contributions'>[],
): ReadonlyMap<string, DeclaredFeature> {
  return new Map(
    modules.flatMap((module) =>
      (module.contributions.features ?? []).map(
        (feature) => [feature.id, { ...feature, owner: module.id }] as const,
      ),
    ),
  )
}

/** The binding names of every declared feature, sorted. */
export function featureBindingNames(
  modules: readonly Pick<FeatureModule, 'id' | 'contributions'>[],
): readonly string[] {
  return [...declaredFeatures(modules).keys()].map(featureBindingName).sort()
}

/**
 * Validates feature contributions, deselections, and section governance at profile build
 * (features.md §5). `governingFeatures` lists, per family-preferences section, the feature
 * ids the section names.
 */
export function validateFeatures(
  modules: readonly FeatureModule[],
  kernelEntityKinds: readonly string[],
  governingFeatures: readonly (readonly string[])[],
): void {
  const seen = new Set<string>()
  for (const module of modules)
    for (const feature of module.contributions.features ?? []) {
      if (seen.has(feature.id)) throw new Error(`duplicate contribution: feature:${feature.id}`)
      seen.add(feature.id)
    }
  const features = declaredFeatures(modules)
  const moduleById = new Map(modules.map((module) => [module.id, module]))
  const entityKinds = new Set([
    ...kernelEntityKinds,
    ...modules.flatMap((module) => module.contributions.entity_kinds?.map(({ id }) => id) ?? []),
  ])
  const phases = new Set(
    modules.flatMap((module) => module.contributions.phases?.map(({ id }) => id) ?? []),
  )
  for (const feature of features.values()) {
    const [owner, name, ...rest] = feature.id.split('.')
    if (
      owner !== feature.owner ||
      !name ||
      rest.length > 0 ||
      !kebab(name) ||
      !name.startsWith(`${feature.audience}-`)
    )
      throw new Error(
        `feature ${feature.id} must be named ${feature.owner}.${feature.audience}-<kebab-case>`,
      )
    if (feature.audience === 'family') {
      const counterpart = feature.organiser_counterpart
        ? features.get(feature.organiser_counterpart)
        : undefined
      if (
        !counterpart ||
        counterpart.audience !== 'organiser' ||
        counterpart.owner !== feature.owner
      )
        throw new Error(
          `family feature ${feature.id} needs an organiser counterpart of module ${feature.owner}`,
        )
    } else if (feature.organiser_counterpart) {
      throw new Error(`organiser feature ${feature.id} cannot name an organiser counterpart`)
    }
    if (feature.subject_kind !== null && !entityKinds.has(feature.subject_kind))
      throw new Error(`feature ${feature.id} names unknown subject kind ${feature.subject_kind}`)
    for (const required of feature.requires_features) {
      const dependency = features.get(required)
      if (!dependency) throw new Error(`feature ${feature.id} requires unknown feature ${required}`)
      if (
        dependency.owner !== feature.owner &&
        !moduleById.get(feature.owner)!.requires.includes(dependency.owner)
      )
        throw new Error(
          `feature ${feature.id} requires ${required} of module ${dependency.owner}, which ${feature.owner} does not require`,
        )
      if (
        feature.subject_kind !== null &&
        dependency.subject_kind !== null &&
        feature.subject_kind !== dependency.subject_kind
      )
        throw new Error(`feature ${feature.id} subject kind differs from required ${required}`)
    }
    for (const phase of feature.requires_phases)
      if (!phases.has(phase))
        throw new Error(`feature ${feature.id} requires unknown phase ${phase}`)
  }
  assertAcyclic(features)
  for (const section of governingFeatures) {
    const audiences = new Set<string>()
    for (const id of section) {
      const feature = features.get(id)
      if (!feature) throw new Error(`family preference section names unknown feature: ${id}`)
      if (audiences.has(feature.audience))
        throw new Error(
          `family preference section names two ${feature.audience} features: ${section.join(', ')}`,
        )
      audiences.add(feature.audience)
    }
  }
  for (const module of modules)
    for (const deselected of module.deselected_features ?? [])
      if (features.get(deselected)?.owner !== module.id)
        throw new Error(`module ${module.id} deselects unknown feature ${deselected}`)
  const bindings = new Map<string, string>()
  for (const feature of features.keys()) {
    const name = featureBindingName(feature)
    const other = bindings.get(name)
    if (other) throw new Error(`feature binding ${name} is shared by ${other} and ${feature}`)
    bindings.set(name, feature)
  }
}

function assertAcyclic(features: ReadonlyMap<string, FeatureDefinition>): void {
  const done = new Set<string>()
  const visiting = new Set<string>()
  const visit = (id: string): void => {
    if (done.has(id)) return
    if (visiting.has(id)) throw new Error(`feature requirements form a cycle at ${id}`)
    visiting.add(id)
    for (const required of features.get(id)?.requires_features ?? []) visit(required)
    visiting.delete(id)
    done.add(id)
  }
  for (const id of features.keys()) visit(id)
}

function kebab(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
}
