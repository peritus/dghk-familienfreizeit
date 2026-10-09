import { describe, expect, test } from 'vitest'
import { buildProgrammeView } from '../../src/modules/workshop-scheduling/app/programme-view.js'

const baseInput = {
  workshops: [
    {
      id: 'wks_ceramics',
      title: 'Keramik',
      description: '',
      audience: 'children',
      age_min: 5,
      age_max: 14,
      capacity: 10,
      mode: 'assigned' as const,
      leader_ids: ['per_lead'],
      needs: [],
      cancelled: false,
      cancellation_reason: null,
      sort_key: 1,
    },
    {
      id: 'wks_circus',
      title: 'Zirkus',
      description: '',
      audience: 'children',
      age_min: 5,
      age_max: 12,
      capacity: 12,
      mode: 'assigned' as const,
      leader_ids: [],
      needs: [],
      cancelled: false,
      cancellation_reason: null,
      sort_key: 2,
    },
    {
      id: 'wks_unplaced',
      title: 'Schmieden',
      description: '',
      audience: 'children',
      age_min: 12,
      age_max: 15,
      capacity: 6,
      mode: 'assigned' as const,
      leader_ids: [],
      needs: [],
      cancelled: false,
      cancellation_reason: null,
      sort_key: 3,
    },
  ],
  slots: [
    {
      id: 'slot_morning',
      starts_at: '2027-05-14T09:00:00+02:00',
      ends_at: '2027-05-14T11:00:00+02:00',
      sort_key: 1,
    },
  ],
  spaces: [
    {
      id: 'wsp_atelier',
      name: 'Atelier',
      location_description: 'Haupthaus',
      capacity: 12,
      availability_windows: [],
      sort_key: 1,
    },
    {
      id: 'wsp_halle',
      name: 'Halle',
      location_description: 'Haus 2',
      capacity: 24,
      availability_windows: [],
      sort_key: 2,
    },
  ],
  blocks: [{ id: 'blk_halle', space_id: 'wsp_halle', slot_id: 'slot_morning', reason: null }],
  placements: [{ workshop_id: 'wks_ceramics', slot_id: 'slot_morning', space_id: 'wsp_atelier' }],
  unscheduled: [{ workshop_id: 'wks_unplaced', reason: 'hard.missing-capability' }],
  demand: { wks_ceramics: 14, wks_unplaced: 9 },
  assignments: [{ person_id: 'per_a', workshop_id: 'wks_ceramics' }],
  signups: [],
  interests: [],
  rankings: [],
  person_names: new Map(),
  leader_names: new Map([['per_lead', 'Sam Morgan']]),
  overlap_rank: 3,
  time_zone: 'Europe/Berlin',
}

describe('buildProgrammeView', () => {
  test('projects grouped programme rows with rich workshop cells', () => {
    const view = buildProgrammeView(baseInput)

    expect(view.rooms).toEqual([
      { id: 'wsp_atelier', label: 'Atelier' },
      { id: 'wsp_halle', label: 'Halle' },
    ])
    expect(view.rows[0]).toMatchObject({
      day_label: 'Freitag, 14.05.',
      slot_label: '09:00–11:00',
    })
    expect(view.rows[0]?.cells).toEqual([
      expect.objectContaining({
        state: 'placed',
        title: 'Keramik',
        leaders: 'Sam Morgan',
        capacity_label: '1 / 10 · 9 frei',
        demand_label: '14 Wünsche',
      }),
      { id: 'slot_morning-wsp_halle', state: 'blocked' },
    ])
  })

  test('counts fixed attendance once beside sign-ups and shows it for interest workshops', () => {
    const view = buildProgrammeView({
      ...baseInput,
      workshops: baseInput.workshops.map((workshop) =>
        workshop.id === 'wks_ceramics' ? { ...workshop, mode: 'interest' as const } : workshop,
      ),
      assignments: [{ person_id: 'per_a', workshop_id: 'wks_ceramics' }],
      signups: [
        { person_id: 'per_a', workshop_id: 'wks_ceramics' },
        { person_id: 'per_b', workshop_id: 'wks_ceramics' },
      ],
      interests: [{ person_id: 'per_c', workshop_id: 'wks_ceramics' }],
    })

    expect(view.rows[0]?.cells[0]).toEqual(
      expect.objectContaining({ capacity_label: '2 / 10 · 8 frei · 1 Interesse' }),
    )
  })

  test('projects unscheduled reasons and ranked same-slot overlaps', () => {
    const view = buildProgrammeView({
      ...baseInput,
      placements: [
        ...baseInput.placements,
        { workshop_id: 'wks_circus', slot_id: 'slot_morning', space_id: 'wsp_halle' },
      ],
      blocks: [],
      rankings: [
        {
          person_id: 'per_a',
          choices: [
            { workshop_id: 'wks_ceramics', rank: 1 },
            { workshop_id: 'wks_circus', rank: 2 },
          ],
        },
      ],
      person_names: new Map([['per_a', 'Alex Morgan']]),
    })

    expect(view.unplaced).toEqual([
      expect.objectContaining({
        title: 'Schmieden',
        reason: 'Kein Raum erfüllt die benötigten Eigenschaften.',
      }),
    ])
    expect(view.overlaps).toEqual([
      {
        id: 'wks_ceramics:wks_circus',
        workshops: 'Keramik + Zirkus',
        slot: 'Freitag, 14.05., 09:00–11:00',
        people_count: 1,
        people: ['Alex Morgan'],
      },
    ])
  })

  test('projects fixed placement precedence beside the automatic-only result', () => {
    const view = buildProgrammeView({
      ...baseInput,
      fixed_placements: [
        {
          workshop_id: 'wks_ceramics',
          slot_id: 'slot_morning',
          space_id: 'wsp_atelier',
          note: 'Nähe zum Eingang',
        },
      ],
      automatic_placements: [
        { workshop_id: 'wks_ceramics', slot_id: 'slot_morning', space_id: 'wsp_halle' },
      ],
      fixed_placement_violations: [],
    })

    expect(view.rows[0]?.cells[0]).toEqual(
      expect.objectContaining({ fixed: true, fixed_invalid: false }),
    )
    expect(view.fixed_reviews).toEqual([
      {
        id: 'fixed-wks_ceramics-slot_morning/wsp_atelier',
        subject: 'Keramik',
        fixed_target: '09:00–11:00 · Atelier',
        automatic_targets: ['09:00–11:00 · Halle'],
        status: 'overrides',
      },
    ])
  })
})
