import { Children, type ReactNode } from 'react'
import { cn } from '../../../lib/utils.js'

export function CollectionList({ children }: { children: ReactNode }) {
  return <ul data-slot="collection-list" className="m-0 min-w-0 list-none overflow-hidden rounded-base border-2 border-border bg-secondary-background p-0 [&>*+*]:border-t-[1.5px] [&>*+*]:border-rule">
    {Children.map(children, (child) => <li>{child}</li>)}
  </ul>
}
export function CollectionRow({ children, action, metric, id, className }: {
  children: ReactNode; action?: ReactNode; metric?: ReactNode; id?: string; className?: string
}) {
  return <article data-slot="collection-row" id={id} tabIndex={id ? -1 : undefined}
    className={cn('flex flex-wrap items-start gap-x-6 gap-y-3 p-4 sm:p-5', className)}>
    <div className="min-w-0 flex-[999_1_320px]">{children}</div>
    {metric ? <div data-slot="row-metric" className="w-full max-w-[260px] flex-[1_1_190px]">{metric}</div> : null}
    {action ? <div data-slot="row-actions" className="ml-auto flex flex-none flex-wrap items-start gap-2 print:hidden">{action}</div> : null}
  </article>
}
export function CompactMeta({ label, children }: { label: string; children: ReactNode }) {
  return <p className="text-sm font-normal text-muted"><span>{label}</span> {children}</p>
}
export function RowActions({ children }: { children: ReactNode }) {
  return <div data-slot="row-actions" className="flex flex-wrap items-start justify-end gap-2 print:hidden">{children}</div>
}
