import type { Meta, StoryObj } from '@storybook/react-vite'
import { SuccessState } from './success-state.js'

const meta = { title: 'UI/Success state', component: SuccessState } satisfies Meta<
  typeof SuccessState
>
export default meta
type Story = StoryObj<typeof meta>

export const Messages: Story = {
  args: { children: null },
  render: () => (
    <div className="space-y-3 bg-background p-6">
      <SuccessState>Alle Familien haben ein Zimmer</SuccessState>
      <SuccessState>Alle Zimmer sind belegt</SuccessState>
      <SuccessState>Alle belegten Zimmer sind voll</SuccessState>
    </div>
  ),
}
