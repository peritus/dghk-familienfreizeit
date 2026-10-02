import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import { assertAppendableWorld, derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'

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
