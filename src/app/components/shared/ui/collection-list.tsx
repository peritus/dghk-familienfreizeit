import type { ReactNode } from 'react'

export function CollectionList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background [&>*+*]:border-t-2 [&>*+*]:border-border">
      {children}
    </div>
  )
}

export function CollectionRow({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="flex flex-wrap items-start gap-2">{action}</div> : null}
    </article>
  )
}
