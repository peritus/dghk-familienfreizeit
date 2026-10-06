import { Fragment, useId, useState, type ComponentProps, type ReactNode, type Ref } from 'react'
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

export type FixedDecisionReviewItem = {
  id: string
  subject: string
  fixed_target: string
  automatic_targets: readonly string[]
  status: 'same' | 'overrides' | 'no-automatic' | 'invalid'
}

export function FixedDecisionReview({
  items,
  title = 'Feste Entscheidungen prüfen',
  description = 'Der Vergleich zeigt, was die automatische Berechnung ohne feste Entscheidungen ergeben hätte.',
}: {
  items: readonly FixedDecisionReviewItem[]
  title?: string
  description?: string
}) {
  if (!items.length) return null
  const status = {
    same: { label: 'gleich', tone: 'success' as const },
    overrides: { label: 'ersetzt automatisch', tone: 'attention' as const },
    'no-automatic': { label: 'keine automatische Zuordnung', tone: 'neutral' as const },
    invalid: { label: 'nicht erfüllbar', tone: 'danger' as const },
  }
  return (
    <section className="space-y-3" aria-labelledby="fixed-decision-review-heading">
      <div>
        <h2 id="fixed-decision-review-heading" className="text-2xl font-heading">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <WorkshopList>
        {items.map((item) => {
          const state = status[item.status]
          return (
            <WorkshopListRow key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{item.subject}</strong>
                <WorkshopStatusBadge tone={state.tone}>{state.label}</WorkshopStatusBadge>
              </div>
              <p className="mt-1 text-sm">
                Fest: <strong>{item.fixed_target}</strong>
                {' · '}
                Automatisch:{' '}
                {item.automatic_targets.length ? (
                  <strong>{item.automatic_targets.join(', ')}</strong>
                ) : (
                  <span className="text-muted">keine Zuordnung</span>
                )}
              </p>
            </WorkshopListRow>
          )
        })}
      </WorkshopList>
    </section>
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
    <div
      className={cn(
        'overflow-x-auto rounded-base border-2 border-border bg-secondary-background',
        className,
      )}
    >
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

export type WorkshopListOption = { value: string; label: string; group?: string }

function optionGroups(options: readonly WorkshopListOption[]) {
  const groups: { label: string | undefined; options: WorkshopListOption[] }[] = []
  for (const option of options) {
    const last = groups.at(-1)
    if (last && last.label === option.group) last.options.push(option)
    else groups.push({ label: option.group, options: [option] })
  }
  return groups
}

function ListSearchInput({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly WorkshopListOption[]
  onChange: (value: string) => void
}) {
  const listId = useId()
  const [text, setText] = useState(options.find((option) => option.value === value)?.label ?? '')
  // Commit only on a complete name, as the prototype's change event does: picking a
  // datalist entry, pressing Enter, or leaving the field.
  const commit = (candidate: string) => {
    const match = options.find((option) => option.label === candidate.trim())
    if (match && match.value !== value) onChange(match.value)
  }
  return (
    <>
      <input
        type="search"
        list={listId}
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const inputType = (event.nativeEvent as InputEvent).inputType
          if (!inputType || inputType === 'insertReplacementText') commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value)
        }}
        onBlur={(event) => commit(event.currentTarget.value)}
        className="h-11 w-full rounded-base border-2 border-border bg-secondary-background px-3 text-base font-normal leading-tight"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.label} />
        ))}
      </datalist>
    </>
  )
}

export function WorkshopListPicker({
  label,
  value,
  options,
  onChange,
  search = false,
  onPrevious,
  onNext,
}: {
  label: string
  value: string
  options: readonly WorkshopListOption[]
  onChange: (value: string) => void
  /** Use a search field with suggestions instead of a select, for long lists of people. */
  search?: boolean
  onPrevious?: () => void
  onNext?: () => void
}) {
  const index = options.findIndex((option) => option.value === value)
  const previous = index > 0 ? options[index - 1] : undefined
  const next = index >= 0 ? options[index + 1] : undefined
  return (
    <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3">
      <label className="grid w-full max-w-[480px] flex-[1_1_320px] gap-1.5 text-sm leading-tight font-bold">
        {label}
        {search ? (
          <ListSearchInput key={value} value={value} options={options} onChange={onChange} />
        ) : (
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="select-chevron h-11 w-full rounded-base border-2 border-border bg-secondary-background pl-3 text-base font-normal leading-tight"
          >
            {optionGroups(options).map((group, groupIndex) => {
              const items = group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
              return group.label ? (
                <optgroup key={`${group.label}-${groupIndex}`} label={group.label}>
                  {items}
                </optgroup>
              ) : (
                items
              )
            })}
          </select>
        )}
      </label>
      {onPrevious && previous ? (
        <Button type="button" size="sm" variant="neutral" onClick={onPrevious}>
          ‹ Vorherige<span className="sr-only">: {previous.label}</span>
        </Button>
      ) : null}
      {onNext && next ? (
        <Button type="button" size="sm" variant="neutral" onClick={onNext}>
          Nächste ›<span className="sr-only">: {next.label}</span>
        </Button>
      ) : null}
    </div>
  )
}

export function WorkshopPrintDocument({
  title,
  metadata,
  print_note: printNote,
  heading_ref: headingRef,
  children,
}: {
  title: string
  metadata: readonly ReactNode[]
  /** Shown only on paper, under the metadata (for example a confidentiality line). */
  print_note?: ReactNode
  /** Receives focus after previous/next so keyboard users land on the new document. */
  heading_ref?: Ref<HTMLHeadingElement>
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <article className="workshop-print-document" aria-labelledby={titleId}>
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="workshop-print-title text-2xl leading-tight font-heading focus:outline-3 focus:outline-offset-4 focus:outline-border"
      >
        {title}
      </h2>
      {metadata.map((item, index) => (
        <p
          key={index}
          className={cn(
            'workshop-print-meta mt-1',
            index === metadata.length - 1 && 'workshop-print-meta--last',
          )}
        >
          {item}
        </p>
      ))}
      {printNote ? <p className="workshop-print-note hidden">{printNote}</p> : null}
      <div className="mt-3">{children}</div>
    </article>
  )
}

export function WorkshopConfidentialityNotice({
  children = 'Enthält Allergien und Gesundheitshinweise. Nur für die Workshopleitung.',
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
