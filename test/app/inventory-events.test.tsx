import { describe, expect, test } from 'vitest'
import {
  roomPropertyDefinitions,
  roomTraitDefaults,
  roomTraitLabelChanges,
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
    values['price-per-bed-eur'] = 100
    values['beds-per-sleeping-room'] = null
    const changes = roomTraitLabelChanges('rm_1', values, [
      {
        entity_id: 'rm_1',
        key: 'beds-per-sleeping-room',
        value: 2,
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
      payload: { entity_id: 'rm_1', key: 'beds-per-sleeping-room', value: null },
    })
  })
})
