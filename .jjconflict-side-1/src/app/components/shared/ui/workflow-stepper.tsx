import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WorkflowStep = {
  id: string
  label: string
  description?: string
  state: 'complete' | 'current' | 'upcoming'
}

function readPreference(key: string): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

/** Presentation only: module tracks own the workflow and actions own event commands. */
export function WorkflowStepper({
  aria_label: ariaLabel,
  steps,
  next_action: nextAction,
  panel,
  storage_key: storageKey,
  storage_user: storageUser,
  expanded: controlledExpanded,
  on_expanded_change: onExpandedChange,
  className,
}: {
  aria_label: string
  steps: readonly WorkflowStep[]
  next_action?: ReactNode
  panel?: { heading?: ReactNode; text?: ReactNode; note?: ReactNode }
  expanded?: boolean
  on_expanded_change?: (expanded: boolean) => void
  storage_key?: string
  storage_user?: string | null
  className?: string
}) {
  const detailsId = useId()
  const key = `${storageUser ?? 'anonymous'}:${storageKey ?? `workflow.${ariaLabel}.expanded`}`
  const stored = useMemo(() => readPreference(key), [key])
  const [preference, setPreference] = useState({ key, expanded: stored })
  const expanded = controlledExpanded ?? (preference.key === key ? preference.expanded : stored)
  const found = steps.findIndex((step) => step.state === 'current')
  const terminal = steps.length > 0 && steps.every((step) => step.state === 'complete')
  const currentIndex = found >= 0 ? found : Math.max(0, steps.length - 1)
  const current = steps[currentIndex]
  function toggle() {
    const next = !expanded
    setPreference({ key, expanded: next })
    onExpandedChange?.(next)
    try {
      if (controlledExpanded === undefined) window.localStorage.setItem(key, String(next))
    } catch {
      /* Disclosure remains usable without storage. */
    }
  }
  const toggleButton = (
    <button
      type="button"
      className={cn(
        'workflow-toggle inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-base px-2 text-sm print:hidden',
        !expanded && 'hover:bg-main-soft group-hover:bg-main-soft',
      )}
      aria-expanded={expanded}
      aria-controls={detailsId}
      onClick={(event) => {
        event.stopPropagation()
        toggle()
      }}
    >
      <span className="sr-only sm:not-sr-only">{expanded ? 'Weniger' : 'Alle Schritte'}</span>
      <ChevronDown aria-hidden="true" className={cn('size-4', expanded && 'rotate-180')} />
    </button>
  )
  function circle(step: WorkflowStep, index: number) {
    const active = index === currentIndex
    return (
      <span
        aria-hidden="true"
        className={cn(
          'workflow-circle inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-bold',
          active
            ? 'bg-foreground text-background'
            : step.state === 'upcoming'
              ? 'border-dashed bg-secondary-background text-muted'
              : 'bg-secondary-background',
        )}
      >
        {step.state === 'complete' ? <Check className="size-4" /> : index + 1}
      </span>
    )
  }
  return (
    <section data-slot="workflow-stepper" aria-label={ariaLabel} className={className}>
      <div className="workflow-card rounded-base border-2 border-border bg-secondary-background">
        <div
          hidden={expanded}
          onClick={expanded ? undefined : toggle}
          className={cn(
            'workflow-compact group flex min-w-0 cursor-pointer items-center select-none hover:bg-paper gap-2 px-4 py-2.5 print:hidden',
            expanded && 'hidden',
          )}
        >
          <ol className="flex min-w-0 flex-1 items-center">
            {steps.map((step, index) => (
              <li
                key={step.id}
                aria-current={index === currentIndex ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-center',
                  index === currentIndex ? 'shrink' : 'shrink-0',
                )}
              >
                {index ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'workflow-compact-line mx-1 w-3 shrink-0 border-t-2 sm:mx-2 sm:w-7',
                      index <= currentIndex ? 'border-border' : 'border-dashed border-muted',
                    )}
                  />
                ) : null}
                {circle(step, index)}
                {index === currentIndex ? (
                  <span className="ml-2 min-w-0 sm:flex sm:items-baseline sm:gap-1">
                    <span className="block truncate text-sm font-bold">{step.label}</span>
                    {step.description ? (
                      <span className="block truncate text-xs font-normal text-muted sm:text-sm">
                        <span className="hidden sm:inline">· </span>
                        {step.description}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="sr-only">
                    Schritt {index + 1}: {step.label},{' '}
                    {step.state === 'complete' ? 'erledigt' : 'offen'}
                  </span>
                )}
              </li>
            ))}
          </ol>
          {toggleButton}
        </div>
        <div
          id={detailsId}
          hidden={!expanded}
          className={cn('workflow-details', !expanded && 'hidden print:block')}
        >
          <div className="flex items-start gap-2 border-b-[1.5px] border-rule px-4 py-4">
            <ol
              className="workflow-full min-w-0 flex-1"
              style={{ ['--workflow-columns']: Math.max(1, steps.length) } as CSSProperties}
            >
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  aria-current={index === currentIndex ? 'step' : undefined}
                  className="workflow-full-step min-w-0"
                >
                  <div className="workflow-marker">
                    {circle(step, index)}
                    {index < steps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'workflow-connector',
                          index + 1 <= currentIndex
                            ? 'border-border'
                            : 'border-dashed border-muted',
                        )}
                      />
                    ) : null}
                  </div>
                  <div className="workflow-label">
                    <span
                      className={cn(
                        'block text-sm font-medium',
                        index === currentIndex && 'font-bold',
                        step.state === 'upcoming' && 'text-muted',
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="sr-only">
                      {step.state === 'complete'
                        ? 'erledigt'
                        : step.state === 'current'
                          ? 'aktuell'
                          : 'offen'}
                    </span>
                    {step.description ? (
                      <span className="mt-1 block text-xs font-normal text-muted">
                        {step.description}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            {toggleButton}
          </div>
          <div className="workflow-panel flex flex-wrap items-start gap-x-6 gap-y-3 px-4 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-title font-heading">
                {panel?.heading ??
                  (terminal
                    ? current?.label
                    : `Nächster Schritt: ${current?.label ?? 'Vorbereiten'}`)}
              </h2>
              {(panel?.text ?? current?.description) ? (
                <div className="mt-1 text-sm font-normal">
                  {panel?.text ?? current?.description}
                </div>
              ) : null}
              {panel?.note ? (
                <div className="mt-1 text-sm font-normal text-muted">{panel.note}</div>
              ) : null}
            </div>
            {!terminal && nextAction ? (
              <div data-slot="workflow-actions" className="workflow-actions">
                {nextAction}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {terminal && nextAction ? <div className="mt-4 print:hidden">{nextAction}</div> : null}
    </section>
  )
}
