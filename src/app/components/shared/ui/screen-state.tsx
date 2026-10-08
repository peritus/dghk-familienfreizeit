import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './alert.js'
import { Button } from './button.js'
import { Card, CardContent } from './card.js'
import { SuccessState } from './success-state.js'

export function LoadingState({
  message = 'Ansicht wird vorbereitet …',
  description = 'Einen Moment, gleich geht es weiter.',
}: {
  message?: string
  description?: ReactNode
}) {
  return (
    <section
      data-slot="loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid min-h-72 place-items-center"
    >
      <Card className="w-full max-w-lg bg-secondary-background">
        <CardContent>
          <div className="flex items-start gap-4">
            <LoaderCircle
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0 motion-safe:animate-spin motion-reduce:animate-none"
            />
            <div>
              <p className="text-metric font-heading">{message}</p>
              {description ? <div className="mt-1 text-muted">{description}</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export function ErrorState({
  title = 'Die Ansicht konnte nicht geladen werden',
  children = 'Bitte versuche es erneut.',
  onRetry,
  retry_label: retryLabel = 'Erneut laden',
}: {
  title?: string
  children?: ReactNode
  onRetry?: () => void
  retry_label?: string
}) {
  return (
    <Alert data-slot="error-state" variant="destructive" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div>{children}</div>
        {onRetry ? (
          <Button type="button" variant="neutral" className="mt-4" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({
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
  if (success)
    return (
      <div data-slot="empty-state" className="space-y-3">
        <SuccessState>{children}</SuccessState>
        {action}
      </div>
    )
  return (
    <Card data-slot="empty-state" size="sm" className="bg-secondary-background">
      <CardContent className="space-y-3">
        {title ? <h3 className="text-metric font-heading">{title}</h3> : null}
        <div className="text-muted">{children}</div>
        {action ? <div className="print:hidden">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
