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
        fold: (capability: ModuleFoldCapability, event) => {
          capability.createEntity('rogue-key-owned', 'rq_1', event.seq)
          capability.setLabel('rq_1', 'undeclared-key', 'x', null, null)
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
        fold: (capability: ModuleFoldCapability, event) => {
          const payload = event.payload as { id: string }
          capability.createEntity('collider', payload.id, event.seq)
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
})
