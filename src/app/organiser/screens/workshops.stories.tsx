import dataset from '../../../../test/fixtures/workshop-assignment/prototype-dataset.kdl?raw'
import { activeProfile } from '../../../config/index.js'
import { luebben2027Branding } from '../../../config/profiles/luebben-2027/branding.js'
import { loadKdl } from '../../../events/kdl.js'
import { initialOrganiserState, organiserReducer } from '../state.js'
import { OrganiserFrame } from '../organiser-frame.js'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FixtureProvider, organiserWorkshopFixtureState } from '../../stories/organiser-fixtures.js'
import {
  WorkshopExternalLeaders,
  WorkshopLeaders,
  Workshops,
  WorkshopProgramme,
  WorkshopSlots,
  WorkshopSpaces,
} from './workshops.js'

const meta = {
  title: 'Screens/Organiser/Workshops',
  decorators: [
    (story) => {
      const Story = story
      return (
        <FixtureProvider initialState={organiserWorkshopFixtureState}>
          <Story />
        </FixtureProvider>
      )
    },
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = { render: () => <Workshops /> }

export const ExternalLeaders: Story = { render: () => <WorkshopExternalLeaders /> }

export const Leaders: Story = { render: () => <WorkshopLeaders /> }

export const Programme: Story = { render: () => <WorkshopProgramme /> }

export const Slots: Story = { render: () => <WorkshopSlots /> }

export const Spaces: Story = { render: () => <WorkshopSpaces /> }

const completeState = organiserReducer(initialOrganiserState, {
  type: 'loaded',
  events: loadKdl(`${dataset}\nWorkshopChoiceOpened`, activeProfile.validation_view),
  build_revision: 'storybook',
  compatibility_revision: 1,
  feature_overrides: [],
  principal_email: 'organiser@example.test',
})
const complete: Story = {
  render: () => (
    <FixtureProvider initialState={completeState} with_plan>
      <OrganiserFrame
        print_generated_at={new Date('2027-04-01T10:00:00Z')}
        profile={{ meta: activeProfile.meta, branding: luebben2027Branding }}
      >
        <Workshops />
      </OrganiserFrame>
    </FixtureProvider>
  ),
  parameters: { layout: 'fullscreen', route: { path: '/workshops' } },
}
export const Width390: Story = { ...complete }

export const Width640: Story = { ...complete }

export const Width768: Story = { ...complete }

export const Width1024: Story = { ...complete }

export const Width1280: Story = { ...complete }

export const Print: Story = { ...complete }
