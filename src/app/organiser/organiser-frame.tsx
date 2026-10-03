import { useState, type ReactNode } from 'react'
import { useOrganiser } from './context.js'
import { OrganiserLink, organiserHomePath } from '../components/application/organiser-link.js'
import { PrimaryNavigation } from './components/navigation.js'
import { SaveStatus } from './save-status.js'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { organiserPaths, organiserRoutePaths } from '../../organiser/routes.js'
import { logout } from '../auth/session.js'
import { Button } from '../components/shared/ui/button'

const primaryNavItems = [
  {
    href: organiserPaths.dashboard(),
    match: organiserRoutePaths.dashboard,
    label: 'Dashboard',
    include_descendants: false,
  },
  {
    href: organiserPaths.families(),
    match: organiserRoutePaths.families,
    label: 'Familien',
    include_descendants: true,
  },
  {
    href: organiserPaths.accommodation(),
    match: organiserRoutePaths.accommodation,
    label: 'Unterbringung',
    include_descendants: true,
  },
  {
    href: organiserPaths.workshops(),
    match: organiserRoutePaths.workshops,
    label: 'Workshops',
    include_descendants: true,
  },
] as const

/**
 * A brand-only header/main pair for the loading, unauthorized, stale-build,
 * and invalid-derivation states in OrganiserApp -- those run before
 * OrganiserContext exists, so the full OrganiserFrame (nav, save-status)
 * isn't available yet. Keeping one header/main landmark pair here too,
 * rather than leaving these states unwrapped, is what avoids reintroducing
 * the missing-`<main>` regression the single-app-bar merge is meant to fix.
 */
export function OrganiserMinimalFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3 print:hidden sm:px-8">
        <div className="mx-auto max-w-5xl">
          <OrganiserLink
            href={organiserHomePath}
            className="inline-flex min-h-11 items-center text-xl font-heading"
          >
            Familienfreizeit
          </OrganiserLink>
        </div>
      </header>
      <main id="content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        {children}
      </main>
    </div>
  )
}

export function OrganiserFrame({ children }: { children: ReactNode }) {
  const { state } = useOrganiser()
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState(false)

  async function signOut() {
    setLoggingOut(true)
    setLogoutError(false)
    try {
      await logout()
      window.location.assign('/')
    } catch {
      setLogoutError(true)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3 print:hidden sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <OrganiserLink
              href={organiserHomePath}
              className="inline-flex min-h-11 items-center text-xl font-heading"
            >
              Familienfreizeit
            </OrganiserLink>
            <p className="text-sm text-muted">Organisationsteam</p>
          </div>
          <div className="order-last w-full sm:order-none sm:w-auto">
            <PrimaryNavigation items={primaryNavItems} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <SaveStatus />
            <Button type="button" variant="neutral" disabled={loggingOut} onClick={signOut}>
              {loggingOut ? 'Abmeldung …' : 'Abmelden'}
            </Button>
          </div>
        </div>
      </header>
      {logoutError ? (
        <p role="alert" className="mx-auto mt-4 max-w-5xl px-4 text-sm text-destructive sm:px-8">
          Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.
        </p>
      ) : null}
      {state.error && state.status !== 'ready' && state.status !== 'applying' ? (
        <Alert role="alert" className="mx-auto mt-6 max-w-5xl bg-secondary-background print:hidden">
          <AlertTitle>Änderungen prüfen</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <main id="content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        {children}
      </main>
    </div>
  )
}
