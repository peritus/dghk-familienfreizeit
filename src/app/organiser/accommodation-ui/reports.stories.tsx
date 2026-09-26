import type { Meta, StoryObj } from '@storybook/react-vite'
import { AssignmentReports } from './reports.js'

const meta = {
  title: 'Screens/Organiser/Assignment report',
  component: AssignmentReports,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The assignment report is a readable, printable projection of the current placement view.' } },
  },
} satisfies Meta<typeof AssignmentReports>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}

