import type { Meta, StoryObj } from '@storybook/react-vite'
import { OrganiserFrame, OrganiserMinimalFrame } from './organiser-frame.js'
import { FixtureProvider } from '../stories/organiser-fixtures.js'

const meta = {
  title: 'Application/Organiser frame',
  component: OrganiserFrame,
  decorators: [
    (story) => {
      const Story = story
      return (
        <FixtureProvider>
          <Story />
        </FixtureProvider>
      )
    },
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The organiser frame owns navigation, save status, the alert region, and one main landmark. Minimal frame variants cover pre-context loading and recovery states.',
      },
    },
  },
} satisfies Meta<typeof OrganiserFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Navigation: Story = {
  args: { children: <p>Inhalt</p> },
  render: () => (
    <OrganiserFrame>
      <h1 className="text-3xl font-heading">Bildschirm-Inhalt</h1>
    </OrganiserFrame>
  ),
}

export const MinimalRecoveryFrame: Story = {
  args: { children: <p>Inhalt</p> },
  render: () => (
    <OrganiserMinimalFrame>
      <p role="alert">Die Daten konnten nicht geladen werden.</p>
    </OrganiserMinimalFrame>
  ),
}
