import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'wouter'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button, buttonVariants } from './ui/button'
import { Skeleton } from './ui/skeleton'

export function RouteLoading() {
  return (
    <section role="status" aria-live="polite" aria-busy="true" className="space-y-4">
      <p>Die Ansicht wird geladen …</p>
      <Skeleton aria-hidden="true" className="h-10 w-2/3" />
      <Skeleton aria-hidden="true" className="h-40 w-full" />
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

export class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

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
