import { Fragment, useId, type ComponentProps, type ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert.js'
import { Badge } from '../ui/badge.js'
import { Button } from '../ui/button.js'
import { Card, CardContent } from '../ui/card.js'
import { StatsStrip, type StatsStripItem } from '../ui/stats-strip.js'
import { SuccessState } from '../ui/success-state.js'
import { cn } from '../../../lib/utils.js'

export type WorkshopStatusTone = 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'

export function WorkshopScreenHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {eyebrow ? <p className="font-bold uppercase tracking-wide text-muted">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-heading sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </header>
  )
}

export function WorkshopSectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-2xl font-heading">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}

export function WorkshopPhaseNotice({
  label,
  tone = 'neutral',
  children,
  details,
}: {
  label: string
  tone?: WorkshopStatusTone
  children: ReactNode
  details?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-base border-2 border-dashed border-border bg-paper px-4 py-3">
      <Badge tone={tone}>{label}</Badge>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      {details ? <div className="basis-full text-sm text-muted">{details}</div> : null}
    </div>
  )
}

export function WorkshopStatusBadge({
  children,
  tone = 'neutral',
  variant,
  className,
}: {
  children: ReactNode
  tone?: WorkshopStatusTone
  variant?: 'default' | 'free' | 'pinned'
  className?: string
}) {
  return (
    <Badge tone={tone} variant={variant} className={className}>
      {children}
    </Badge>
  )
}

export function WorkshopPropertyTags({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-base bg-background px-2 py-0.5 text-sm text-muted">
          {item}
        </span>
      ))}
    </div>
  )
}

export function WorkshopCompactMeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-sm text-muted">
      <strong className="text-foreground">{label}:</strong> {children}
    </p>
  )
}

export function WorkshopList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background [&>*+*]:border-t-2 [&>*+*]:border-border">
      {children}
    </div>
  )
}

export function WorkshopListRow({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="flex flex-wrap items-start gap-2">{action}</div> : null}
    </article>
  )
}

export function WorkshopStatsStrip({ items }: { items: readonly StatsStripItem[] }) {
  return <StatsStrip items={items} />
}

export function WorkshopEmptyState({
  title,
  children,
  action,
  success = false,
}: {
  title?: string
  children: ReactNode
  action?: ReactNode
  success?: boolean
}) {
  if (success) {
    return (
      <div className="space-y-3">
        <SuccessState>{children}</SuccessState>
        {action}
      </div>
    )
  }
  return (
    <Card size="sm" className="bg-secondary-background">
      <CardContent className="space-y-3">
        {title ? <h3 className="text-xl font-heading">{title}</h3> : null}
        <div className="text-muted">{children}</div>
        {action}
      </CardContent>
    </Card>
  )
}

export function WorkshopLoadingState({
  message = 'Workshops werden geladen …',
}: {
  message?: string
}) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-base border-2 border-dashed border-muted bg-secondary-background p-6"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-border border-t-transparent"
      />
      <span>{message}</span>
    </div>
  )
}

export function WorkshopErrorState({
  title = 'Workshops konnten nicht geladen werden.',
  children = 'Bitte erneut versuchen.',
  onRetry,
}: {
  title?: string
  children?: ReactNode
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{children}</p>
        {onRetry ? (
          <Button type="button" variant="neutral" size="sm" onClick={onRetry}>
            Erneut laden
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function WorkshopRowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-end gap-2">{children}</div>
}

export function WorkshopDataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  renderRow,
  className,
}: {
  caption: string
  columns: readonly { key: string; label: ReactNode; numeric?: boolean }[]
  rows: readonly T[]
  rowKey: (row: T) => string
  renderRow: (row: T) => ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-base border-2 border-border bg-secondary-background', className)}>
      <table className="w-full min-w-[38rem] text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn('p-3', column.numeric && 'text-right')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={rowKey(row)}>{renderRow(row)}</Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorkshopResponsiveCollection({
  wide,
  narrow,
}: {
  wide: ReactNode
  narrow: ReactNode
}) {
  return (
    <>
      <div className="max-md:hidden">{wide}</div>
      <div className="md:hidden">{narrow}</div>
    </>
  )
}

export function WorkshopListPicker({
  label,
  value,
  options,
  onChange,
  onPrevious,
  onNext,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  onPrevious?: () => void
  onNext?: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-64 flex-1 gap-1 font-bold">
        {label}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 rounded-base border-2 border-border bg-secondary-background px-3 font-normal"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        {onPrevious ? (
          <Button type="button" size="sm" variant="neutral" onClick={onPrevious}>
            ‹ Vorherige
          </Button>
        ) : null}
        {onNext ? (
          <Button type="button" size="sm" variant="neutral" onClick={onNext}>
            Nächste ›
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function WorkshopPrintDocument({
  kind,
  title,
  metadata,
  status,
  confidential = false,
  children,
}: {
  kind: string
  title: string
  metadata: readonly ReactNode[]
  status: string
  confidential?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <article className="space-y-4" aria-labelledby={titleId}>
      <div className="flex flex-wrap justify-between gap-3 border-b-2 border-border pb-3 text-sm">
        <span>{kind}</span>
        <strong>{status}</strong>
      </div>
      <h2 id={titleId} className="text-3xl font-heading">
        {title}
      </h2>
      <div className="grid gap-1 text-sm text-muted">
        {metadata.map((item, index) => (
          <div key={index}>{item}</div>
        ))}
      </div>
      {confidential ? <WorkshopConfidentialityNotice /> : null}
      {children}
    </article>
  )
}

export function WorkshopConfidentialityNotice({
  children = 'Vertraulich: enthält Gesundheitsangaben oder Telefonnummern. Nur für die Workshopleitung.',
}: {
  children?: ReactNode
}) {
  return (
    <Alert>
      <AlertTitle>Vertraulich</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export type WorkshopFieldProps = ComponentProps<'input'> & { label: string; hint?: ReactNode }

export function WorkshopField({ label, hint, id, ...props }: WorkshopFieldProps) {
  const fieldId = id ?? `workshop-field-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={fieldId} className="grid gap-1 font-bold">
      {label}
      <input
        {...props}
        id={fieldId}
        className={cn(
          'min-h-11 rounded-base border-2 border-border px-3 font-normal',
          props.className,
        )}
      />
      {hint ? <span className="text-sm font-normal text-muted">{hint}</span> : null}
    </label>
  )
}
