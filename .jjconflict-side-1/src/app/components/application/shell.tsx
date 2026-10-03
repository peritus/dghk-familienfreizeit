import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import type { ProfilePresentation } from '../../../config/presentation.js'
import { ProfileBrand } from './profile-brand.js'
import { profileEventTitle } from '../../lib/profile-presentation.js'

/**
 * The organiser section owns a single app bar and `<main id="content">`
 * pair of its own (brand, role, nav, and the save-status control -- see
 * OrganiserFrame), so this shell only supplies the skip link there and
 * lets `children` (ultimately OrganiserFrame) render that landmark pair
 * itself. Nesting this shell's own header/main around it would recreate
 * the nested-`<main>`/double-`<header>` bug the app-bar merge fixes.
 */
export function Shell({
  children,
  profile,
}: {
  children: ReactNode
  profile?: ProfilePresentation
}) {
  const [location] = useLocation()
  const organiserSection = location === '/organiser' || location.startsWith('/organiser/')

  return (
    <div className="min-h-dvh">
      <a
        href="#content"
        className="sr-only z-10 bg-secondary-background p-4 focus:not-sr-only focus:absolute"
      >
        Zum Inhalt
      </a>
      {organiserSection ? (
        children
      ) : (
        <>
          <header className="border-b-2 border-border bg-secondary-background px-4 py-4 sm:px-8">
            <div className="mx-auto max-w-5xl">
              <Link
                href="~/"
                className="inline-flex min-h-11 items-center gap-2 text-xl font-heading"
              >
                <ProfileBrand
                  branding={profile?.branding}
                  className="size-8 shrink-0 object-contain"
                />
                {profileEventTitle(profile)}
              </Link>
            </div>
          </header>
          <main id="content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
            {children}
          </main>
        </>
      )}
    </div>
  )
}
