import type { ReactNode } from 'react'
import { Link } from 'wouter'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a href="#content" className="sr-only z-10 bg-white p-4 focus:not-sr-only focus:absolute">
        Zum Inhalt
      </a>
      <header className="border-b-2 border-black bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="~/" className="inline-flex min-h-11 items-center text-xl font-heading">
            Familienfreizeit
          </Link>
        </div>
      </header>
      <main id="content" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  )
}
