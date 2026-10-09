import type { OccasionProfile } from '../config/define.js'
import { composeAttention } from './engine.js'
import { coreAttentionChecks } from './core.js'
import { phaseAttentionChecks } from './phases.js'
export function profileAttention(profile: OccasionProfile) { return composeAttention([...coreAttentionChecks,...phaseAttentionChecks],profile.modules) }
