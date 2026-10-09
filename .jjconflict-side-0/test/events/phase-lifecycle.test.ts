import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { activeProfile } from '../../src/config/index.js'
import { closedResults } from '../../src/config/phases.js'
import { deriveFeatureView } from '../../src/derive/features.js'
import { derivePhaseView, phaseActivation } from '../../src/derive/phases.js'
import { derive } from '../../src/events/fold.js'
import { loadKdl } from '../../src/events/kdl.js'
import { officialWorkshopsWorld } from '../../src/modules/official-workshops/index.js'
import { workshopsClosedResult } from '../../src/modules/workshop-assignment/closed-result.js'

const config = activeProfile.validation_view
const events = loadKdl(
  readFileSync(resolve(process.cwd(), 'test/fixtures/phases/workshop-lifecycle.kdl'), 'utf-8'),
  config,
)
const world = derive(events, config)
const atType = (type: string) => events.filter((event) => event.type === type)

describe('workshop lifecycle fixture', () => {
  test('records the opening, both closings, and the reopening in order', () => {
    const seqOf = (type: string) => atType(type).map(({ seq }) => seq)
    expect(world.phase_facts.opened['workshop-rankings.choice']?.seq).toBe(
      seqOf('WorkshopChoiceOpened')[0],
    )
    const area = world.phase_facts.areas.workshops!
    expect(area.closings.map(({ seq }) => seq)).toEqual(seqOf('WorkshopsClosed'))
    expect(seqOf('WorkshopsReopened')[0]).toBeGreaterThan(area.closings[0]!.seq)
    expect(seqOf('WorkshopsReopened')[0]).toBeLessThan(area.closings[1]!.seq)
    expect(area.latest).toMatchObject({ kind: 'closed', seq: area.closings[1]!.seq })
  })

  test('the re-close records the corrected attendance and the before/after difference', () => {
    const [first, second] = world.phase_facts.areas.workshops!.closings
    expect(workshopsClosedResult(second!.payload)?.attendance).toEqual([
      { person_id: 'per_ada', workshop_id: 'wks_ton' },
      { person_id: 'per_bo', workshop_id: 'wks_ton' },
    ])
    expect(
      closedResults(activeProfile.modules)
        .get('workshops')!
        .compare(first!.payload, second!.payload, world),
    ).toEqual({
      changes: [
        {
          kind: 'moved',
          subject_id: 'per_bo',
          family_id: 'fam_linde',
          before: 'wks_wald',
          after: 'wks_ton',
        },
      ],
      affected_family_ids: ['fam_linde'],
    })
  })

  test('the closed result survives a withdrawn person and a cancelled workshop', () => {
    const latest = workshopsClosedResult(
      world.phase_facts.areas.workshops!.closings.at(-1)!.payload,
    )!
    expect(latest.attendance.map(({ person_id }) => person_id)).toContain('per_ada')
    expect(world.persons.map(({ id }) => id)).toEqual(['per_bo'])
    expect(latest.placements.map(({ workshop_id }) => workshop_id)).toContain('wks_wald')
    expect(officialWorkshopsWorld(world).cancelled.map(({ id }) => id)).toEqual(['wks_wald'])
  })

  test('the closed area removes the family workshop wishes and keeps the organiser ones', () => {
    const phases = derivePhaseView({
      modules: activeProfile.modules,
      meta: activeProfile.meta,
      world,
      now: '2027-04-22T00:00:00.000Z',
      plan: null,
    })
    expect(phases.find(({ phase }) => phase === 'workshop-rankings.choice')?.status).toBe('closed')
    const view = deriveFeatureView({
      modules: activeProfile.modules,
      world,
      overrides: [],
      phase_active: phaseActivation(phases),
      principal: 'diagnostics',
    })
    const effective = (id: string) => view.find(({ feature }) => feature === id)?.effective
    expect(effective('workshop-rankings.family-workshop-wishes')).toBe(false)
    expect(effective('workshop-rankings.organiser-workshop-wishes')).toBe(true)
    expect(effective('family-preferences.family-room-wishes')).toBe(true)
  })
})
