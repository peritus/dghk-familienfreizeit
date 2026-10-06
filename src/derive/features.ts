import type { ProfileModule } from '../config/define.js'
import {
  declaredFeatures,
  type DeclaredFeature,
  type FeatureAudience,
  type FeatureReadinessResult,
} from '../config/features.js'
import type { World } from '../events/fold.js'

/** One set operational binding (spec/architecture/features.md §6). */
export type FeatureOverride = { feature: string; value: 'on' | 'off' }

/** Every availability layer of one declared feature (features.md §4, §7). */
export type FeatureAvailability = {
  feature: string
  audience: FeatureAudience
  declared: true
  selected: boolean
  operational: 'built' | 'env-on' | 'env-off'
  phase_active: boolean
  ready: boolean
  not_ready: Extract<FeatureReadinessResult, { ready: false }> | null
  /** The first `requires_features` entry that is not effective, when any. */
  failing_requirement: string | null
  authorised: boolean
  effective: boolean
}

export type FeatureViewInput = {
  modules: readonly ProfileModule[]
  world: World
  overrides: readonly FeatureOverride[]
  /** Whether a phase currently activates its features; supplied by the phase view. */
  phase_active: (phase: string) => boolean
  /**
   * The principal's audience, or `diagnostics` to evaluate `authorised` for each feature's own
   * audience, as the organiser feature view does (features.md §7).
   */
  principal: FeatureAudience | 'diagnostics' | null
}

/** Derives every layer of every declared feature, in module and declaration order. */
export function deriveFeatureView(input: FeatureViewInput): readonly FeatureAvailability[] {
  const features = declaredFeatures(input.modules)
  const deselected = new Set(input.modules.flatMap((module) => module.deselected_features ?? []))
  const overrides = new Map(input.overrides.map(({ feature, value }) => [feature, value]))
  const results = new Map<string, FeatureAvailability>()
  const evaluate = (feature: DeclaredFeature): FeatureAvailability => {
    const known = results.get(feature.id)
    if (known) return known
    const override = overrides.get(feature.id)
    const selected = !deselected.has(feature.id)
    const phaseActive =
      feature.requires_phases.length === 0 ||
      (feature.activation_mode === 'all'
        ? feature.requires_phases.every(input.phase_active)
        : feature.requires_phases.some(input.phase_active))
    const readiness = feature.readiness?.(input.world) ?? { ready: true as const }
    const failingRequirement =
      feature.requires_features.find((id) => {
        const dependency = features.get(id)
        return !dependency || !evaluate(dependency).effective
      }) ?? null
    const ready = readiness.ready && failingRequirement === null
    const authorised =
      input.principal === 'diagnostics' ? true : input.principal === feature.audience
    const result: FeatureAvailability = {
      feature: feature.id,
      audience: feature.audience,
      declared: true,
      selected,
      operational: override === 'on' ? 'env-on' : override === 'off' ? 'env-off' : 'built',
      phase_active: phaseActive,
      ready,
      not_ready: readiness.ready ? null : readiness,
      failing_requirement: failingRequirement,
      authorised,
      effective:
        (selected || override === 'on') && override !== 'off' && phaseActive && ready && authorised,
    }
    results.set(feature.id, result)
    return result
  }
  return [...features.values()].map(evaluate)
}

/** The ids of the features that are effective in a derived feature view. */
export function effectiveFeatureIds(view: readonly FeatureAvailability[]): ReadonlySet<string> {
  return new Set(view.filter(({ effective }) => effective).map(({ feature }) => feature))
}

/** The family feature view: only the effective family features, without layer detail. */
export function familyFeatureView(
  view: readonly FeatureAvailability[],
): readonly { feature: string }[] {
  return view
    .filter(({ audience, effective }) => audience === 'family' && effective)
    .map(({ feature }) => ({ feature }))
}

/**
 * Whether a family-preferences section is offered to an audience: ungoverned for the audience,
 * or governed by a feature that is effective (features.md §3–4).
 */
export function sectionOffered(
  section: { features: readonly string[] },
  audience: FeatureAudience,
  modules: readonly ProfileModule[],
  effective: ReadonlySet<string>,
): boolean {
  const features = declaredFeatures(modules)
  const governing = section.features.find((id) => features.get(id)?.audience === audience)
  return governing === undefined || effective.has(governing)
}
