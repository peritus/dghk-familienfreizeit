import type { ReactNode } from 'react'

export function CollectionList({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="collection-list"
      className="min-w-0 overflow-hidden rounded-base border-2 border-border bg-secondary-background [&>*+*]:border-t-2 [&>*+*]:border-border"
    >
      {children}
    </div>
  )
}

export function CollectionRow({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <article
      data-slot="collection-row"
      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action ? (
        <div data-slot="row-actions" className="flex flex-wrap items-start gap-2 print:hidden">
          {action}
        </div>
      ) : null}
    </article>
  )
}

export function CompactMeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-sm text-muted">
      <strong className="text-foreground">{label}:</strong> {children}
    </p>
  )
}

export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="row-actions"
      className="flex flex-wrap items-start justify-end gap-2 print:hidden"
    >
      {children}
    </div>
  )
}
