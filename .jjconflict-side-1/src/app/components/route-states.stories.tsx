import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotFound, RouteBoundary, RouteLoading } from './route-states'

const meta = {
  title: 'Application/Route states',
  parameters: {
    docs: {
      description: {
        component:
          'Route states give every navigation boundary a recoverable, accessible response. Loading uses one calm preparation panel rather than pretending to know the shape of the next screen; errors offer recovery without exposing exception details.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { render: () => <RouteLoading /> }

export const NotFoundState: Story = { render: () => <NotFound /> }

export const HealthyBoundary: Story = {
  render: () => (
    <RouteBoundary reset_key="storybook">
      <p className="p-6">Geschützter Inhalt</p>
    </RouteBoundary>
  ),
}
