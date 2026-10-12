import type { OccasionProfile } from '../config/define.js'
import { composeAttention } from './engine.js'
import { coreProfileAttentionChecks } from './catalogue.js'
export function profileAttentionChecks(profile: OccasionProfile) {
  return [
    ...coreProfileAttentionChecks,
    ...profile.modules.flatMap((module) => module.contributions.attention_checks ?? []),
  ]
}

export function profileAttention(profile: OccasionProfile) {
  return composeAttention(coreProfileAttentionChecks, profile.modules)
}
