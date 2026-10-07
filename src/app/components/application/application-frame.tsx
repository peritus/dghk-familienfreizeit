import type { ReactNode } from 'react'

/** One landmark pair and width contract for public, authenticated and recovery screens. */
export function ApplicationFrame({
  brand,
  role,
  primary_navigation: primaryNavigation,
  controls,
  notices,
  children,
}: {
  brand: ReactNode
  role?: string
  primary_navigation?: ReactNode
  controls?: ReactNode
  notices?: ReactNode
  children: ReactNode
}) {
  return (
    <div data-slot="application-frame" className="flex min-h-dvh flex-col">
      <a
        href="#content"
        data-slot="skip-link"
        className="sr-only z-10 bg-secondary-background p-4 focus:not-sr-only focus:absolute"
      >
        Zum Inhalt
      </a>
      <header
        data-slot="application-bar"
        className="border-b-2 border-border bg-secondary-background px-4 py-3 print:hidden sm:px-8"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            {brand}
            {role ? <p className="text-sm text-muted">{role}</p> : null}
          </div>
          {primaryNavigation ? (
            <div className="order-last w-full sm:order-none sm:w-auto">{primaryNavigation}</div>
          ) : null}
          {controls ? <div className="ml-auto flex items-center gap-3">{controls}</div> : null}
        </div>
      </header>
      <main
        id="content"
        tabIndex={-1}
        className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-10 sm:px-8"
      >
        {notices ? (
          <div data-slot="application-notices" className="mb-6 space-y-3 empty:hidden">
            {notices}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  )
}
