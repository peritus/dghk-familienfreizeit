import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FamilyPersonSidebar } from './family-detail.js'
import { familyPeople } from '../family-data.js'
import { useOrganiser } from '../context.js'
import {
  FixtureProvider,
  organiserFamilyDetailFixtureState,
} from '../../stories/organiser-fixtures.js'

const meta = {
  title: 'Application/Organiser/Family detail components',
  component: FamilyPersonSidebar,
  args: {
    family_id: 'fam_sonnenberg',
    topic: 'essen',
    persons: [],
    on_select: () => undefined,
    adding: false,
    on_add_change: () => undefined,
    actor: 'organiser@example.test',
    stage: () => undefined,
  },
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
  parameters: {
    docs: {
      description: {
        component:
          'The person sidebar is the nested selector shared by Personen, Essen, and Workshops. It owns no route or domain state.',
      },
    },
  },
} satisfies Meta<typeof FamilyPersonSidebar>

export default meta
type Story = StoryObj<typeof meta>

function SelectedPersonSidebar() {
  const { world, stage } = useOrganiser()
  const persons = familyPeople(world!, 'fam_sonnenberg')
  const [selected, setSelected] = useState(persons[0]?.entity.id)
  const [adding, setAdding] = useState(false)
  return (
    <FamilyPersonSidebar
      family_id="fam_sonnenberg"
      topic="essen"
      persons={persons}
      selected_person_id={selected}
      on_select={setSelected}
      adding={adding}
      on_add_change={setAdding}
      actor="organiser@example.test"
      stage={stage}
    />
  )
}

export const SelectedPerson: Story = { render: () => <SelectedPersonSidebar /> }
