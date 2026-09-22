import { z } from 'zod'
import { describe, expect, test } from 'vitest'
import { defineOccasionProfile, property, enumOf } from '../../src/config/define.js'
import { defineModule } from '../../src/modules/define.js'
import { derive } from '../../src/events/fold.js'
import type { ModuleFoldCapability } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'

const meta = {
  id: 'fold-boundary-fixture',
  name: { de: 'Fixture', en: 'Fixture' },
  description: { de: 'Fixture', en: 'Fixture' },
  starts_on: '2027-01-01',
  ends_on: '2027-01-02',
  timezone: 'Europe/Berlin',
  locale: 'de',
  fallback_locale: 'en',
}

const widgetAddedPayload = z.object({ widget_id: z.string(), color: z.string() })
const alwaysAuthorized = () => true

const widgets = defineModule({
  id: 'fixture-widgets',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'widget', prefix: 'wg_' }],
    label_keys: [{ key: 'widget-color', scopes: ['widget'] }],
    events: [
      {
        type: 'WidgetAdded',
        payload: widgetAddedPayload,
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          const payload = event.payload as z.infer<typeof widgetAddedPayload>
          capability.createEntity('widget', payload.widget_id, event.seq)
          capability.setLabel(payload.widget_id, 'widget-color', payload.color, null, null)
        },
      },
    ],
  }),
})

const misbehavingKind = defineModule({
  id: 'fixture-rogue-kind',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'rogue-kind-owned', prefix: 'rk_' }],
    events: [
      {
        type: 'RogueKindCreated',
        payload: z.object({}),
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          capability.createEntity('undeclared-kind', 'x_1', event.seq)
        },
      },
    ],
  }),
})

const misbehavingKey = defineModule({
  id: 'fixture-rogue-key',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'rogue-key-owned', prefix: 'rq_' }],
    events: [
      {
        type: 'RogueKeyCreated',
        payload: z.object({}),
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          capability.createEntity('rogue-key-owned', 'rq_1', event.seq)
          capability.setLabel('rq_1', 'undeclared-key', 'x', null, null)
        },
      },
    ],
  }),
})

const misbehavingRetireKind = defineModule({
  id: 'fixture-rogue-retire-kind',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'rogue-retire-owned', prefix: 'rr_' }],
    events: [
      {
        type: 'RogueRetireCreated',
        payload: z.object({}),
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability) => {
          capability.retireEntity('undeclared-kind', 'x_1')
        },
      },
    ],
  }),
})

const misbehavingReplaceKey = defineModule({
  id: 'fixture-rogue-replace-key',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'rogue-replace-owned', prefix: 'rp_' }],
    events: [
      {
        type: 'RogueReplaceCreated',
        payload: z.object({}),
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          capability.createEntity('rogue-replace-owned', 'rp_1', event.seq)
          capability.replaceLabels('rp_1', [
            { key: 'undeclared-key', value: 'x', strength: null, note: null },
          ])
        },
      },
    ],
  }),
})

const idCollision = defineModule({
  id: 'fixture-id-collision',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'collider', prefix: 'co_' }],
    events: [
      {
        type: 'ColliderCreated',
        payload: z.object({ id: z.string() }),
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          const payload = event.payload as { id: string }
          capability.createEntity('collider', payload.id, event.seq)
        },
      },
    ],
  }),
})

const widgetLifecyclePayloads = {
  added: z.object({ widget_id: z.string(), color: z.string(), sort_key: z.number() }),
  updated: z.object({ widget_id: z.string(), color: z.string() }),
  removed: z.object({ widget_id: z.string() }),
}

/** A tiny stand-in for room-inventory's restatement/retirement shape (issue 024). */
const widgetsLifecycle = defineModule({
  id: 'fixture-widgets-lifecycle',
  params: z.object({}),
  contribute: () => ({
    entity_kinds: [{ id: 'lc-widget', prefix: 'lcw_' }],
    label_keys: [{ key: 'lc-widget-color', scopes: ['lc-widget'] }],
    events: [
      {
        type: 'LcWidgetAdded',
        payload: widgetLifecyclePayloads.added,
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          const payload = event.payload as z.infer<typeof widgetLifecyclePayloads.added>
          capability.createEntity('lc-widget', payload.widget_id, event.seq, payload.sort_key)
          capability.setLabel(payload.widget_id, 'lc-widget-color', payload.color, null, null)
        },
      },
      {
        type: 'LcWidgetUpdated',
        payload: widgetLifecyclePayloads.updated,
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          const payload = event.payload as z.infer<typeof widgetLifecyclePayloads.updated>
          capability.replaceLabels(payload.widget_id, [
            { key: 'lc-widget-color', value: payload.color, strength: null, note: null },
          ])
        },
      },
      {
        type: 'LcWidgetRemoved',
        payload: widgetLifecyclePayloads.removed,
        authorize: alwaysAuthorized,
        fold: (capability: ModuleFoldCapability, event) => {
          const payload = event.payload as z.infer<typeof widgetLifecyclePayloads.removed>
          capability.retireEntity('lc-widget', payload.widget_id)
        },
      },
    ],
  }),
})

function event(overrides: Partial<Event> & { type: string; payload: JsonValue }): Event {
  return {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'org@test.invalid',
    subject: null,
    ...overrides,
  } as Event
}

describe('module fold boundary', () => {
  test('a selected module creates entities and labels through the composed dispatch', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [widgets({})] })
    const world = derive(
      [event({ type: 'WidgetAdded', payload: { widget_id: 'wg_1', color: 'red' } })],
      profile.validation_view,
    )
    expect(world.entities_by_kind.widget).toEqual([
      { id: 'wg_1', kind: 'widget', sort_key: 1, created_seq: 1 },
    ])
    expect(world.labels_by_entity.wg_1).toMatchObject([{ key: 'widget-color', value: 'red' }])
  })

  test('an event type no selected module defines fails replay', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [] })
    expect(() =>
      derive(
        [event({ type: 'WidgetAdded', payload: { widget_id: 'wg_1', color: 'red' } })],
        profile.validation_view,
      ),
    ).toThrow(/unknown event type/)
  })

  test('a module fold cannot create an entity of an undeclared kind', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [misbehavingKind({})] })
    expect(() =>
      derive([event({ type: 'RogueKindCreated', payload: {} })], profile.validation_view),
    ).toThrow(/did not declare entity kind: undeclared-kind/)
  })

  test('a module fold cannot set an undeclared label key', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [misbehavingKey({})] })
    expect(() =>
      derive([event({ type: 'RogueKeyCreated', payload: {} })], profile.validation_view),
    ).toThrow(/did not declare label key: undeclared-key/)
  })

  test('cross-kind id collision is impossible by construction: id must match the creating kind’s declared prefix (D27)', () => {
    const profile = defineOccasionProfile({
      meta,
      traits: {
        role: property({ title: 'Role', scopes: ['person'], value: enumOf(['adult']) }),
      },
      modules: [idCollision({})],
    })
    const events: Event[] = [
      {
        seq: 1,
        at: '2027-01-01T00:00:00Z',
        actor: 'org@test.invalid',
        subject: null,
        type: 'FamilyInvited',
        payload: { family_id: 'fam_1', email: 'a@test.invalid', display_name: 'A', locale: 'de' },
      } as Event,
      event({ type: 'ColliderCreated', payload: { id: 'fam_1' }, seq: 2 }),
    ]
    expect(() => derive(events, profile.validation_view)).toThrow(
      /id for kind collider must start with its declared prefix/,
    )
  })

  test('a duplicate active id under the same kind is rejected', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [idCollision({})] })
    const events: Event[] = [
      event({ type: 'ColliderCreated', payload: { id: 'co_1' }, seq: 1 }),
      event({ type: 'ColliderCreated', payload: { id: 'co_1' }, seq: 2 }),
    ]
    expect(() => derive(events, profile.validation_view)).toThrow(/entity already exists: co_1/)
  })

  test('a module fold cannot retire an entity of an undeclared kind', () => {
    const profile = defineOccasionProfile({
      meta,
      traits: {},
      modules: [misbehavingRetireKind({})],
    })
    expect(() =>
      derive([event({ type: 'RogueRetireCreated', payload: {} })], profile.validation_view),
    ).toThrow(/did not declare entity kind: undeclared-kind/)
  })

  test('a module fold cannot replaceLabels an undeclared label key', () => {
    const profile = defineOccasionProfile({
      meta,
      traits: {},
      modules: [misbehavingReplaceKey({})],
    })
    expect(() =>
      derive([event({ type: 'RogueReplaceCreated', payload: {} })], profile.validation_view),
    ).toThrow(/did not declare label key: undeclared-key/)
  })

  test('createEntity honors a declared source sort_key distinct from seq (issue 024)', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [widgetsLifecycle({})] })
    const events: Event[] = [
      event({
        type: 'LcWidgetAdded',
        payload: { widget_id: 'lcw_2', color: 'blue', sort_key: 2 },
        seq: 1,
      }),
      event({
        type: 'LcWidgetAdded',
        payload: { widget_id: 'lcw_1', color: 'red', sort_key: 1 },
        seq: 2,
      }),
    ]
    const world = derive(events, profile.validation_view)
    expect(world.entities_by_kind['lc-widget']?.map((widget) => widget.id)).toEqual([
      'lcw_1',
      'lcw_2',
    ])
  })

  test('replaceLabels atomically restates a full label set (issue 024)', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [widgetsLifecycle({})] })
    const events: Event[] = [
      event({
        type: 'LcWidgetAdded',
        payload: { widget_id: 'lcw_1', color: 'red', sort_key: 1 },
        seq: 1,
      }),
      event({ type: 'LcWidgetUpdated', payload: { widget_id: 'lcw_1', color: 'blue' }, seq: 2 }),
    ]
    const world = derive(events, profile.validation_view)
    const colors = world.labels.filter(
      (label) => label.entity_id === 'lcw_1' && label.key === 'lc-widget-color',
    )
    expect(colors).toHaveLength(1)
    expect(colors[0]?.value).toBe('blue')
  })

  test('retireEntity hard-removes the entity and its labels (issue 024, D27)', () => {
    const profile = defineOccasionProfile({ meta, traits: {}, modules: [widgetsLifecycle({})] })
    const events: Event[] = [
      event({
        type: 'LcWidgetAdded',
        payload: { widget_id: 'lcw_1', color: 'red', sort_key: 1 },
        seq: 1,
      }),
      event({ type: 'LcWidgetRemoved', payload: { widget_id: 'lcw_1' }, seq: 2 }),
    ]
    const world = derive(events, profile.validation_view)
    expect((world.entities_by_kind['lc-widget'] ?? []).some((w) => w.id === 'lcw_1')).toBe(false)
    expect(world.labels.some((label) => label.entity_id === 'lcw_1')).toBe(false)
  })
})
