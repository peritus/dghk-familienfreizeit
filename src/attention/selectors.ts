import { canonical } from './engine.js'
import type { AttentionArea, AttentionOperation, AttentionResult, AttentionScope } from './types.js'
export function selectAttention(result: AttentionResult, filter: { area?: AttentionArea; scope?: AttentionScope; subject_id?: string; actionable?: boolean } = {}) {
  return result.items.filter(item => (!filter.area || item.areas.includes(filter.area)) && (!filter.scope || item.display_scopes.includes(filter.scope)) && (!filter.subject_id || item.subjects.some(subject => subject.id === filter.subject_id)) && (!filter.actionable || ((item.kind === 'problem' || item.kind === 'review') && item.severity !== 'info')))
}
export function attentionComplete(result: AttentionResult, area?: AttentionArea): boolean {
  return !result.items.some(item => item.code === 'attention-unavailable' && (!area || item.areas.includes(area))) && result.coverage.every(entry => entry.state !== 'unavailable' || (area !== undefined && !result.items.some(item => item.evidence.check === entry.code && item.areas.includes(area))))
}
export function attentionAllClear(result: AttentionResult): boolean { return attentionComplete(result) && selectAttention(result, { actionable: true }).length === 0 }
export function attentionBlockers(result: AttentionResult, operation: AttentionOperation) { return result.items.filter(item => item.blocks.includes(operation)) }
export function acknowledgementFingerprint(result: AttentionResult): string { return canonical(result.items.filter(item => item.acknowledgement !== null).map(item => item.acknowledgement!.fingerprint).sort()) }
