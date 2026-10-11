import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { ScreenLayout, ScreenHeader } from '../components/shared/ui/screen-layout.js'
import { RouteLoading } from '../components/application/route-states.js'
export function AppSelection() {
  const [, navigate] = useLocation()
  const [roles, setRoles] = useState<string[] | null>(null),
    [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/me', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          void navigate('/login', { replace: true })
          return
        }
        if (!response.ok) throw new Error('identity unavailable')
        const body = (await response.json()) as { principal: { roles: string[] } }
        setRoles(body.principal.roles)
        if (body.principal.roles.length === 1)
          void navigate(body.principal.roles[0] === 'family' ? '/family' : '/organiser', {
            replace: true,
          })
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [navigate])
  if (failed)
    return (
      <ScreenLayout header={<ScreenHeader title="Zugang konnte nicht geladen werden" />}>
        <p role="alert">Bitte versuche es erneut.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Neu laden
        </button>
      </ScreenLayout>
    )
  if (!roles) return <RouteLoading />
  return (
    <ScreenLayout
      header={
        <ScreenHeader
          title="App auswählen"
          description="Mit deinem Zugang kannst du diese Apps verwenden."
        />
      }
    >
      <nav aria-label="Apps" className="grid gap-4 sm:grid-cols-2">
        {roles.includes('family') ? (
          <Link
            href="/family"
            className="grid min-h-20 content-center rounded-base border-2 border-border bg-secondary-background p-5 font-bold shadow-shadow"
          >
            Familienansicht
          </Link>
        ) : null}
        {roles.includes('organiser') ? (
          <Link
            href="/organiser"
            className="grid min-h-20 content-center rounded-base border-2 border-border bg-secondary-background p-5 font-bold shadow-shadow"
          >
            Organisationsteam
          </Link>
        ) : null}
      </nav>
    </ScreenLayout>
  )
}
