import { useCallback, useMemo, useState, type Dispatch, type ReactNode } from 'react'
import { activeProfile } from '../../config/index.js'
import type { Event, EventDraft } from '../../events/types.js'
import { OrganiserContext, type OrganiserContextValue } from '../organiser/context.js'
import {
  deriveOrganiserWorld,
  initialOrganiserState,
  organiserReducer,
  type OrganiserAction,
  type OrganiserState,
} from '../organiser/state.js'

const actor = 'organiser@example.test'

export const organiserFixtureDrafts: readonly EventDraft[] = [
  {
    at: '2027-01-01T00:00:00Z',
    actor,
    subject: null,
    type: 'FamilyInvited',
    payload: {
      family_id: 'fam_sonnenberg',
      email: 'sonnenberg@example.test',
      display_name: 'Familie Sonnenberg',
      locale: 'de',
    },
  },
  {
    at: '2027-01-01T00:01:00Z',
    actor,
    subject: 'fam_sonnenberg',
    type: 'PersonAdded',
    payload: {
      person_id: 'per_lena',
      family_id: 'fam_sonnenberg',
      given_name: 'Lena',
      family_name: 'Sonnenberg',
      birthdate: '2014-06-12',
      role: 'child',
    },
  },
  {
    at: '2027-01-01T00:02:00Z',
    actor,
    subject: 'fam_sonnenberg',
    type: 'PersonAdded',
    payload: {
      person_id: 'per_martin',
      family_id: 'fam_sonnenberg',
      given_name: 'Martin',
      family_name: 'Sonnenberg',
      birthdate: null,
      role: 'adult',
    },
  },
  {
    at: '2027-01-01T00:03:00Z',
    actor,
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_haupthaus', name: 'Haupthaus', sort_key: 1 },
  },
  {
    at: '2027-01-01T00:04:00Z',
    actor,
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_101',
      building_id: 'bld_haupthaus',
      number: '101',
      floor: 'ground',
      room_type: 'standard',
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:05:00Z',
    actor,
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'rm_101', key: 'sanitary', value: 'private', strength: null, note: null },
  },
  {
    at: '2027-01-01T00:06:00Z',
    actor,
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'rm_101',
      key: 'price-per-bed-eur',
      value: 24,
      strength: null,
      note: null,
    },
  },
  {
    at: '2027-01-01T00:07:00Z',
    actor,
    subject: null,
    type: 'BedAdded',
    payload: {
      bed_id: 'bed_101_a',
      room_id: 'rm_101',
      label: 'Bett 1',
      bed_type: 'single',
      sleeps: 1,
      sleeping_room: null,
      sort_key: 1,
    },
  },
  {
    at: '2027-01-01T00:08:00Z',
    actor,
    subject: null,
    type: 'BedAdded',
    payload: {
      bed_id: 'bed_101_b',
      room_id: 'rm_101',
      label: 'Bett 2',
      bed_type: 'bunk',
      sleeps: 2,
      sleeping_room: null,
      sort_key: 2,
    },
  },
]

export const organiserFixtureEvents: readonly Event[] = organiserFixtureDrafts.map(
  (event, index) => ({
    ...event,
    seq: index + 1,
  }),
)

export const organiserPendingDraft: EventDraft = {
  at: '2027-01-01T00:09:00Z',
  actor,
  subject: null,
  type: 'LabelSet',
  payload: {
    entity_id: 'rm_101',
    key: 'has-common-room',
    value: true,
    strength: null,
    note: null,
  },
}

export const organiserFixtureState = organiserReducer(initialOrganiserState, {
  type: 'loaded',
  events: organiserFixtureEvents,
  build_revision: 'storybook',
  compatibility_revision: 1,
  principal_email: actor,
})

export function stateWithDrafts(...drafts: readonly EventDraft[][]): OrganiserState {
  return drafts.reduce(
    (state, events) => organiserReducer(state, { type: 'stage', events }),
    organiserFixtureState,
  )
}

export function FixtureProvider({
  children,
  initialState = organiserFixtureState,
}: {
  children: ReactNode
  initialState?: OrganiserState
}) {
  const [state, dispatch] = useState<OrganiserState>(initialState)
  const update: Dispatch<OrganiserAction> = useCallback(
    (action) => dispatch((current) => organiserReducer(current, action)),
    [],
  )
  const stage = useCallback(
    (events: readonly EventDraft[]) => update({ type: 'stage', events }),
    [update],
  )
  const apply = useCallback(async () => undefined, [])
  const world = useMemo(() => deriveOrganiserWorld(state, activeProfile.validation_view), [state])
  const value: OrganiserContextValue = { state, world, dispatch: update, stage, apply }

  return <OrganiserContext.Provider value={value}>{children}</OrganiserContext.Provider>
}
