import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'wouter'
import { LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../shared/ui/alert'
import { Button, buttonVariants } from '../shared/ui/button'

export function RouteLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid min-h-72 place-items-center"
    >
      <div className="w-full max-w-lg rounded-base border-2 border-black bg-white p-6 shadow-shadow">
        <div className="flex items-start gap-4">
          <LoaderCircle
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 motion-safe:animate-spin motion-reduce:animate-none"
          />
          <div>
            <p className="text-xl font-heading">Ansicht wird vorbereitet …</p>
            <p className="mt-1 text-muted">Einen Moment, gleich geht es weiter.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function NotFound() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl">Diese Seite gibt es nicht</h1>
      <p>Über die Startseite findest Du zurück.</p>
      <Link href="~/" className={buttonVariants({ variant: 'neutral' })}>
        Zur Startseite
      </Link>
    </section>
  )
}

export class RouteBoundary extends Component<
  { children: ReactNode; reset_key?: string },
  { failed: boolean; reset_key: string | undefined }
> {
  state = { failed: false, reset_key: undefined }

  static getDerivedStateFromProps(
    props: { children: ReactNode; reset_key?: string },
    state: { failed: boolean; reset_key: string | undefined },
  ) {
    if (props.reset_key !== state.reset_key) return { failed: false, reset_key: props.reset_key }
    return null
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // No user data or error details are rendered by this public boundary.
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Alert className="bg-white">
        <AlertTitle>Die Ansicht konnte nicht geladen werden</AlertTitle>
        <AlertDescription>
          <p>Bitte lade die Seite neu. Deine gespeicherten Angaben bleiben erhalten.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Neu laden
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
}
