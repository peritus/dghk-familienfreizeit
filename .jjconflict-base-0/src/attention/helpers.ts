import type { AttentionCheck, AttentionContext, AttentionFact } from './types.js'
import type { JsonValue } from '../events/types.js'
export function subject(context: AttentionContext, id: string, kind = 'unknown') {
  return {
    id,
    kind: context.world?.entity_kind_by_id[id] ?? kind,
    available: context.world?.entity_kind_by_id[id] !== undefined,
  }
}

export function fact(
  context: AttentionContext,
  key: readonly JsonValue[],
  ids: readonly string[],
  evidence: Readonly<Record<string, JsonValue>>,
  extra: Partial<AttentionFact> = {},
): AttentionFact {
  return { key, subjects: ids.map((id) => subject(context, id)), evidence, ...extra }
}

export function check(
  code: string,
  owner: string,
  title: readonly [string, string],
  collect: AttentionCheck['collect'],
  options: Partial<Omit<AttentionCheck, 'code' | 'owner' | 'collect'>> = {},
): AttentionCheck {
  return {
    code,
    owner,
    title: { de: title[0], en: title[1] },
    detail: () => ({ de: title[0], en: title[1] }),
    collect,
    areas:
      owner === 'core' ? ['core'] : owner.startsWith('room-') ? ['accommodation'] : ['workshops'],
    scopes: ['dashboard', 'closing'],
    kind: 'problem',
    severity: 'warning',
    requires: ['world'],
    ...options,
  }
}
