import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotFound, RouteBoundary, RouteLoading } from './route-states'

const meta = {
  title: 'Application/Route states',
  parameters: {
    docs: {
      description: {
        component: 'Route states give every navigation boundary a recoverable, accessible response. Loading must not look like empty data; errors must offer recovery without exposing exception details.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { render: () => <RouteLoading /> }
export const NotFoundState: Story = { render: () => <NotFound /> }
export const HealthyBoundary: Story = { render: () => <RouteBoundary reset_key="storybook"><p className="p-6">Geschützter Inhalt</p></RouteBoundary> }
