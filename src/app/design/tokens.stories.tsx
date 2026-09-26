import type { Meta, StoryObj } from '@storybook/react-vite'
import { designTokens } from './tokens'

const meta = {
  title: 'Foundations/Design tokens',
  parameters: {
    docs: {
      description: {
        component:
          'Use semantic tokens for visual decisions. The CSS custom properties in globals.css remain the runtime source; this catalog explains their intent without duplicating values.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function TokenGroup({ group, tokens }: { group: string; tokens: readonly { name: string; cssVariable: string; use: string }[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-heading capitalize">{group}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tokens.map((token) => (
          <article key={token.name} className="rounded-base border-2 border-black bg-white p-4 shadow-shadow">
            <div
              className="mb-3 h-16 rounded-base border-2 border-black"
              style={{
                background:
                  group === 'color'
                    ? `var(${token.cssVariable})`
                    : group === 'geometry'
                      ? 'var(--paper)'
                      : 'var(--secondary-background)',
                borderRadius: group === 'geometry' ? 'var(--radius-base)' : undefined,
                boxShadow: group === 'geometry' ? 'var(--shadow)' : undefined,
              }}
            />
            <h3 className="font-heading">{token.name}</h3>
            <p className="font-mono text-sm text-muted">{token.cssVariable}</p>
            <p className="mt-1 text-sm">{token.use}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export const Catalog: Story = {
  render: () => (
    <div className="space-y-8 bg-background p-6 text-foreground sm:p-10">
      {(Object.entries(designTokens) as [string, readonly { name: string; cssVariable: string; use: string }[]][]).map(
        ([group, tokens]) => (
          <TokenGroup key={group} group={group} tokens={tokens} />
        ),
      )}
    </div>
  ),
}
