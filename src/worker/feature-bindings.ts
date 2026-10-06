import type { ProfileModule } from '../config/define.js'
import { declaredFeatures, featureBindingName } from '../config/features.js'
import type { FeatureOverride } from '../derive/features.js'

/** The validated operational feature state of one Worker environment (features.md §6). */
export type FeatureBindingState = {
  overrides: readonly FeatureOverride[]
  /** Binding names that are malformed or name no declared feature. */
  invalid: readonly string[]
}

const prefix = 'DGHK_FEATURE_'

/**
 * Reads every `DGHK_FEATURE_*` binding fail-closed: a value other than `on` or `off`, or a
 * name that maps to no declared feature, is reported as invalid and never falls back to the
 * built selection.
 */
export function readFeatureBindings(
  env: object,
  modules: readonly ProfileModule[],
): FeatureBindingState {
  const byName = new Map(
    [...declaredFeatures(modules).keys()].map((id) => [featureBindingName(id), id] as const),
  )
  const overrides: FeatureOverride[] = []
  const invalid: string[] = []
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith(prefix)) continue
    const feature = byName.get(name)
    if (!feature || (value !== 'on' && value !== 'off')) invalid.push(name)
    else overrides.push({ feature, value })
  }
  return {
    overrides: overrides.sort((left, right) => left.feature.localeCompare(right.feature)),
    invalid: invalid.sort(),
  }
}
