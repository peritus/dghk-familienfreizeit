import type { Preview } from '@storybook/react-vite'
import '../src/app/globals.css'

const preview: Preview = {
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
