import { useState, type ReactNode } from 'react'
import type { Preview } from '@storybook/react-vite'
import { Router } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import '../src/app/globals.css'

function IsolatedStoryRouter({
  children,
  initialPath,
}: {
  children: ReactNode
  initialPath: string
}) {
  const [location] = useState(() => memoryLocation({ path: initialPath }))

  return (
    <Router hook={location.hook} searchHook={location.searchHook}>
      {children}
    </Router>
  )
}

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <IsolatedStoryRouter
        key={context.id}
        initialPath={String(context.parameters.route?.path ?? '/')}
      >
        <Story />
      </IsolatedStoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      expanded: true,
      sort: 'requiredFirst',
    },
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: 'hsl(33 100% 92%)' },
        { name: 'white', value: '#ffffff' },
        { name: 'black', value: '#000000' },
      ],
    },
  },
}

export default preview
