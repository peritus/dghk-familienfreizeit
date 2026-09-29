import { expect, test } from 'vitest'
import { buildSolverInput } from '../../src/solver/input.js'
import { composeSolverContributions, solve } from '../../src/solver/index.js'
import { derive } from '../../src/events/fold.js'
import type { Event, JsonValue } from '../../src/events/types.js'
import { familienfreizeit2027Profile } from '../../src/config/profiles/familienfreizeit-2027.js'

function event(type: string, payload: JsonValue, seq: number): Event {
  return {
    seq,
    at: '2027-04-30T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  }
}

test('places one workshop and allocates a ranked person through the composed stages', () => {
  const events = [
    event(
      'FamilyInvited',
      { family_id: 'fam_a', email: 'a@example.test', display_name: 'A', locale: 'de' },
      1,
    ),
    event(
      'PersonAdded',
      {
        person_id: 'per_a',
        family_id: 'fam_a',
        given_name: 'A',
        family_name: 'A',
        birthdate: '2015-01-01',
        role: 'child',
      },
      2,
    ),
    event(
      'WorkshopSpaceAdded',
      {
        workshop_space_id: 'wsp_hall',
        name: 'Halle',
        location_description: 'Erdgeschoss',
        capacity: 10,
        availability_windows: [
          { starts_at: '2027-04-30T08:00:00Z', ends_at: '2027-04-30T18:00:00Z' },
        ],
        sort_key: 1,
      },
      3,
    ),
    event(
      'WorkshopSlotAdded',
      {
        slot_id: 'slot_morning',
        starts_at: '2027-04-30T09:00:00Z',
        ends_at: '2027-04-30T11:00:00Z',
        sort_key: 1,
      },
      4,
    ),
    event(
      'WorkshopAdded',
      {
        workshop_id: 'wks_ceramics',
        title: 'Keramik',
        description: 'Ton und Farbe',
        audience: 'children',
        age_min: 6,
        age_max: 14,
        capacity: 8,
        participation_mode: 'assigned',
        leader_ids: [],
        needs: [],
        sort_key: 1,
      },
      5,
    ),
    event(
      'LabelSet',
      {
        entity_id: 'per_a',
        key: 'prefers-workshop',
        value: { workshop_id: 'wks_ceramics', rank: 1 },
        strength: null,
        note: null,
      },
      6,
    ),
  ]
  const world = derive(events, familienfreizeit2027Profile.validation_view)
  const contributions = composeSolverContributions(familienfreizeit2027Profile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'test',
    compatibility_revision: 1,
    event_date: '2027-04-30',
    profile: familienfreizeit2027Profile,
    seed: null,
  })
  const placement = plan.sections['workshop-scheduling'] as {
    placements: readonly { workshop_id: string }[]
  }
  const attendance = plan.sections['workshop-assignment'] as {
    assignments: readonly { person_id: string; workshop_id: string }[]
  }
  expect(placement.placements).toEqual([
    { workshop_id: 'wks_ceramics', slot_id: 'slot_morning', space_id: 'wsp_hall' },
  ])
  expect(attendance.assignments).toEqual([
    {
      person_id: 'per_a',
      workshop_id: 'wks_ceramics',
      slot_id: 'slot_morning',
      rank: 1,
      reason: 'ranked',
    },
  ])
})
