import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { useOrganiser } from './context.js'
import { pendingEventCount } from './state.js'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'

export function OrganiserFrame({ children }: { children: ReactNode }) {
  const { state, dispatch, apply } = useOrganiser()
  const count = pendingEventCount(state)

  return (
    <div className="space-y-6">
      <header className="border-b-2 border-black pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Familienfreizeit</p>
            <h1 className="text-2xl">Organisationsteam</h1>
          </div>
          <nav aria-label="Organisationsteam" className="flex flex-wrap gap-2">
            <Link
              href="/organiser"
              className="rounded border-2 border-black bg-white px-3 py-2 font-bold"
            >
              Dashboard
            </Link>
            <Link
              href="/organiser/families"
              className="rounded border-2 border-black bg-white px-3 py-2 font-bold"
            >
              Familien
            </Link>
          </nav>
        </div>
      </header>
      {state.error && state.status !== 'ready' && state.status !== 'applying' ? (
        <Alert role="alert" className="bg-white">
          <AlertTitle>Änderungsstand prüfen</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <main>{children}</main>
      <footer className="sticky bottom-0 border-2 border-black bg-[#fffaf0] p-3 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite">
            {count === 0
              ? 'Keine offenen Änderungen'
              : `${count} offene Änderung${count === 1 ? '' : 'en'}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="neutral"
              disabled={count === 0}
              onClick={() => dispatch({ type: 'undo' })}
            >
              Rückgängig
            </Button>
            <Button
              variant="neutral"
              disabled={count === 0}
              onClick={() => dispatch({ type: 'discard' })}
            >
              Verwerfen
            </Button>
            <Button
              disabled={count === 0 || state.status === 'applying'}
              onClick={() => void apply()}
            >
              {state.status === 'applying' ? 'Wird angewendet …' : 'Anwenden'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
