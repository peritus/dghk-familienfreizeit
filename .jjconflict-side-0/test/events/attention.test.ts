import { expect, test } from 'vitest'
import { composeAttention, attentionId, attentionAllClear } from '../../src/attention/index.js'
import type { AttentionCheck, AttentionContext } from '../../src/attention/types.js'
import { luebben2027Profile as profile } from '../../src/config/profiles/luebben-2027/index.js'
import { derive } from '../../src/events/fold.js'
const context: AttentionContext = {
  domain: 'available',
  world: derive([], profile.validation_view),
  plan: null,
  profile,
  build_revision: 'test',
  locale: 'de',
  now: '2027-01-01T00:00:00Z',
  audience: 'organiser',
}
const check: AttentionCheck = {
  code: 'test.example',
  owner: 'core',
  areas: ['core'],
  scopes: ['dashboard'],
  kind: 'problem',
  severity: 'warning',
  requires: ['world'],
  title: { de: 'Hinweis', en: 'Notice' },
  detail: () => ({ de: 'Prüfen', en: 'Review' }),
  collect: () => [{ key: ['fam_1', 'key'], subjects: [], evidence: { count: 1 } }],
}
test('stable escaped identities and deterministic independent composition', () => {
  const evaluator = composeAttention([check])
  const de = evaluator(context),
    en = evaluator({ ...context, locale: 'en' })
  expect(de.items[0].id).toBe(en.items[0].id)
  expect(de.items[0].wording.title).not.toBe(en.items[0].wording.title)
  expect(evaluator(context)).toEqual(de)
  expect(attentionId('c', ['a|b', 'c'])).not.toBe(attentionId('c', ['a', 'b|c']))
  expect(attentionAllClear(de)).toBe(false)
})
test('unknown inputs and failures never mean all clear', () => {
  expect(
    attentionAllClear(composeAttention([check])({ ...context, world: null, domain: 'loading' })),
  ).toBe(false)
  const failed = composeAttention([
    {
      ...check,
      collect: () => {
        throw new Error('secret')
      },
    },
  ])(context)
  expect(failed.coverage[0].state).toBe('unavailable')
  expect(JSON.stringify(failed)).not.toContain('secret')
})
test('duplicate registration and conflicting facts fail; equal facts merge', () => {
  expect(() => composeAttention([check, check])).toThrow('duplicate')
  const equal = check.collect(context)
  if (equal === 'not-applicable') throw new Error('fixture')
  expect(
    composeAttention([{ ...check, collect: () => [...equal, ...equal] }])(context).items,
  ).toHaveLength(1)
  expect(
    composeAttention([
      { ...check, collect: () => [...equal, { ...equal[0], evidence: { count: 2 } }] },
    ])(context).coverage[0].state,
  ).toBe('unavailable')
})
test('other audiences never receive organiser findings', () => {
  expect(composeAttention([check])({ ...context, audience: 'family' }).items).toEqual([])
})

import { coreAttentionChecks } from '../../src/attention/core.js'
test('core records distinct unknown fields and localized applicability reasons', () => {
  const world = {
    ...context.world!,
    diagnostics: [
      {
        id: 'kernel.unknown-trait',
        subject_id: 'fam_1',
        severity: 'warning' as const,
        message: 'irrelevant',
        evidence: { key: 'first', value: true, seq: 1 },
      },
      {
        id: 'kernel.unknown-trait',
        subject_id: 'fam_1',
        severity: 'warning' as const,
        message: 'irrelevant',
        evidence: { key: 'second', value: true, seq: 2 },
      },
    ],
  }
  expect(
    composeAttention(coreAttentionChecks)({ ...context, world }).items.filter(
      (i) => i.code === 'kernel.unknown-trait',
    ),
  ).toHaveLength(2)
})

import { projectFamilyWorld } from '../../src/events/world.js'
test('projection allowlist strips hidden labels, resolver tokens and derived attention', () => {
  const world = {
    ...context.world!,
    families: [{ id: 'fam_one', kind: 'family', sort_key: 1, created_seq: 1 }],
    labels: [
      {
        entity_id: 'fam_one',
        key: 'provides',
        value: 'secret_per_other',
        value_type: 'string' as const,
        strength: null,
        note: null,
        set_seq: 1,
        sensitivity: 'normal' as const,
      },
    ],
    diagnostics: [
      {
        id: 'secret',
        subject_id: 'per_other',
        severity: 'warning' as const,
        message: 'secret text',
      },
    ],
    summaries: { hidden: 'secret' },
  }
  const projected = projectFamilyWorld(world, 'fam_one')
  expect(JSON.stringify(projected)).not.toContain('secret')
  expect(projected.diagnostics).toEqual([])
  expect(projected.summaries).toEqual({})
  expect(world.diagnostics).toHaveLength(1)
})

import { admitProfileProposal } from '../../src/organiser/proposal.js'
import { organiserFixtureEvents } from '../../src/app/stories/organiser-fixtures.js'
test('organiser fixture admits unchanged world without adding policy gates', () => {
  expect(() =>
    admitProfileProposal(organiserFixtureEvents, [], profile, {
      build_revision: 'test',
      compatibility_revision: 1,
    }),
  ).not.toThrow()
})

test('rejected organiser findings never cross a family or shared audience boundary', () => {
  const rejected = composeAttention([check])(context).items
  for (const audience of ['family', 'shared'] as const)
    expect(
      composeAttention([check])({ ...context, audience, rejected_findings: rejected }).items,
    ).toEqual([])
})
test('unavailable optional checks do not acquire operation blockers from severity', () => {
  const result = composeAttention([{ ...check, severity: 'error' }])({
    ...context,
    domain: 'failed',
  })
  expect(result.items[0]!.blocks).toEqual([])
  expect(
    composeAttention([{ ...check, unavailable_blocks: ['close-workshops'] }])({
      ...context,
      domain: 'failed',
    }).items[0]!.blocks,
  ).toEqual(['close-workshops'])
})

import { decodeAttentionItems } from '../../src/attention/wire.js'
test('wire findings must be structurally valid and registered with their owner', () => {
  const items = composeAttention([check])(context).items
  expect(decodeAttentionItems(items, [check])).toEqual(items)
  expect(decodeAttentionItems(items, [])).toEqual([])
  expect(
    decodeAttentionItems(
      [{ ...items[0], actions: [{ kind: 'execute', command: 'secret' }] }],
      [check],
    ),
  ).toEqual([])
})
