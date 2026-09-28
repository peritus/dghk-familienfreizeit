import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExpandableFamilyMemberList } from './expandable-family-member-list.js'
import type { FamilyView } from './types.js'

const family: FamilyView = {
  id: 'family-baumann',
  name: 'Familie Baumann',
  people: [
    { id: 'ben-baumann', name: 'Ben Baumann', role: 'adult' },
    { id: 'clara-baumann', name: 'Clara Baumann', role: 'adult' },
    { id: 'david-baumann', name: 'David Baumann', role: 'child' },
    { id: 'ella-baumann', name: 'Ella Baumann', role: 'child' },
  ],
  bed_demand: 4,
  requirements: [],
  status: { label: 'Platziert', tone: 'success' },
}

const meta = {
  title: 'Components/Accommodation/Expandable family member list',
  component: ExpandableFamilyMemberList,
  parameters: {
    docs: {
      description: {
        component:
          'A compact family row that can reveal the individual family members without leaving the accommodation overview.',
      },
    },
  },
} satisfies Meta<typeof ExpandableFamilyMemberList>

export default meta
type Story = StoryObj<typeof meta>

export const Collapsed: Story = {
  args: {
    family,
    expanded: false,
    onToggle: () => undefined,
  },
}

export const Expanded: Story = {
  args: {
    family,
    expanded: true,
    onToggle: () => undefined,
  },
}
