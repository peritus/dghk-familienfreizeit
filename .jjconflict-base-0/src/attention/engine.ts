import { attentionReason } from './reasons.js'
import type { LocalizedText, ProfileModule } from '../config/define.js'
import type { JsonValue } from '../events/types.js'
import type {
  AttentionCheck,
  AttentionContext,
  AttentionFact,
  AttentionItem,
  AttentionResult,
} from './types.js'

/** Canonical data encoding, independent of insertion order and locale. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  return `{${Object.entries(value)
    .sort(([a], [b]) => compare(a, b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
    .join(',')}}`
}

export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function attentionId(code: string, key: readonly JsonValue[]): string {
  return `${code}:${encodeURIComponent(canonical(key))}`
}

export function localized(text: LocalizedText, locale: string, fallback: string): string {
  if (typeof text === 'string') return text
  const value = text[locale] ?? text[fallback] ?? text.en ?? text.de
  if (!value) throw new Error('missing attention translation')
  return value
}

export function composeAttention(
  core: readonly AttentionCheck[],
  modules: readonly ProfileModule[] = [],
) {
  const checks = [...core]
  for (const module of modules)
    for (const check of module.contributions.attention_checks ?? []) {
      if (check.owner !== module.id || !check.code.startsWith(`${module.id}.`))
        throw new Error(`attention owner mismatch: ${check.code}`)
      checks.push(check)
    }
  const codes = new Set<string>()
  for (const check of checks) {
    if (!check.code || codes.has(check.code))
      throw new Error(`duplicate attention code: ${check.code}`)
    if (!check.owner || check.areas.length === 0 || check.scopes.length === 0)
      throw new Error(`invalid attention definition: ${check.code}`)
    if (typeof check.title !== 'string' && (!check.title.de || !check.title.en))
      throw new Error(`missing attention translation: ${check.code}`)
    const validAreas = ['core', 'operations', 'accommodation', 'workshops'],
      validScopes = [
        'dashboard',
        'family',
        'workshop',
        'programme',
        'allocation',
        'accommodation',
        'closing',
        'print',
        'operation',
      ]
    if (
      check.areas.some((area) => !validAreas.includes(area)) ||
      check.scopes.some((scope) => !validScopes.includes(scope))
    )
      throw new Error(`invalid attention scope: ${check.code}`)
    localized(check.title, 'de', 'en')
    localized(check.title, 'en', 'de')
    codes.add(check.code)
  }
  checks.sort((a, b) => compare(a.code, b.code))
  return (context: AttentionContext): AttentionResult => {
    const items = new Map<string, AttentionItem>(
      (context.audience === 'organiser' ? (context.rejected_findings ?? []) : []).map((item) => [
        item.id,
        item,
      ]),
    )
    const coverage: AttentionResult['coverage'][number][] = []
    for (const check of checks) {
      if (!(check.audiences ?? ['organiser']).includes(context.audience)) {
        coverage.push({ code: check.code, owner: check.owner, state: 'not-applicable' })
        continue
      }
      const available = check.requires.every((input) =>
        input === 'world'
          ? context.domain === 'available' && context.world !== null
          : context.domain === 'available' &&
            context.world !== null &&
            context.plan !== null &&
            context.plan.meta.input_seq === context.world.head_seq &&
            context.plan.meta.build_revision === context.build_revision,
      )
      if (!available) {
        coverage.push({ code: check.code, owner: check.owner, state: 'unavailable' })
        continue
      }
      try {
        const facts = check.collect(context)
        if (facts === 'not-applicable') {
          coverage.push({ code: check.code, owner: check.owner, state: 'not-applicable' })
          continue
        }
        const batch = new Map<string, AttentionItem>()
        for (const fact of facts) {
          const item = present(check, fact, context)
          const prior = batch.get(item.id) ?? items.get(item.id)
          if (prior && canonical(prior.evidence) !== canonical(item.evidence))
            throw new Error('conflicting attention evidence')
          batch.set(item.id, item)
        }
        for (const [id, item] of batch) items.set(id, item)
        coverage.push({ code: check.code, owner: check.owner, state: 'evaluated' })
      } catch {
        coverage.push({ code: check.code, owner: check.owner, state: 'unavailable' })
      }
    }
    for (const entry of coverage)
      if (entry.state === 'unavailable') {
        const id = attentionId('attention-unavailable', [entry.code])
        items.set(id, {
          id,
          code: 'attention-unavailable',
          owner: entry.owner,
          kind: 'problem',
          severity: 'error',
          subjects: [],
          evidence: { check: entry.code },
          source_refs: [],
          basis: basis(context),
          wording: {
            title: context.locale === 'de' ? 'Prüfung nicht verfügbar' : 'Check unavailable',
            detail:
              context.locale === 'de'
                ? 'Die Prüfung ist noch nicht vollständig.'
                : 'The review is not complete yet.',
            reasons: [],
          },
          areas: checks.find((check) => check.code === entry.code)!.areas,
          display_scopes: ['dashboard', 'closing'],
          blocks: checks.find((check) => check.code === entry.code)!.unavailable_blocks ?? [],
          acknowledgement: null,
          actions: [{ kind: 'reload' }],
        })
      }
    const urgency = { error: 0, warning: 1, info: 2 }
    return {
      items: [...items.values()].sort(
        (a, b) =>
          urgency[a.severity] - urgency[b.severity] ||
          compare(a.code, b.code) ||
          compare(a.id, b.id),
      ),
      coverage,
    }
  }
}
function basis(context: AttentionContext): AttentionItem['basis'] {
  return {
    head_seq: context.world?.head_seq ?? null,
    build_revision: context.build_revision,
    mode: context.basis?.mode ?? 'committed',
    group_ids: context.basis?.group_ids ?? [],
  }
}

function present(
  check: AttentionCheck,
  fact: AttentionFact,
  context: AttentionContext,
): AttentionItem {
  const fingerprint = canonical({
    code: check.code,
    key: fact.key,
    evidence: fact.evidence,
    build: context.build_revision,
  })
  return {
    id: attentionId(check.code, fact.key),
    code: check.code,
    owner: check.owner,
    kind: check.kind,
    severity: fact.severity ?? check.severity,
    subjects: fact.subjects,
    evidence: fact.evidence,
    source_refs: fact.sources ?? [
      ...fact.subjects.flatMap((subject) =>
        (context.world?.labels_by_entity[subject.id] ?? [])
          .filter(
            (label) =>
              label.sensitivity === 'normal' &&
              (
                check.source_keys ?? [String(fact.evidence.field ?? fact.evidence.key ?? '')]
              ).includes(label.key),
          )
          .map((label) => ({
            kind: 'label' as const,
            entity_id: label.entity_id,
            key: label.key,
            value: label.value,
            seq: label.set_seq,
          })),
      ),
      ...(check.requires.includes('plan') ? [{ kind: 'stage' as const, stage: check.owner }] : []),
    ],
    basis: basis(context),
    wording: {
      title: localized(
        fact.title ?? check.title,
        context.locale,
        context.profile.meta.fallback_locale,
      ),
      detail: localized(check.detail(fact), context.locale, context.profile.meta.fallback_locale),
      reasons: Array.isArray(fact.evidence.reasons)
        ? fact.evidence.reasons.map((reason) =>
            attentionReason(
              typeof reason === 'string'
                ? reason
                : reason && typeof reason === 'object' && !Array.isArray(reason)
                  ? String(reason.reason ?? '')
                  : '',
              context.locale,
            ),
          )
        : fact.evidence.reason &&
            typeof fact.evidence.reason === 'object' &&
            !Array.isArray(fact.evidence.reason) &&
            typeof fact.evidence.reason.de === 'string' &&
            typeof fact.evidence.reason.en === 'string'
          ? [
              localized(
                fact.evidence.reason as Record<string, string>,
                context.locale,
                context.profile.meta.fallback_locale,
              ),
            ]
          : typeof fact.evidence.reason === 'string'
            ? [attentionReason(fact.evidence.reason, context.locale)]
            : [],
    },
    areas: check.areas,
    display_scopes: check.scopes,
    blocks: fact.blocks ?? [],
    acknowledgement: fact.acknowledge ? { fingerprint } : null,
    actions:
      fact.actions ??
      (fact.subjects.some((s) => s.kind === 'family' || s.kind === 'person')
        ? [
            {
              kind: 'navigate',
              destination: 'family',
              entity_id:
                fact.subjects.find((s) => s.kind === 'family')?.id ??
                (context.world?.labels_by_entity[
                  fact.subjects.find((s) => s.kind === 'person')!.id
                ]?.find((l) => l.key === 'member-of')?.value as string) ??
                null,
            },
          ]
        : fact.subjects.some((s) => s.kind === 'workshop')
          ? [
              {
                kind: 'navigate',
                destination: 'workshop',
                entity_id: fact.subjects.find((s) => s.kind === 'workshop')!.id,
              },
            ]
          : check.areas.includes('accommodation')
            ? [{ kind: 'navigate', destination: 'accommodation', entity_id: null }]
            : []),
  }
}
