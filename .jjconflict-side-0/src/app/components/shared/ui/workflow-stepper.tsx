import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type WorkflowStep = {
  id: string
  label: string
  description?: string
  state: 'complete' | 'current' | 'upcoming'
}

/**
 * Shows progress through a short, ordered workflow. It reports state; it
 * does not navigate or change the workflow.
 */
export function WorkflowStepper({
  aria_label: ariaLabel,
  steps,
  next_action: nextAction,
  className,
}: {
  aria_label: string
  steps: readonly WorkflowStep[]
  next_action?: ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const currentIndex = steps.findIndex((step) => step.state === 'current')
  const visibleStep = currentIndex >= 0 ? currentIndex + 1 : steps.length

  return (
    <section
      data-slot="workflow-stepper"
      aria-label={ariaLabel}
      className={cn('space-y-4', className)}
    >
      <ol
        id={listId}
        className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] sm:gap-0"
      >
        {steps.map((step, index) => {
          const current = step.state === 'current'
          const complete = step.state === 'complete'
          return (
            <li
              key={step.id}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'relative min-w-0 pl-12 sm:pr-4 sm:pl-0',
                !expanded && !current && 'max-sm:hidden',
              )}
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-8 bottom-[-1rem] left-4 border-l-2 border-dashed border-muted sm:top-4 sm:right-0 sm:bottom-auto sm:left-8 sm:border-t-2 sm:border-l-0',
                    complete && 'border-solid border-border sm:border-t-[3px] sm:-translate-y-px',
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-0 left-0 z-10 inline-flex size-8 items-center justify-center rounded-full border-2 border-border bg-background font-bold sm:static',
                  complete && 'bg-secondary-background',
                  current &&
                    'size-9 -translate-x-0.5 -translate-y-0.5 bg-foreground text-background sm:-mt-0.5 sm:ml-[-0.125rem] sm:translate-x-0',
                )}
              >
                {complete ? '✓' : index + 1}
              </span>
              <span
                className={cn(
                  'block pt-1 font-bold sm:mt-2 sm:pt-0',
                  step.state === 'upcoming' && 'text-muted',
                )}
              >
                {step.label}
              </span>
              {step.description ? (
                <span className={cn('mt-1 block text-sm text-muted', current && 'text-foreground')}>
                  {step.description}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        className="print:hidden text-sm underline underline-offset-4 sm:hidden"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Weniger' : `Alle Schritte (${visibleStep} von ${steps.length})`}
      </button>
      {nextAction ? (
        <div className="print:hidden flex flex-wrap items-center gap-3 border-t-2 border-border pt-3">
          {nextAction}
        </div>
      ) : null}
    </section>
  )
}
