import type { ReactNode } from 'react'
import type { StatusTone } from './status-tone.js'
import { Badge } from './badge.js'
import { cn } from '../../../lib/utils.js'

export function ActionableNotices({
  children,
  label = 'Handlungsbedarf',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <section data-slot="actionable-notices" aria-label={label} className="space-y-3">
      {children}
    </section>
  )
}

export function ActionableNotice({
  title,
  children,
  action,
  tone = 'attention',
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  tone?: 'attention' | 'danger' | 'neutral'
}) {
  return (
    <div
      data-slot="actionable-notice"
      role="note"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-base border-2 border-border p-4',
        tone === 'attention'
          ? 'bg-main text-main-foreground'
          : tone === 'danger'
            ? 'bg-danger text-danger-foreground'
            : 'bg-secondary-background',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        {children ? <div className="mt-1 text-sm">{children}</div> : null}
      </div>
      {action ? (
        <div data-slot="notice-actions" className="ml-auto flex flex-wrap gap-2 print:hidden">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export function StatusNotice({
  label,
  tone = 'neutral',
  children,
  details,
}: {
  label: string
  tone?: StatusTone
  children: ReactNode
  details?: ReactNode
}) {
  return (
    <div
      data-slot="status-notice"
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-base border-2 border-dashed border-border bg-secondary-background px-4 py-3"
    >
      <Badge tone={tone}>{label}</Badge>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      {details ? <div className="basis-full text-sm text-muted">{details}</div> : null}
    </div>
  )
}

export function ConfidentialityNotice({
  children = 'Nur für die angegebene Zielgruppe bestimmt.',
}: {
  children?: ReactNode
}) {
  return (
    <div
      role="note"
      className="rounded-base border-2 border-l-[10px] border-border bg-secondary-background px-4 py-3.5"
    >
      <p>
        <strong>Vertraulich.</strong> {children}
      </p>
    </div>
  )
}
