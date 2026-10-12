import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { derive, guardModuleFold, type ModuleFoldCapability } from '../../src/events/fold.js'
import type { Event } from '../../src/events/types.js'
import { loadKdl } from '../../src/events/kdl.js'
import {
  deriveDraftWorld,
  diff,
  projectFamilyWorld,
  projectSharedWorld,
} from '../../src/events/world.js'

const events: Event[] = [
  {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'FamilyInvited',
    payload: { family_id: 'fam_1', email: 'a@test.invalid', display_name: 'A', locale: 'de' },
  },
  {
    seq: 2,
    at: '2027-01-01T00:00:01Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'fam_1',
      key: 'needs',
      value: 'quiet-room',
      strength: 'required',
      note: null,
    },
  },
]

test('derives deterministic indexes and normalized resolver constraints', () => {
  const world = derive(events)
  expect(world.labels_by_entity.fam_1).toHaveLength(4)
  expect(world.labels_by_key.needs?.[0]?.value).toBe('quiet-room')
  expect(world.constraints).toEqual([
    { key: 'needs', holder_id: 'fam_1', value: 'quiet-room', strength: 'required', set_seq: 2 },
  ])
  expect(derive([...events].reverse().reverse())).toEqual(world)
})

test('FamilyDisplayNameChanged replaces only the family display-name label', () => {
  const changed: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: 'fam_1',
    type: 'FamilyDisplayNameChanged',
    payload: {
      family_id: 'fam_1',
      old_display_name: 'A',
      new_display_name: 'A family',
    },
  }
  const world = derive([...events, changed])
  expect(world.labels_by_entity.fam_1).toContainEqual(
    expect.objectContaining({ key: 'display-name', value: 'A family', set_seq: 3 }),
  )
  expect(world.families).toEqual([{ id: 'fam_1', kind: 'family', sort_key: 1, created_seq: 1 }])
  expect(() =>
    derive([
      ...events,
      { ...changed, seq: 3, payload: { ...changed.payload, old_display_name: 'Other' } },
    ]),
  ).toThrow(/old display name/)
  expect(() =>
    derive([
      ...events,
      { ...changed, seq: 3, payload: { ...changed.payload, new_display_name: 'A' } },
    ]),
  ).toThrow(/did not change/)
})

test('a LabelCleared by value hard-removes the label instead of tombstoning it (D27)', () => {
  const clearByValue: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'quiet-room' },
  }
  const world = derive([...events, clearByValue])
  expect(world.labels.some((label) => label.key === 'needs' && label.value === 'quiet-room')).toBe(
    false,
  )
  expect(world.labels_by_entity.fam_1).not.toContainEqual(expect.objectContaining({ key: 'needs' }))
  expect(world.labels_by_key.needs).toBeUndefined()
  expect(world.constraints).toEqual([])
})

test('clears every value for a key when LabelCleared carries a null value', () => {
  const config = {
    label_schemas: [
      { key: 'needs', scopes: ['family'] as const, cardinality: 'zero-or-more' as const },
    ],
  }
  const secondNeed: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'garden-view', strength: null, note: null },
  }
  const clearAll: Event = {
    seq: 4,
    at: '2027-01-01T00:00:03Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'needs', value: null },
  }
  const world = derive([...events, secondNeed, clearAll], config)
  expect(world.labels_by_key.needs).toBeUndefined()
  expect(world.labels.filter((label) => label.key === 'needs')).toHaveLength(0)
})

test('fixed resolver keys keep multiple values without a label schema', () => {
  const values = {
    needs: ['quiet-room', 'garden-view'],
    provides: ['tables', 'oven'],
    excludes: ['dogs', 'smoking'],
    'groups-with': ['same-room', 'nearby'],
    'separates-from': ['stairs', 'noise'],
  } as const
  let seq = 3
  const additions: Event[] = Object.entries(values).flatMap(([key, entries]) =>
    entries.map((value) => ({
      seq: seq++,
      at: '2027-01-01T00:00:02Z',
      actor: 'org@test.invalid',
      subject: null,
      type: 'LabelSet' as const,
      payload: { entity_id: 'fam_1', key, value, strength: null, note: null },
    })),
  )

  const world = derive([...events, ...additions])

  for (const [key, expected] of Object.entries(values))
    expect(
      world.labels
        .filter((label) => label.entity_id === 'fam_1' && label.key === key)
        .map((label) => label.value),
    ).toEqual(expect.arrayContaining(expected))
  expect(
    world.capabilities.filter((item) => item.entity_id === 'fam_1').map(({ key }) => key),
  ).toEqual(expect.arrayContaining(['tables', 'oven']))
})

test('a fixed resolver label schema can override the multi-value default', () => {
  const secondNeed: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'garden-view', strength: null, note: null },
  }
  const world = derive([...events, secondNeed], {
    label_schemas: [
      { key: 'needs', scopes: ['family'] as const, cardinality: 'zero-or-one' as const },
    ],
  })

  expect(
    world.labels.filter((label) => label.entity_id === 'fam_1' && label.key === 'needs'),
  ).toEqual([expect.objectContaining({ value: 'garden-view', set_seq: 3 })])
})

test('setting the same fixed resolver value again updates its metadata', () => {
  const restatement: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'fam_1',
      key: 'needs',
      value: 'quiet-room',
      strength: 'preferred',
      note: 'updated note',
    },
  }
  const world = derive([...events, restatement])

  expect(
    world.labels.filter((label) => label.entity_id === 'fam_1' && label.key === 'needs'),
  ).toEqual([
    expect.objectContaining({
      value: 'quiet-room',
      strength: 'preferred',
      note: 'updated note',
      set_seq: 3,
    }),
  ])
})

test('clearing one fixed resolver value preserves the other values', () => {
  const secondNeed: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'garden-view', strength: null, note: null },
  }
  const clearFirst: Event = {
    seq: 4,
    at: '2027-01-01T00:00:03Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'quiet-room' },
  }
  const world = derive([...events, secondNeed, clearFirst])

  expect(
    world.labels.filter((label) => label.entity_id === 'fam_1' && label.key === 'needs'),
  ).toEqual([expect.objectContaining({ value: 'garden-view' })])
})

test('PersonWithdrawn hard-removes the person and their labels instead of tombstoning them (D27)', () => {
  const personAdded: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'PersonAdded',
    payload: {
      person_id: 'per_1',
      family_id: 'fam_1',
      given_name: 'Peter',
      family_name: 'A',
      age: null,
      role: 'adult',
    },
  }
  const withdrawn: Event = {
    seq: 4,
    at: '2027-01-01T00:00:03Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'PersonWithdrawn',
    payload: { person_id: 'per_1', reason: 'moved away' },
  }
  const before = derive([...events, personAdded])
  expect(before.persons.map((person) => person.id)).toContain('per_1')
  const after = derive([...events, personAdded, withdrawn])
  expect(after.persons.map((person) => person.id)).not.toContain('per_1')
  expect((after.entities_by_kind.person ?? []).some((person) => person.id === 'per_1')).toBe(false)
  expect(after.labels.some((label) => label.entity_id === 'per_1')).toBe(false)
  expect(diff(before, after)).toContainEqual({ kind: 'entity-retired', subject_id: 'per_1' })
})

test('rejects LabelSet/LabelCleared on setup-owned kernel keys', () => {
  const setEmail: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'fam_1',
      key: 'email',
      value: 'other@test.invalid',
      strength: null,
      note: null,
    },
  }
  expect(() => derive([...events, setEmail])).toThrow(/setup-owned/)
  const clearRole: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelCleared',
    payload: { entity_id: 'fam_1', key: 'display-name', value: null },
  }
  expect(() => derive([...events, clearRole])).toThrow(/setup-owned/)
})

test('enforces configured label scopes and replacement cardinality', () => {
  const config = {
    label_schemas: [
      { key: 'flag', scopes: ['family'] as const, cardinality: 'zero-or-one' as const },
    ],
  }
  expect(() =>
    derive(
      [
        {
          ...events[0],
          type: 'LabelSet',
          payload: { entity_id: 'fam_1', key: 'flag', value: true, strength: null, note: null },
        } as Event,
      ],
      config,
    ),
  ).toThrow(/sequence gap|unknown entity/)
})

test('guardModuleFold rejects capability calls outside a module’s own declared kinds and keys', () => {
  const calls: string[] = []
  const capability: ModuleFoldCapability = {
    findEntity: () => undefined,
    entities: () => [],
    entitiesWithLabels: () => [],
    labels: () => [],
    setSortKey: (kind, id, sortKey) => {
      calls.push(`setSortKey:${kind}:${id}:${sortKey}`)
    },
    createEntity: (kind, id, seq, sortKey) => {
      calls.push(`createEntity:${kind}:${id}:${seq}:${sortKey}`)
      return { id, kind, sort_key: sortKey ?? seq, created_seq: seq }
    },
    retireEntity: (kind, id) => {
      calls.push(`retireEntity:${kind}:${id}`)
    },
    clearLabel: (entityId, key) => {
      calls.push(`clearLabel:${entityId}:${key}`)
    },
    setLabel: (entityId, key) => {
      calls.push(`setLabel:${entityId}:${key}`)
    },
    replaceLabels: (entityId, values) => {
      calls.push(`replaceLabels:${entityId}:${values.map((v) => v.key).join(',')}`)
    },
  }
  const allowedKinds = new Set(['widget'])
  const allowedKeys = new Set(['widget-color'])

  const wellBehaved = guardModuleFold(
    'fixture-widgets',
    allowedKinds,
    allowedKeys,
    (cap, event) => {
      cap.createEntity('widget', 'wg_1', event.seq)
      cap.setLabel('wg_1', 'widget-color', 'red', null, null)
    },
  )
  wellBehaved(capability, { type: 'WidgetAdded', payload: {}, seq: 1 })
  expect(calls).toEqual(['createEntity:widget:wg_1:1:undefined', 'setLabel:wg_1:widget-color'])

  const undeclaredKind = guardModuleFold('fixture-widgets', allowedKinds, allowedKeys, (cap) => {
    cap.createEntity('gadget', 'gd_1', 1)
  })
  expect(() => undeclaredKind(capability, { type: 'WidgetAdded', payload: {}, seq: 1 })).toThrow(
    /did not declare entity kind: gadget/,
  )

  const undeclaredRetireKind = guardModuleFold(
    'fixture-widgets',
    allowedKinds,
    allowedKeys,
    (cap) => {
      cap.retireEntity('gadget', 'gd_1')
    },
  )
  expect(() =>
    undeclaredRetireKind(capability, { type: 'WidgetAdded', payload: {}, seq: 1 }),
  ).toThrow(/did not declare entity kind: gadget/)

  const undeclaredKey = guardModuleFold('fixture-widgets', allowedKinds, allowedKeys, (cap) => {
    cap.setLabel('wg_1', 'widget-price', 3, null, null)
  })
  expect(() => undeclaredKey(capability, { type: 'WidgetAdded', payload: {}, seq: 1 })).toThrow(
    /did not declare label key: widget-price/,
  )

  const undeclaredReplaceKey = guardModuleFold(
    'fixture-widgets',
    allowedKinds,
    allowedKeys,
    (cap) => {
      cap.replaceLabels('wg_1', [{ key: 'widget-price', value: 3, strength: null, note: null }])
    },
  )
  expect(() =>
    undeclaredReplaceKey(capability, { type: 'WidgetAdded', payload: {}, seq: 1 }),
  ).toThrow(/did not declare label key: widget-price/)
})

test('compiles resolver diagnostics and preserves restricted facts only for their family', () => {
  const config = {
    label_schemas: [
      { key: 'private-note', scopes: ['family'] as const, sensitivity: 'restricted' as const },
    ],
  }
  const world = derive(
    loadKdl(
      readFileSync(
        new URL('../fixtures/derived-world/labels-and-resolver.kdl', import.meta.url),
        'utf8',
      ),
      config,
    ),
    config,
  )
  expect(world.diagnostics.map((item) => item.id)).toEqual(['kernel.contradiction'])
  expect(world.constraints).toContainEqual({
    key: 'needs',
    holder_id: 'fam_1',
    value: 'quiet-room',
    strength: 'required',
    set_seq: 3,
  })
  expect(projectSharedWorld(world).labels.some((label) => label.key === 'private-note')).toBe(false)
  expect(
    projectFamilyWorld(world, 'fam_2').labels.some((label) => label.key === 'private-note'),
  ).toBe(false)
  expect(
    projectFamilyWorld(world, 'fam_1').labels.some((label) => label.key === 'private-note'),
  ).toBe(false)
})

test('derives draft events and stable world changes without persistence', () => {
  const config = {
    label_schemas: [
      { key: 'needs', scopes: ['family'] as const, cardinality: 'zero-or-one' as const },
    ],
  }
  const draft: Event = {
    seq: 3,
    at: '2027-01-01T00:00:02Z',
    actor: 'org@test.invalid',
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'fam_1', key: 'needs', value: 'garden', strength: null, note: null },
  }
  const before = derive(events, config)
  const after = deriveDraftWorld(events, [draft], config)
  expect(after.head_seq).toBe(3)
  expect(diff(before, after)).toEqual([
    { kind: 'label-cleared', subject_id: 'fam_1', key: 'needs', value: '"quiet-room"' },
    { kind: 'label-set', subject_id: 'fam_1', key: 'needs', value: '"garden"' },
  ])
})
