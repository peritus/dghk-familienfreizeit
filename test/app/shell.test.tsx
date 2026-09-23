import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { App } from '../../src/app/app'
import { RouteBoundary, RouteLoading } from '../../src/app/components/route-states'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
import type { Event } from '../../src/events/types.js'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function open(path: string, events: readonly Event[] = []) {
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
              events,
              head_seq: events.length,
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

test.each(['/', '/family'])(
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

test('the login form requests a magic link and explains local delivery', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify({ accepted: true }), { status: 200 })),
  )
  vi.stubGlobal('fetch', fetchMock)
  window.history.replaceState({}, '', '/login')
  render(<App />)

  fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {
    target: { value: 'organiser@example.test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Magic Link anfordern' }))

  expect(await screen.findByText('Magic Link angefordert')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/login',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'organiser@example.test' }),
    }),
  )
})

test('a direct organiser URL loads the lazy route', async () => {
  open('/organiser')
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()
})

test('organiser links stay within the nested route base', async () => {
  open('/organiser')
  const familiesLink = await screen.findByRole('link', { name: 'Familien öffnen' })
  expect(familiesLink.getAttribute('href')).toBe('/organiser/families')
})

test('family links use an opaque route ID and open the matching detail view', async () => {
  const familyEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'FamilyInvited',
    payload: {
      family_id: 'fam_6b4b44137d724c1e',
      email: 'foo@example.com',
      display_name: 'Foo Familie',
      locale: 'de',
    },
  }
  open('/organiser/families', [familyEvent])
  const familyLink = await screen.findByRole('link', { name: 'Foo Familie' })
  expect(familyLink.getAttribute('href')).toBe('/organiser/families/6b4b44137d724c1e')
  fireEvent.click(familyLink)
  expect(await screen.findByRole('heading', { name: 'Foo Familie' })).toBeTruthy()
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
