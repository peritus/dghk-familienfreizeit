import type { Meta, StoryObj } from '@storybook/react-vite'
import { Login } from './login.js'

const meta = {
  title: 'Screens/Public/Login',
  component: Login,
  parameters: {
    docs: {
      description: {
        component:
          'The public sign-in screen is the entry point for organisers and family members. Keep the action explicit and the recovery link close to the form.',
      },
    },
  },
} satisfies Meta<typeof Login>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
