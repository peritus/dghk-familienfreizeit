import type { Meta, StoryObj } from '@storybook/react-vite'
import { FamilyDetail } from './family-detail.js'
import {
  FixtureProvider,
  organiserFamilyDetailFixtureState,
} from '../../stories/organiser-fixtures.js'

const meta = {
  title: 'Screens/Organiser/Family detail',
  component: FamilyDetail,
  decorators: [
    (story) => {
      const Story = story
      return (
        <FixtureProvider initialState={organiserFamilyDetailFixtureState}>
          <Story />
        </FixtureProvider>
      )
    },
  ],
  args: { family_id: 'fam_sonnenberg' },
  parameters: {
    docs: {
      description: {
        component:
          'Family detail is the focused editing surface for people and human-readable changes. Existing people stay read-only until Bearbeiten is selected.',
      },
    },
  },
} satisfies Meta<typeof FamilyDetail>

export default meta
type Story = StoryObj<typeof meta>

export const WithPeople: Story = {}

export const Zimmer: Story = { args: { topic: 'zimmer' } }

export const Personen: Story = { args: { topic: 'personen', person_id: 'per_lena' } }

export const Essen: Story = { args: { topic: 'essen', person_id: 'per_lena' } }

export const Workshops: Story = { args: { topic: 'workshops', person_id: 'per_lena' } }

export const MissingFamily: Story = { args: { family_id: 'fam_missing' } }
