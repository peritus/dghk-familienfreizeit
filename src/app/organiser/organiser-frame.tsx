import type { ReactNode } from 'react'
import { Cloud, CloudUpload, Pause } from 'lucide-react'
import { Link } from 'wouter'
import { useOrganiser } from './context.js'
import { draftCount } from './state.js'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { organiserPaths } from '../../organiser/routes.js'

function DraftingIcon() {
  return (
    <span className="relative inline-flex size-5 items-center justify-center" aria-hidden="true">
      <Cloud className="absolute size-5" />
      <Pause className="absolute size-2.5 fill-current stroke-[3]" />
    </span>
  )
}

export function OrganiserFrame({ children }: { children: ReactNode }) {
  const { state, dispatch, apply } = useOrganiser()
  const count = draftCount(state)
  const drafting = state.change_mode === 'drafting'

  return (
    <div className="space-y-6">
      <header
        className={`border-x-2 border-t-2 border-black px-3 pt-3 ${
          drafting ? 'border-b-0 pb-0' : 'border-b-2 pb-4'
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
            {!drafting ? (
              <Button
                size="icon"
                variant="neutral"
                className="hover:translate-x-0 hover:translate-y-0 hover:shadow-shadow"
                aria-label="Entwurfsmodus starten"
                title="Entwurfsmodus starten"
                onClick={() => dispatch({ type: 'toggle_drafting' })}
              >
                <CloudUpload />
              </Button>
            ) : null}
          </nav>
        </div>
        {drafting ? (
          <section
            aria-labelledby="draft-changes-title"
            className="-mx-3 mt-3 border-2 border-black bg-[#fffaf0] p-3 shadow-[4px_4px_0_0_#000]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <DraftingIcon />
                <div>
                  <h2 id="draft-changes-title" className="text-xl">
                    Änderungsentwürfe in diesem Browser
                  </h2>
                  <p>Diese Entwürfe bleiben hier, bis Du sie anwendest.</p>
                </div>
              </div>
              <p aria-live="polite" className="flex items-center gap-2">
                <span key={count} aria-hidden="true" className="motion-safe:animate-pulse">
                  {count}
                </span>
                <span>
                  {count === 0
                    ? 'Keine Änderungsentwürfe'
                    : `${count} Änderungsentwurf${count === 1 ? '' : 'e'}`}
                </span>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                variant="neutral"
                disabled={state.status === 'applying'}
                onClick={() => dispatch({ type: 'discard' })}
              >
                Entwürfe verwerfen
              </Button>
              <Button
                disabled={count === 0 || state.status === 'applying'}
                onClick={() => void apply()}
              >
                {state.status === 'applying' ? 'Entwürfe werden angewendet …' : 'Entwürfe anwenden'}
              </Button>
            </div>
          </section>
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
