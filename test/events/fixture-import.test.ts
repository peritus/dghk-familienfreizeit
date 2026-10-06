import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { planAppendableBatches } from '../../scripts/import-fixture.mjs'
import { activeProfile } from '../../src/config/index.js'
import { assertAppendableWorld, derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { maxEventsPerBatch } from '../../src/worker/request-limits.js'

const fixturePaths = [
  '../fixtures/room-inventory/djh-luebben.kdl',
  '../fixtures/workshop-assignment/prototype-catalogue.kdl',
  '../fixtures/families/49_families.kdl',
]

const events = fixturePaths.flatMap((path) =>
  loadKdl(readFileSync(new URL(path, import.meta.url), 'utf8'), activeProfile.validation_view),
)
const combinedEvents = events.map((event, index) => ({ ...event, seq: index + 1 }))

test('the room, catalogue, and family fixtures form one appendable occasion stream', () => {
  const world = derive(combinedEvents, activeProfile.validation_view)
  assertAppendableWorld(world)

  expect(world.families).toHaveLength(49)
  expect(world.persons).toHaveLength(140)
  expect(world.entities_by_kind.room).toHaveLength(38)
  expect(world.labels.filter(({ key }) => key === 'prefers-workshop').length).toBeGreaterThan(0)
  expect(world.labels.filter(({ key }) => key === 'family-note')).toHaveLength(49)
})

test('fixture batches stay within the Worker limit and end at appendable prefixes', () => {
  const batches = planAppendableBatches(combinedEvents, 0, maxEventsPerBatch, (endIndex) => {
    try {
      assertAppendableWorld(
        derive(combinedEvents.slice(0, endIndex), activeProfile.validation_view),
      )
      return true
    } catch {
      return false
    }
  })

  expect(batches.flatMap(({ events: batch }) => batch)).toEqual(combinedEvents)
  expect(batches.every(({ events: batch }) => batch.length <= maxEventsPerBatch)).toBe(true)
  for (const { endIndex } of batches) {
    expect(() =>
      assertAppendableWorld(
        derive(combinedEvents.slice(0, endIndex), activeProfile.validation_view),
      ),
    ).not.toThrow()
  }
})
