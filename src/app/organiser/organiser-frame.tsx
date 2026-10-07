import { activeProfile } from '../../config/index.js'
import { draftCount } from './state.js'
import { ApplicationFrame } from '../components/application/application-frame.js'
import { useState, type ReactNode } from 'react'
import { useOrganiser } from './context.js'
import { OrganiserLink, organiserHomePath } from '../components/application/organiser-link.js'
import { PrimaryNavigation } from './components/navigation.js'
import { SaveStatus } from './save-status.js'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { organiserPaths, organiserRoutePaths } from '../../organiser/routes.js'
import { logout } from '../auth/session.js'
import { Button } from '../components/shared/ui/button'
import type { ProfilePresentation } from '../../config/presentation.js'
import { ProfileBrand } from '../components/application/profile-brand.js'
import { profileEventTitle } from '../lib/profile-presentation.js'

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

export function OrganiserMinimalFrame({
  children,
  profile,
}: {
  children: ReactNode
  profile?: ProfilePresentation
}) {
  return (
    <ApplicationFrame
      print_title={profileEventTitle(profile)}
      brand={
        <OrganiserLink
          href={organiserHomePath}
          className="inline-flex min-h-11 items-center gap-2 text-xl font-heading"
        >
          <ProfileBrand branding={profile?.branding} className="size-8 shrink-0 object-contain" />
          {profileEventTitle(profile)}
        </OrganiserLink>
      }
    >
      {children}
    </ApplicationFrame>
  )
}

export function OrganiserFrame({
  children,
  profile,
}: {
  children: ReactNode
  profile?: ProfilePresentation
}) {
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
    <ApplicationFrame
      print_title={profileEventTitle(profile)}
      print_footer={{
        revision: state.head_seq,
        drafts: draftCount(state),
        time_zone: activeProfile.meta.timezone,
        context: 'Arbeitsansicht · Organisationsteam',
        confidentiality: 'Vertraulich: Nur für das Organisationsteam.',
      }}
      brand={
        <OrganiserLink
          href={organiserHomePath}
          className="inline-flex min-h-11 items-center gap-2 text-xl font-heading"
        >
          <ProfileBrand branding={profile?.branding} className="size-8 shrink-0 object-contain" />
          {profileEventTitle(profile)}
        </OrganiserLink>
      }
      role="Organisationsteam"
      primary_navigation={<PrimaryNavigation items={primaryNavItems} />}
      controls={
        <>
          <SaveStatus />
          <Button type="button" variant="neutral" disabled={loggingOut} onClick={signOut}>
            {loggingOut ? 'Abmeldung …' : 'Abmelden'}
          </Button>
        </>
      }
      notices={
        <>
          {logoutError ? (
            <p role="alert" className="text-sm text-danger-foreground">
              Die Abmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.
            </p>
          ) : null}
          {state.error && state.status !== 'ready' && state.status !== 'applying' ? (
            <Alert role="alert" className="bg-secondary-background">
              <AlertTitle>Änderungen prüfen</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
        </>
      }
    >
      {children}
    </ApplicationFrame>
  )
}
