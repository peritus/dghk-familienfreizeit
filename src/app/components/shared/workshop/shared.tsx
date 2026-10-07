import { Tag } from '../ui/tag.js'
import {
  CollectionList as WorkshopList,
  CollectionRow as WorkshopListRow,
} from '../ui/collection-list.js'
export {
  ScreenHeader as WorkshopScreenHeader,
  SectionHeader as WorkshopSectionHeader,
} from '../ui/screen-layout.js'

export { StatusNotice as WorkshopPhaseNotice } from '../ui/notice.js'

export { Badge as WorkshopStatusBadge } from '../ui/badge.js'

export { StatsStrip as WorkshopStatsStrip } from '../ui/stats-strip.js'

export {
  EmptyState as WorkshopEmptyState,
  LoadingState as WorkshopLoadingState,
  ErrorState as WorkshopErrorState,
} from '../ui/screen-state.js'

export { TextField as WorkshopField } from '../ui/field.js'

export {
  CollectionList as WorkshopList,
  CollectionRow as WorkshopListRow,
} from '../ui/collection-list.js'

export {
  DataTable as WorkshopDataTable,
  ResponsiveCollection as WorkshopResponsiveCollection,
} from '../ui/data-table.js'
import { useId, useState, type ReactNode, type Ref } from 'react'
import { Badge } from '../ui/badge.js'
import { Button } from '../ui/button.js'
import { cn } from '../../../lib/utils.js'

export type { StatusTone as WorkshopStatusTone } from '../ui/status-tone.js'

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
                <Badge tone={state.tone}>{state.label}</Badge>
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
        <Tag key={item}>{item}</Tag>
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

export function WorkshopRowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-end gap-2">{children}</div>
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

export type { ComponentProps } from 'react'

export type WorkshopFieldProps = import('../ui/field.js').TextFieldProps
