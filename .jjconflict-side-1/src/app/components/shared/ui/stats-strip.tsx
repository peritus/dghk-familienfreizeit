import { cn } from '@/lib/utils'
import type { StatusTone } from './status-tone.js'
import { Card } from './card.js'

export type StatsStripItem = {
  value: string | number
  label: string
  tone?: StatusTone
}

export function StatsStrip({ items }: { items: readonly StatsStripItem[] }) {
  const columns =
    items.length === 1
      ? 'sm:grid-cols-1'
      : items.length === 2
        ? 'sm:grid-cols-2'
        : items.length === 3
          ? 'sm:grid-cols-3'
          : items.length === 4
            ? 'sm:grid-cols-4'
            : 'sm:grid-cols-5'
  return (
    <Card className="bg-secondary-background p-0">
      <div
        className={cn(
          'grid grid-cols-2 divide-y-2 divide-border sm:divide-y-0 sm:divide-x-2',
          columns,
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'p-4 text-center',
              item.tone === 'attention' && 'bg-main text-main-foreground',
            )}
          >
            <p className="text-4xl leading-none tabular-nums">{item.value}</p>
            <p className="mt-2 font-bold">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
