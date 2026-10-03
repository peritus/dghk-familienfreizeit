import type { ReactNode } from 'react'
import { cn } from '../../lib/utils.js'

export function OrganiserScreenHeader({
  title,
  actions,
  className,
}: {
  title: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-6',
        className,
      )}
    >
      <h1 className="text-3xl leading-tight font-heading sm:text-5xl">{title}</h1>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function OrganiserSectionHeader({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-heading">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
      </div>
      {action}
    </div>
  )
}
