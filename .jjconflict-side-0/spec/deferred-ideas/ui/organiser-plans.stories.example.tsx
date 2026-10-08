import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlanComparison, PlanInspection } from './plans.js'

const meta = {
  title: 'Screens/Organiser/Plan review',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Plan views make derived placement results inspectable without turning the UI into a second domain-state store.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const CurrentPlan: Story = { render: () => <PlanInspection /> }

export const Comparison: Story = { render: () => <PlanComparison /> }
