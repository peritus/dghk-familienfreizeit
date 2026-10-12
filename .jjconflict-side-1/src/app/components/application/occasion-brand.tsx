import { cloneElement, type ReactElement, type ReactNode } from 'react'
import type { ProfilePresentation } from '../../../config/presentation.js'
import { profileOrganiserTitle } from '../../lib/profile-presentation.js'
import { ProfileBrand } from './profile-brand.js'

/** Both role adapters supply their navigation link to the same occasion branding. */
export function OccasionBrand({
  profile,
  link,
}: {
  profile?: ProfilePresentation
  link: ReactElement<{ className?: string; children?: ReactNode }>
}) {
  return cloneElement(link, {
    className: 'flex min-h-11 min-w-0 items-center gap-2 text-title md:inline-flex font-heading',
    children: (
      <>
        <span className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-base border-2 border-border bg-main-soft shadow-sm">
          <ProfileBrand branding={profile?.branding} className="size-6 object-contain sm:size-7" />
        </span>
        <span className="truncate">{profileOrganiserTitle(profile)}</span>
      </>
    ),
  })
}

export function familyIdentityLabel(name: string | undefined, locale = 'de'): string {
  const value = name?.trim()
  const german = locale.split('-')[0] === 'de'
  if (!value) return german ? 'Familie' : 'Family'
  if (german) return /^familie(?:\s|$)/i.test(value) ? value : `Familie ${value}`
  return /^family(?:\s|$)|(?:^|\s)family$/i.test(value) ? value : `${value} family`
}
