import type { OccasionProfile } from '../config/define.js'
import type { SolverContributions } from './types.js'

export function composeSolverContributions(profile: OccasionProfile): SolverContributions {
  return {
    solver_input: profile.modules.flatMap((module) => module.contributions.solver_input ?? []),
    stages: profile.modules.flatMap((module) => module.contributions.stages ?? []),
    rules: profile.modules.flatMap((module) => module.contributions.rules ?? []),
    preflight_checks: profile.modules.flatMap(
      (module) => module.contributions.preflight_checks ?? [],
    ),
  }
}
