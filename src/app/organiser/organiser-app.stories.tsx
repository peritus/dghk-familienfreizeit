import type { Meta, StoryObj } from '@storybook/react-vite'
import { buildRevision, compatibilityRevision } from '../../config/build.js'
import OrganiserApp from './organiser-app.js'
import { organiserFixtureEvents } from '../stories/organiser-fixtures.js'

const meta = {
  title: 'Application/Organiser/App',
  component: OrganiserApp,
  beforeEach: mockOrganiserApi,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'This composition story exercises the real organiser loader, derivation, frame, route switch, and dashboard together with a deterministic local API fixture.',
      },
    },
  },
} satisfies Meta<typeof OrganiserApp>

export default meta
type Story = StoryObj<typeof meta>

function LoadedOrganiserApp() {
  return <OrganiserApp />
}

function mockOrganiserApi() {
  const originalFetch = globalThis.fetch
  window.history.replaceState({}, '', '/organiser')
  globalThis.fetch = async (input) => {
    const url = String(input)
    if (url.endsWith('/api/me')) {
      return new Response(
        JSON.stringify({ principal: { kind: 'organiser', email: 'organiser@example.test' } }),
        { headers: { 'content-type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({
        events: organiserFixtureEvents,
        head_seq: organiserFixtureEvents.length,
        build_revision: buildRevision,
        compatibility_revision: compatibilityRevision,
        screen_registry: [],
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  }
  return () => {
    globalThis.fetch = originalFetch
  }
}

export const LoadedDashboard: Story = { render: () => <LoadedOrganiserApp /> }
