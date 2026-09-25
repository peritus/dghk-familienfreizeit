import { describe, expect, test } from 'vitest'
import {
  roomPropertyDefinitions,
  roomTraitDefaults,
  roomTraitLabelChanges,
  sleepsForBedType,
  validateRoomTraitValues,
} from '../../src/app/organiser/screens/inventory-events.js'

describe('inventory room trait events', () => {
  test('uses the selected profile’s room properties and rejects missing required values', () => {
    const values = roomTraitDefaults()
    expect(roomPropertyDefinitions.map(({ key }) => key)).toEqual(
      expect.arrayContaining(['sanitary', 'price-per-bed-eur', 'is-accessible']),
    )
    expect(validateRoomTraitValues(values)).toMatch(/Sanitär|Preis/)

    values.sanitary = 'private'
    values['price-per-bed-eur'] = 100
    expect(validateRoomTraitValues(values)).toBeNull()
  })

  test('emits ordinary label events and explicit clears for editable room traits', () => {
    const values = roomTraitDefaults()
    values.sanitary = 'private'
    values['price-per-bed-eur'] = null
    const changes = roomTraitLabelChanges('rm_1', values, [
      {
        entity_id: 'rm_1',
        key: 'price-per-bed-eur',
        value: 25,
        value_type: 'number',
        strength: null,
        note: null,
        set_seq: 1,
        sensitivity: 'normal',
      },
    ])
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: 'LabelSet',
        payload: expect.objectContaining({ key: 'sanitary' }),
      }),
    )
    expect(changes).toContainEqual({
      type: 'LabelCleared',
      payload: { entity_id: 'rm_1', key: 'price-per-bed-eur', value: null },
    })
  })

  test('places per bed follow from bed type alone (D18/D19)', () => {
    expect(sleepsForBedType('single')).toBe(1)
    expect(sleepsForBedType('double')).toBe(2)
    expect(sleepsForBedType('bunk')).toBe(2)
  })
})
