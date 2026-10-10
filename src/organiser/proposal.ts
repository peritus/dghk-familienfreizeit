import type { AttentionItem } from '../attention/types.js'
import { EventInputError } from '../events/types.js'
import { operationalAttentionChecks } from '../attention/operations.js'
import { coreAttentionChecks } from '../attention/core.js'
import { composeAttention } from '../attention/engine.js'
import type { OccasionProfile } from '../config/define.js'
import { AppendInvariantError, type World } from '../events/fold.js'
import { prepareEventBatch } from '../events/prepare.js'
import type { Event, EventDraft } from '../events/types.js'

/** Prepare a proposal and derive its prospective world without imposing solver-output admission rules. */
export function admitProfileProposal(
  committed: readonly Event[],
  drafts: readonly EventDraft[],
  _profile: OccasionProfile,
  _revisions: { build_revision: string; compatibility_revision: number },
) {
  return prepareEventBatch(committed, drafts, _profile.validation_view)
}

export function appendInvariantFindings(
  error: AppendInvariantError,
  profile: OccasionProfile,
  build: string,
  now: string,
): readonly AttentionItem[] {
  return composeAttention(coreAttentionChecks)({
    domain: 'available',
    world: error.world,
    plan: null,
    profile,
    build_revision: build,
    locale: profile.meta.locale,
    now,
    audience: 'organiser',
    basis: { mode: 'prospective', group_ids: [] },
  }).items.filter((item) => item.blocks.includes('append'))
}

export function eventInputFindings(
  error: EventInputError,
  profile: OccasionProfile,
  build: string,
  now: string,
  groupId?: string,
): readonly AttentionItem[] {
  return composeAttention(operationalAttentionChecks)({
    domain: 'invalid-proposal',
    basis: { mode: 'prospective', group_ids: [] },
    world: null,
    plan: null,
    profile,
    build_revision: build,
    locale: profile.meta.locale,
    now,
    audience: 'organiser',
    operations: (error.fields.length ? error.fields : ['payload']).map((field) => ({
      id: `event-${error.seq ?? 'input'}`,
      code: 'invalid-field',
      field,
      ...(groupId ? { group_id: groupId } : {}),
    })),
  }).items.map((item) => ({ ...item, evidence: { ...item.evidence, event_seq: error.seq } }))
}

/** Bind rejected facts to browser session groups without persisting UI metadata. */
export function associateFindingGroups(
  items: readonly import('../attention/types.js').AttentionItem[],
  groups: readonly { id?: string; events: readonly EventDraft[] }[],
  head: number,
): readonly import('../attention/types.js').AttentionItem[] {
  return items.map((item) => {
    let cursor = head
    const ids = groups.flatMap((group) => {
      const start = cursor
      cursor += group.events.length
      const seq =
        item.evidence.event_seq ??
        item.source_refs.flatMap((source) =>
          source.kind === 'label' && source.seq > head ? [source.seq] : [],
        )[0]
      const exact = typeof seq === 'number' && seq > start && seq <= cursor
      const subjects = new Set(item.subjects.map((subject) => subject.id))
      const touches =
        typeof seq !== 'number' &&
        group.events.some(
          (event) =>
            subjects.has(event.subject ?? '') ||
            (event.payload !== null &&
              typeof event.payload === 'object' &&
              !Array.isArray(event.payload) &&
              Object.entries(event.payload).some(
                ([key, value]) =>
                  (key === 'entity_id' || key.endsWith('_id')) &&
                  typeof value === 'string' &&
                  subjects.has(value),
              )),
        )
      return group.id && (exact || touches) ? [group.id] : []
    })
    return {
      ...item,
      basis: { ...item.basis, mode: 'prospective' as const, group_ids: ids },
      actions: [
        ...item.actions.filter((action) => action.kind !== 'review-group'),
        ...ids.map((groupId) => ({ kind: 'review-group' as const, group_id: groupId })),
      ],
    }
  })
}
