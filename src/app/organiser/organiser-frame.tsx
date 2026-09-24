import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { useOrganiser } from './context.js'
import { pendingEventCount } from './state.js'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { organiserPaths } from '../../organiser/routes.js'

export function OrganiserFrame({ children }: { children: ReactNode }) {
  const { state, dispatch, apply } = useOrganiser()
  const count = pendingEventCount(state)
  const collecting = state.commit_mode === 'collecting'

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
              href={organiserPaths.dashboard()}
              className="rounded border-2 border-black bg-white px-3 py-2 font-bold"
            >
              Dashboard
            </Link>
            <Link
              href={organiserPaths.families()}
              className="rounded border-2 border-black bg-white px-3 py-2 font-bold"
            >
              Familien
            </Link>
            <div className="flex items-center gap-1" aria-label="Änderungsmodus">
              <Button
                size="icon"
                variant={collecting ? 'default' : 'neutral'}
                aria-pressed={collecting}
                aria-label={`Änderungen sammeln: ${collecting ? 'an' : 'aus'}`}
                title={
                  count > 0 && collecting
                    ? 'Wende offene Änderungen an oder verwerfe sie, bevor Du den Sammelmodus ausschaltest.'
                    : collecting
                      ? 'Sammelmodus ausschalten'
                      : 'Änderungen sammeln'
                }
                onClick={() => dispatch({ type: 'toggle_collecting' })}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  📐
                </span>
                <span key={count} aria-hidden="true" className="motion-safe:animate-pulse">
                  {count}
                </span>
              </Button>
            </div>
          </nav>
        </div>
        {collecting ? (
          <footer className="mt-4 border-t-2 border-black pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite">
                {count === 0
                  ? 'Keine offenen Änderungen'
                  : `${count} offene Änderung${count === 1 ? '' : 'en'}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="neutral"
                  disabled={count === 0 || state.status === 'applying'}
                  onClick={() => dispatch({ type: 'undo' })}
                >
                  Rückgängig
                </Button>
                <Button
                  variant="neutral"
                  disabled={count === 0 || state.status === 'applying'}
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
        ) : null}
      </header>
      {state.error && state.status !== 'ready' && state.status !== 'applying' ? (
        <Alert role="alert" className="bg-white">
          <AlertTitle>Änderungsstand prüfen</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <main>{children}</main>
    </div>
  )
}
