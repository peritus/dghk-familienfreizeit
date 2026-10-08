import { createContext, useState, type ReactNode } from 'react'
import { PrintFooter, type PrintFooterProps } from '../shared/ui/print-layout.js'

/** Screen compositions supply navigation; the frame owns its full-width placement. */
export const FrameNavigationTarget = createContext<HTMLElement | null>(null)

export function ApplicationFrame({
  brand,
  brand_subtitle: brandSubtitle,
  print_title: printTitle,
  print_brand: printBrand,
  print_footer: printFooter,
  role,
  primary_navigation: primaryNavigation,
  controls,
  notices,
  children,
}: {
  brand: ReactNode
  brand_subtitle?: ReactNode
  print_brand?: ReactNode
  print_title?: string
  print_footer?: PrintFooterProps
  role?: string
  primary_navigation?: ReactNode
  controls?: ReactNode
  notices?: ReactNode
  children: ReactNode
}) {
  const [navigationTarget, setNavigationTarget] = useState<HTMLDivElement | null>(null)
  return (
    <FrameNavigationTarget.Provider value={navigationTarget}>
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
          className="border-b-2 border-border bg-secondary-background px-4 pt-2.5 sm:pt-3 print:hidden"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between gap-2.5 pb-2.5 sm:gap-3 sm:pb-3 md:flex-wrap md:gap-x-6">
              <div className="min-w-0 flex-1 md:flex-none">
                {brand}
                {brandSubtitle || role ? (
                  <div className="mt-0.5 truncate text-subtitle font-normal text-muted">
                    {brandSubtitle ?? role}
                  </div>
                ) : null}
              </div>
              {controls ? (
                <div className="flex shrink-0 items-center gap-2 md:flex-wrap md:gap-3">
                  {controls}
                </div>
              ) : null}
            </div>
            {primaryNavigation}
          </div>
        </header>
        <div
          ref={setNavigationTarget}
          data-slot="application-section-band"
          className="border-b-2 border-border bg-main-soft print:hidden empty:hidden"
        />
        <div data-slot="print-identity" className="hidden print:block">
          {printBrand ?? printTitle ?? brand}
          {role ? <span> · {role}</span> : null}
        </div>
        <main
          id="content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pt-6 pb-10 sm:pt-8 sm:pb-12"
        >
          {notices ? (
            <div data-slot="application-notices" className="mb-6 space-y-3 empty:hidden">
              {notices}
            </div>
          ) : null}
          {children}
        </main>
        <div data-slot="application-print-footer">
          <PrintFooter {...printFooter} />
        </div>
      </div>
    </FrameNavigationTarget.Provider>
  )
}
