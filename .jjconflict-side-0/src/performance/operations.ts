import type { OccasionProfile } from '../config/define.js'
import { coreProfileAttentionChecks } from '../attention/catalogue.js'
import { composeSolverContributions } from '../solver/composition.js'
import { performanceCatalogue } from './catalogue.js'

/* eslint-disable @typescript-eslint/naming-convention -- Literal URL paths, not domain properties. */
export const requestOperations = {
  '/api/organiser/log': 'request.organiser-log',
  '/api/organiser/apply': 'request.organiser-apply',
  '/api/events': 'request.events',
  '/api/login': 'request.login',
  '/api/me': 'request.me',
} as const
/* eslint-enable @typescript-eslint/naming-convention */

const familyRequestOperations = ['request.family-read', 'request.family-write'] as const

/** Resource IDs never enter telemetry operation names. */
export function requestOperation(path: string, method: string): string | undefined {
  if (path === '/api/family' || path.startsWith('/api/family/'))
    return method === 'GET' ? familyRequestOperations[0] : familyRequestOperations[1]
  return requestOperations[path as keyof typeof requestOperations]
}

/** Names come only from registered code/configuration, never entity IDs or input. */
export function performanceOperations(profile: OccasionProfile): ReadonlySet<string> {
  const contributions = composeSolverContributions(profile)
  return new Set([
    ...Object.keys(performanceCatalogue),
    ...Object.values(requestOperations),
    ...familyRequestOperations,
    'telemetry.dropped',
    ...(profile.validation_view.world_summaries ?? []).map((item) => `world.summary:${item.id}`),
    ...(profile.validation_view.world_checks ?? []).map((_, index) => `world.check:${index}`),
    ...(contributions.solver_input ?? []).map((item) => `solver.input:${item.id}`),
    ...(contributions.preflight_checks ?? []).map((item) => `solver.check:${item.id}`),
    ...(contributions.stages ?? []).map((item) => `solver.stage:${item.id}`),
    ...coreProfileAttentionChecks.map((item) => `attention.check:${item.code}`),
    ...profile.modules.flatMap((module) =>
      (module.contributions.attention_checks ?? []).map((item) => `attention.check:${item.code}`),
    ),
  ])
}
