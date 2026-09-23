import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from '../../src/app/app'
import { RouteBoundary, RouteLoading } from '../../src/app/components/route-states'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function open(path: string) {
  if (path.startsWith('/organiser')) {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/api/me'))
          return Promise.resolve(
            new Response(
              JSON.stringify({ principal: { kind: 'organiser', email: 'organiser@example.test' } }),
              {
                status: 200,
                headers: { 'content-type': 'application/json' },
              },
            ),
          )
        return Promise.resolve(
          new Response(
            JSON.stringify({
              events: [],
              head_seq: 0,
              build_revision: buildRevision,
              compatibility_revision: compatibilityRevision,
              screen_registry: [],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }),
    )
  }
  window.history.replaceState({}, '', path)
  return render(<App />)
}

test.each(['/', '/login', '/family'])(
  '%s renders a public, German shell without an organiser navigation',
  async (path) => {
    open(path)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Willkommen zur Familienfreizeit',
    )
    expect(screen.getByRole('main').id).toBe('content')
    expect(screen.getByRole('link', { name: 'Zum Inhalt' }).getAttribute('href')).toBe('#content')
    expect(screen.queryByRole('link', { name: /Organisationsteam/ })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  },
)

test('a direct organiser URL loads the lazy route', async () => {
  open('/organiser')
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()
})

test.each(['/unknown', '/organiser/unknown'])(
  '%s has a recoverable not-found state',
  async (path) => {
    open(path)
    expect(await screen.findByRole('heading', { name: 'Diese Seite gibt es nicht' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Zur Startseite' }))
    expect(
      await screen.findByRole('heading', { name: 'Willkommen zur Familienfreizeit' }),
    ).toBeTruthy()
  },
)

test('route loading announces its state without exposing decorative skeletons', () => {
  render(<RouteLoading />)
  expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true')
  expect(document.querySelectorAll('[data-slot="skeleton"][aria-hidden="true"]').length).toBe(2)
})

test('a failed chunk/render offers recovery and does not display exception details', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenRoute(): never {
    throw new Error('private exception')
  }
  render(
    <RouteBoundary>
      <BrokenRoute />
    </RouteBoundary>,
  )
  expect(screen.getByRole('alert').textContent).toContain('Die Ansicht konnte nicht geladen werden')
  expect(screen.getByRole('button', { name: 'Neu laden' })).toBeTruthy()
  expect(document.body.textContent).not.toContain('private exception')
})
