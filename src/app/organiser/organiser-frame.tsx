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
      <header
        className={`border-x-2 border-t-2 border-black px-3 pt-3 ${
          collecting ? 'border-b-0 pb-0' : 'border-b-2 pb-4'
        }`}
      >
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
                variant={collecting ? 'noShadow' : 'neutral'}
                className={`hover:translate-x-0 hover:translate-y-0 ${
                  collecting ? 'rounded-b-none border-b-0 hover:shadow-none' : 'hover:shadow-shadow'
                }`}
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m4 16 12-12a2.1 2.1 0 0 1 3 3L7 19l-4 1z" />
                  <path d="m13 7 4 4M10 10l4 4M7 13l4 4" />
                </svg>
                <span key={count} aria-hidden="true" className="motion-safe:animate-pulse">
                  {count}
                </span>
              </Button>
            </div>
          </nav>
        </div>
      </header>
      {collecting ? (
        <section
          aria-labelledby="local-changes-title"
          className="-mt-6 border-2 border-black bg-[#fffaf0] p-3 shadow-[4px_4px_0_0_#000]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="local-changes-title" className="text-xl">
                Local changes in this browser
              </h2>
              <p>Actively collected here until you apply them.</p>
            </div>
            <p aria-live="polite">
              {count === 0
                ? 'Keine offenen Änderungen'
                : `${count} offene Änderung${count === 1 ? '' : 'en'}`}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              variant="neutral"
              disabled={count === 0 || state.status === 'applying'}
              onClick={() => dispatch({ type: 'discard' })}
            >
              Alle Änderungen verwerfen
            </Button>
            <Button
              disabled={count === 0 || state.status === 'applying'}
              onClick={() => void apply()}
            >
              {state.status === 'applying' ? 'Wird angewendet …' : 'Anwenden'}
            </Button>
          </div>
        </section>
      ) : null}
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
