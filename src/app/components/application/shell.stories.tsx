import type { Meta, StoryObj } from '@storybook/react-vite'
import { Shell } from './shell'

const meta = {
  title: 'Application/Public/Shell',
  component: Shell,
  parameters: {
    docs: {
      description: {
        component:
          'The public shell owns one skip link, one brand header, and one focusable main region. Organiser routes use their own frame and must not nest another shell.',
      },
    },
  },
  args: { children: <p>Inhalt</p> },
} satisfies Meta<typeof Shell>

export default meta
type Story = StoryObj<typeof meta>

export const Content: Story = {
  render: () => (
    <Shell>
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-8">
        <h1 className="text-3xl">Familienfreizeit</h1>
        <p>Öffentlicher Inhalt im gemeinsamen Shell-Rahmen.</p>
      </section>
    </Shell>
  ),
}
