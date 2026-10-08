import type { Meta, StoryObj } from '@storybook/react-vite'
import { activeProfile } from '../../../config/index.js'
import { closedResults } from '../../../config/phases.js'
import { derive } from '../../../events/fold.js'
import type { Event, JsonValue } from '../../../events/types.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../../solver/index.js'
import {
  FixtureProvider,
  organiserAssignmentFixtureState,
  organiserFixtureState,
} from '../../stories/organiser-fixtures.js'
import { initialOrganiserState, organiserReducer, type OrganiserState } from '../state.js'
import {
  AreaClosingActions,
  AreaClosingReview,
  ClosedAreaDifferences,
  useClosedArea,
} from './area-closing.js'

const meta = {
  title: 'Application/Organiser/Area closing',
  component: AreaClosingActions,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AreaClosingActions>

export default meta
type Story = StoryObj

/** The assignment fixture closed with one family missing, so the board differs from it. */
function staleClosedState(): OrganiserState {
  const base = organiserAssignmentFixtureState
  const world = derive(base.committed, activeProfile.validation_view)
  const contributions = composeSolverContributions(activeProfile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'storybook',
    compatibility_revision: 1,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  const result = closedResults(activeProfile.modules)
    .get('accommodation')!
    .compute({ world, plan }) as unknown as { placements: readonly JsonValue[] }
  const closing: Event = {
    seq: base.committed.length + 1,
    at: '2027-04-01T08:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'AccommodationClosed',
    payload: {
      ...(result as unknown as Record<string, JsonValue>),
      placements: result.placements.slice(1),
      build_revision: 'storybook',
      compatibility_revision: 1,
    },
  }
  return organiserReducer(initialOrganiserState, {
    type: 'loaded',
    events: [...base.committed, closing],
    build_revision: 'storybook',
    compatibility_revision: 1,
    feature_overrides: [],
    principal_email: 'organiser@example.test',
  })
}

/** The review body the Festlegen dialog shows, rendered inline so it can be captured. */
function Review() {
  const state = useClosedArea('accommodation')
  return state ? <AreaClosingReview state={state} /> : null
}

export const ReviewBlocked: Story = {
  render: () => (
    <FixtureProvider initialState={organiserAssignmentFixtureState} with_plan>
      <Review />
    </FixtureProvider>
  ),
}

export const ReviewFirstClosing: Story = {
  render: () => (
    <FixtureProvider initialState={organiserFixtureState} with_plan>
      <Review />
    </FixtureProvider>
  ),
}

export const Differences: Story = {
  render: () => (
    <FixtureProvider initialState={staleClosedState()} with_plan>
      <div className="space-y-4">
        <AreaClosingActions area="accommodation" />
        <ClosedAreaDifferences area="accommodation" />
      </div>
    </FixtureProvider>
  ),
}
