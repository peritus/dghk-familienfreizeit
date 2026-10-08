import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import type { ProfilePresentation } from '../../../config/presentation.js'
import { ProfileBrand } from './profile-brand.js'
import { profileEventTitle } from '../../lib/profile-presentation.js'
import { ApplicationFrame } from './application-frame.js'

export function Shell({
  children,
  profile,
  force_frame: forceFrame = false,
}: {
  children: ReactNode
  profile?: ProfilePresentation
  force_frame?: boolean
}) {
  const [location] = useLocation()
  const organiserSection = location === '/organiser' || location.startsWith('/organiser/')
  if (organiserSection && !forceFrame) return <>{children}</>
  return (
    <ApplicationFrame
      print_title={profileEventTitle(profile)}
      brand={
        <Link
          href="~/"
          className="flex min-h-11 min-w-0 items-center gap-2 text-title md:inline-flex font-heading"
        >
          <ProfileBrand branding={profile?.branding} className="size-8 shrink-0 object-contain" />
          <span className="truncate">{profileEventTitle(profile)}</span>
        </Link>
      }
    >
      {children}
    </ApplicationFrame>
  )
}
