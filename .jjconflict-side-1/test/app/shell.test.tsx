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
  let fetchMock: ReturnType<typeof vi.fn> | undefined
  if (path.startsWith('/organiser')) {
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
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
      if (url.endsWith('/api/organiser/apply')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          events?: readonly Record<string, unknown>[]
        }
        const applied = (body.events ?? []).map((event, index) => ({ ...event, seq: index + 1 }))
        return Promise.resolve(
          new Response(JSON.stringify({ events: applied }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
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
    })
    vi.stubGlobal('fetch', fetchMock)
  }
  window.history.replaceState({}, '', path)
  return { fetchMock, view: render(<App />) }
}

test.each(['/', '/family'])(
  '%s renders a public, German shell without an organiser navigation',
  async (path) => {
    open(path)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Willkommen zur Familienfreizeit',
    )
    expect(screen.getByText('Anmeldung noch nicht freigeschaltet')).toBeTruthy()
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

test('organiser draft mode replaces the upload control with its workspace', async () => {
  open('/organiser/families')
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Entwurfsmodus starten' }))
  expect(screen.queryByRole('button', { name: 'Entwurfsmodus starten' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Änderungsentwürfe in diesem Browser' })).toBeTruthy()
  expect(screen.getByText('Diese Entwürfe bleiben hier, bis Du sie anwendest.')).toBeTruthy()
  expect(screen.getByText('Keine Änderungsentwürfe')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Entwürfe verwerfen' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Entwürfe anwenden' }).hasAttribute('disabled')).toBe(
    true,
  )

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neue Familie' } })
  fireEvent.change(screen.getByLabelText('E-Mail'), {
    target: { value: 'neu@example.test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Zur offenen Liste' }))

  expect(await screen.findByText('1 Änderungsentwurf')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Entwürfe anwenden' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Entwürfe verwerfen' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Rückgängig' })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: 'Entwürfe verwerfen' }))
  expect(await screen.findByRole('button', { name: 'Entwurfsmodus starten' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Änderungsentwürfe in diesem Browser' })).toBeNull()
})

test('family history includes staged events before they are applied', async () => {
  const familyEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'FamilyInvited',
    payload: {
      family_id: 'fam_local',
      email: 'local@example.test',
      display_name: 'Lokale Familie',
      locale: 'de',
    },
  }
  open('/organiser/families', [familyEvent])
  fireEvent.click(await screen.findByRole('link', { name: 'Lokale Familie' }))
  expect(await screen.findByRole('heading', { name: 'Lokale Familie' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Entwurfsmodus starten' }))
  fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Lokale' } })
  fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Person' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))

  expect(await screen.findByText('Noch nicht angewendet')).toBeTruthy()
  expect(screen.getByText('Person hinzugefügt')).toBeTruthy()
})

test('immediate mode sends the same staged event through apply automatically', async () => {
  const { fetchMock } = open('/organiser/families')
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sofort Familie' } })
  fireEvent.change(screen.getByLabelText('E-Mail'), {
    target: { value: 'sofort@example.test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Zur offenen Liste' }))

  expect(await screen.findByRole('link', { name: 'Sofort Familie' })).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/organiser/apply',
    expect.objectContaining({ method: 'POST' }),
  )
  expect(screen.queryByRole('button', { name: /offene Änderung anzeigen/ })).toBeNull()
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
  const personEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:01:00Z',
    actor: 'organiser@example.test',
    subject: 'fam_6b4b44137d724c1e',
    type: 'PersonAdded',
    payload: {
      person_id: 'per_1',
      family_id: 'fam_6b4b44137d724c1e',
      given_name: 'Ada',
      family_name: 'Beispiel',
      birthdate: null,
      role: 'adult',
    },
  }
  open('/organiser/families', [familyEvent, personEvent])
  const familyLink = await screen.findByRole('link', { name: 'Foo Familie' })
  expect(familyLink.getAttribute('href')).toBe('/organiser/families/6b4b44137d724c1e')
  fireEvent.click(familyLink)
  expect(await screen.findByRole('heading', { name: 'Foo Familie' })).toBeTruthy()
  expect(screen.getByText('Erwachsene(r)', { selector: 'span' })).toBeTruthy()
  expect(screen.getByText('Familie eingeladen')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
})

test('families keeps manual invitation without a bulk-import surface', async () => {
  open('/organiser/families')

  expect(await screen.findByRole('heading', { name: 'Familie einladen' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Zur offenen Liste' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Import' })).toBeNull()
  expect(screen.queryByRole('textbox', { name: 'CSV-Daten' })).toBeNull()
})

test('families explain empty searches and invalid invitations', async () => {
  open('/organiser/families')
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()

  fireEvent.change(screen.getByLabelText('Familien suchen'), { target: { value: 'unbekannt' } })
  expect(screen.getByRole('status').textContent).toContain(
    'Keine Familien für „unbekannt“ gefunden.',
  )

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neue Familie' } })
  fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'ungültig' } })
  fireEvent.click(screen.getByRole('button', { name: 'Zur offenen Liste' }))
  expect(screen.getByRole('alert').textContent).toBe('Bitte gib eine gültige E-Mail-Adresse ein.')
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
