import { z } from 'zod'
import type { AttentionCheck, AttentionItem } from './types.js'
const json = z.json()
const source = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('label'),
    entity_id: z.string(),
    key: z.string(),
    value: json,
    seq: z.number().int().positive(),
  }),
  z.object({ kind: z.literal('resolver'), code: z.string() }),
  z.object({ kind: z.literal('stage'), stage: z.string() }),
  z.object({ kind: z.literal('field'), field: z.string(), group_id: z.string().nullable() }),
  z.object({ kind: z.literal('operation'), id: z.string() }),
  z.object({ kind: z.literal('closing'), area: z.string(), seq: z.number().int().positive() }),
])
const action = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('navigate'),
    destination: z.enum(['family', 'workshop', 'programme', 'allocation', 'accommodation']),
    entity_id: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('clear-label'),
    entity_id: z.string(),
    key: z.string(),
    value: json,
    seq: z.number().int().positive(),
  }),
  z.object({ kind: z.literal('retry') }),
  z.object({ kind: z.literal('reload') }),
  z.object({ kind: z.literal('login') }),
  z.object({ kind: z.literal('review-group'), group_id: z.string() }),
])
const item: z.ZodType<AttentionItem> = z.object({
  id: z.string(),
  code: z.string(),
  owner: z.string(),
  kind: z.enum(['problem', 'review', 'information', 'status']),
  severity: z.enum(['error', 'warning', 'info']),
  subjects: z.array(z.object({ kind: z.string(), id: z.string(), available: z.boolean() })),
  evidence: z.record(z.string(), json),
  source_refs: z.array(source),
  basis: z.object({
    head_seq: z.number().int().nonnegative().nullable(),
    build_revision: z.string(),
    mode: z.enum(['committed', 'prospective']),
    group_ids: z.array(z.string()),
  }),
  wording: z.object({ title: z.string(), detail: z.string(), reasons: z.array(z.string()) }),
  areas: z.array(z.enum(['accommodation', 'workshops', 'core', 'operations'])),
  display_scopes: z.array(
    z.enum([
      'dashboard',
      'family',
      'workshop',
      'programme',
      'allocation',
      'accommodation',
      'closing',
      'print',
      'operation',
    ]),
  ),
  blocks: z.array(
    z.enum(['append', 'close-accommodation', 'close-workshops', 'capacity-reduction']),
  ),
  acknowledgement: z.object({ fingerprint: z.string() }).nullable(),
  actions: z.array(action),
})
/** Only known, structurally valid server findings enter the organiser renderer. */
export function decodeAttentionItems(
  input: unknown,
  checks: readonly AttentionCheck[],
): readonly AttentionItem[] {
  const parsed = z.array(item).safeParse(input)
  if (!parsed.success) return []
  const owners = new Map(checks.map((check) => [check.code, check.owner]))
  return parsed.data.filter(
    (item) =>
      owners.get(
        item.code === 'attention-unavailable' ? String(item.evidence.check) : item.code,
      ) === item.owner && item.id.startsWith(`${item.code}:`),
  )
}
