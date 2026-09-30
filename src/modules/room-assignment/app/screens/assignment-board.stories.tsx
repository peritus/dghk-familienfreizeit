import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  FixtureProvider,
  organiserAssignmentFixedFixtureState,
} from '../../../../app/stories/organiser-fixtures.js'
import { AssignmentBoard, AssignmentBoardScreen } from './assignment-board.js'
import type { AssignmentPrintView, BoardView } from './assignment-board/types.js'

const meta = {
  title: 'Modules/room-assignment/Screens/Assignment board',
  component: AssignmentBoardScreen,
  decorators: [
    (story) => {
      const StoryComponent = story
      return (
        <FixtureProvider>
          <StoryComponent />
        </FixtureProvider>
      )
    },
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The board is a solver-owned projection of the current derived world and result. Its narrow fixed-assignment action uses the shared organiser draft pipeline.',
      },
    },
  },
} satisfies Meta<typeof AssignmentBoardScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}

export const MobileReviewState: Story = {
  parameters: { viewport: { ['defaultViewport']: 'mobile1' } },
  render: () => (
    <FixtureProvider>
      <AssignmentBoardScreen />
    </FixtureProvider>
  ),
}

export const PopulatedWithSharedOrganiserState: Story = {
  render: () => (
    <FixtureProvider initialState={organiserAssignmentFixedFixtureState}>
      <AssignmentBoardScreen />
    </FixtureProvider>
  ),
}

const noProblemsView: BoardView = {
  stats: { families: 2, without_room: 0, without_match: 0, fixed: 0, free_places: 0 },
  unplaced: [],
  without_match: [],
  free_rooms: [],
  partial_rooms: [],
  unplaced_reasons: {},
  buildings: [
    {
      id: 'bld_haupthaus',
      name: 'Haupthaus',
      family_count: 2,
      requirement_issues: 0,
      wish_issues: 0,
      rooms: [
        {
          id: 'rm_1',
          name: 'Zimmer 1',
          building: 'Haupthaus',
          floor: 'Erdgeschoss',
          capacity: 2,
          occupied: 2,
          free: 0,
          occupants: [],
          features: [],
          feature_keys: [],
          beds: [{ bed_type: 'single', count: 2, sleeps: 2 }],
          fixed_family_ids: [],
          fixed_invalid_family_ids: [],
          fit_hints: [],
        },
      ],
    },
  ],
}

const noProblemsPrint: AssignmentPrintView = {
  generated_at: '01.01.2027, 12:00:00',
  data_cut: 'Ereignis 1',
  audience: 'Organisationsteam',
  sensitivity: 'Nur Organisationsteam',
  total_families: 2,
  placed_families: 2,
  unplaced_families: 0,
  rooms: [],
  unplaced: [],
  findings: [],
}

export const NoProblems: Story = {
  render: () => (
    <FixtureProvider>
      <AssignmentBoard view={noProblemsView} print={noProblemsPrint} />
    </FixtureProvider>
  ),
}
