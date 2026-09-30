import { expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import { officialWorkshopsWorld } from '../../src/modules/official-workshops/index.js'
import { workshopSchedulingWorld } from '../../src/modules/workshop-scheduling/index.js'
import { workshopSpaceWorld } from '../../src/modules/workshop-space/index.js'
import { deriveOrganiserWorld } from '../../src/app/organiser/state.js'
import { organiserWorkshopFixtureState } from '../../src/app/stories/organiser-fixtures.js'
import { fullWorkshopCatalogue, fullWorkshopRows } from '../../src/app/stories/workshop-fixtures.js'

test('the workshop screen fixture contains a derived multi-state catalogue', () => {
  const world = deriveOrganiserWorld(organiserWorkshopFixtureState, activeProfile.validation_view)
  const workshops = officialWorkshopsWorld(world)
  const spaces = workshopSpaceWorld(world)
  const schedule = workshopSchedulingWorld(world)

  expect(workshops.workshops).toHaveLength(4)
  expect(workshops.external_leaders).toHaveLength(1)
  expect(spaces.live).toHaveLength(3)
  expect(schedule.slots).toHaveLength(3)
  expect(workshops.workshops.map((workshop) => workshop.mode)).toEqual([
    'assigned',
    'assigned',
    'sign-up',
    'assigned',
  ])
})

test('style-guide fixtures cover full-data states through the shared mapper', () => {
  expect(fullWorkshopCatalogue).toHaveLength(8)
  expect(fullWorkshopRows).toHaveLength(fullWorkshopCatalogue.length)
  expect(fullWorkshopRows.some((workshop) => workshop.audience === 'Erwachsene')).toBe(true)
  expect(fullWorkshopRows.some((workshop) => workshop.participation_mode === 'Anmeldung')).toBe(
    true,
  )
  expect(fullWorkshopRows.some((workshop) => workshop.placement?.tone === 'attention')).toBe(true)
})
