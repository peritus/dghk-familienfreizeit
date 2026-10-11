import { activeProfile } from '../../config/index.js'
import { draftCount } from './state.js'
import { ApplicationFrame } from '../components/application/application-frame.js'
import { useState, type ReactNode } from 'react'
import { useOrganiser } from './context.js'
import { OrganiserLink, organiserHomePath } from '../components/application/organiser-link.js'
import { PrimaryNavigation } from './components/navigation.js'
import { SaveStatus } from './save-status.js'
import { HeaderMenu } from './header-menu.js'
import { Alert, AlertDescription, AlertTitle } from '../components/shared/ui/alert'
import { organiserPaths, organiserRoutePaths } from '../../organiser/routes.js'
import { loginCopy } from '../auth/wording.js'
import { logout } from '../auth/session.js'
import { Button } from '../components/shared/ui/button'
import type { ProfilePresentation } from '../../config/presentation.js'
import { OccasionBrand } from '../components/application/occasion-brand.js'
import { ProfileBrand } from '../components/application/profile-brand.js'
import {
  profileEventTitle,
  profileOrganiserTitle,
  profileOrganisation,
} from '../lib/profile-presentation.js'

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
      print_brand={
        <div className="flex items-center gap-2">
          <ProfileBrand branding={profile?.branding} className="size-9 object-contain" />
          <span>{profileOrganiserTitle(profile)}</span>
        </div>
      }
      brand={<OccasionBrand profile={profile} link={<OrganiserLink href={organiserHomePath} />} />}
    >
      {children}
    </ApplicationFrame>
  )
}

export function OrganiserFrame({
  children,
  profile,
  print_generated_at: printGeneratedAt,
}: {
  children: ReactNode
  print_generated_at?: Date
  profile?: ProfilePresentation
}) {
  const { state } = useOrganiser()
  const copy = loginCopy(profile?.meta.locale)
  const role = profile?.meta.locale.startsWith('en') ? 'Organising team' : 'Organisationsteam'
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
      print_brand={
        <div className="flex items-center gap-2">
          <ProfileBrand branding={profile?.branding} className="size-9 object-contain" />
          <span>{profileOrganiserTitle(profile)}</span>
        </div>
      }
      print_footer={{
        generated_at: printGeneratedAt,
        revision: state.head_seq,
        drafts: draftCount(state),
        time_zone: activeProfile.meta.timezone,
        context: 'Arbeitsansicht · Organisationsteam',
        confidentiality: 'Vertraulich: Nur für das Organisationsteam.',
      }}
      brand={<OccasionBrand profile={profile} link={<OrganiserLink href={organiserHomePath} />} />}
      role={role}
      brand_subtitle={[profileOrganisation(profile), role].filter(Boolean).join(' · ')}
      primary_navigation={<PrimaryNavigation items={primaryNavItems} />}
      controls={
        <>
          <div className="md:hidden">
            <HeaderMenu
              on_logout={signOut}
              logging_out={loggingOut}
              locale={profile?.meta.locale}
            />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <SaveStatus />
            <Button type="button" variant="neutral" disabled={loggingOut} onClick={signOut}>
              {loggingOut ? copy.signing_out : copy.sign_out}
            </Button>
          </div>
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
