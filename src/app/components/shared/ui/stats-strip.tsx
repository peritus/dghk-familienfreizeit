import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusTone } from './status-tone.js'

export type StatsStripItem = {
  value: string | number
  label: string
  tone?: StatusTone
  filter?: { active: boolean; onToggle: () => void }
}
export function StatsStrip({ items }: { items: readonly StatsStripItem[] }) {
  const columns = items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'md:grid-cols-2'
    : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'
  return (
    <div data-slot="stats-strip" className={cn('grid grid-cols-2 gap-3', columns)}>
      {items.map((item) => {
        const warning = item.tone === 'attention' || Boolean(item.filter)
        const className = cn('rounded-base border-2 border-border bg-secondary-background px-4 py-3 text-left',
          warning && 'border-dashed', item.filter?.active && 'bg-warning-bg')
        const content = <>
          <p data-slot="stat-value" className="flex items-center gap-2 text-2xl font-bold leading-none tabular-nums">
            {warning ? <TriangleAlert aria-hidden="true" className="size-5" /> : null}{item.value}
          </p>
          <p className="mt-2 text-sm font-normal text-muted">{item.label}
            {item.filter ? <span className="print:hidden"> · <span className="underline underline-offset-2">{item.filter.active ? 'alle zeigen' : 'anzeigen'}</span></span> : null}
          </p>
        </>
        return item.filter ? <button key={item.label} type="button" className={className}
          aria-pressed={item.filter.active} onClick={item.filter.onToggle}>{content}</button>
          : <div key={item.label} className={className}>{content}</div>
      })}
    </div>
  )
}
