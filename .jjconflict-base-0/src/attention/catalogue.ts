import { coreAttentionChecks } from './core.js'
import { phaseAttentionChecks } from './phases.js'
import { operationalAttentionChecks } from './operations.js'
import { fieldAttentionChecks } from './fields.js'
export const coreProfileAttentionChecks = [
  ...coreAttentionChecks,
  ...phaseAttentionChecks,
  ...operationalAttentionChecks,
  ...fieldAttentionChecks,
]
