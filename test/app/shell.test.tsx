import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { App } from '../../src/app/app'
import { activeProfilePresentation } from '../../src/app/active-profile.js'
import { RouteBoundary, RouteLoading } from '../../src/app/components/application/route-states'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
import { activeProfile } from '../../src/config/index.js'
import type { Event } from '../../src/events/types.js'

beforeAll(async () => {
  await import('../../src/app/organiser/organiser-app')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function saveStatusTrigger(): HTMLElement {
  const trigger = screen
    .getAllByRole('button')
    .find((button) => /anzeigen$/.test(button.getAttribute('aria-label') ?? ''))
  if (!trigger) throw new Error('save-status trigger not found')
  return trigger
}

async function enableDraftMode() {
  fireEvent.click(saveStatusTrigger())
  fireEvent.click(await screen.findByRole('switch', { name: 'Entwurfsmodus' }))
}

async function openFamilyInviteDialog() {
  fireEvent.click(await screen.findByRole('button', { name: 'Familie hinzufügen' }))
  return within(await screen.findByRole('dialog'))
}

function open(
  path: string,
  events: readonly Event[] = [],
  profile: typeof activeProfilePresentation = activeProfilePresentation,
  applyFeatureOverrides: readonly { feature: string; value: 'on' | 'off' }[] = [],
) {
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
          input_seq?: number
          events?: readonly Record<string, unknown>[]
        }
        const applied = (body.events ?? []).map((event, index) => ({
          ...event,
          seq: (body.input_seq ?? 0) + index + 1,
          at: new Date(Date.UTC(2027, 0, 1, 0, 0, index)).toISOString(),
          actor: 'organiser@example.test',
        }))
        return Promise.resolve(
          new Response(
            JSON.stringify({ events: applied, feature_overrides: applyFeatureOverrides }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
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
            feature_overrides: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
  }
  window.history.replaceState({}, '', path)
  return { fetchMock, view: render(<App profile={profile} />) }
}

function workshopFixtureEvents(): readonly Event[] {
  const drafts: readonly Omit<Event, 'seq'>[] = [
    {
      at: '2027-01-01T00:00:00Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'FamilyInvited',
      payload: {
        family_id: 'fam_stein',
        email: 'stein@example.test',
        display_name: 'Stein',
        locale: 'de',
      },
    },
    {
      at: '2027-01-01T00:01:00Z',
      actor: 'organiser@example.test',
      subject: 'fam_stein',
      type: 'PersonAdded',
      payload: {
        person_id: 'per_mira',
        family_id: 'fam_stein',
        given_name: 'Mira',
        family_name: 'Stein',
        age: 39,
        role: 'adult',
      },
    },
    {
      at: '2027-01-01T00:01:30Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'ExternalLeaderAdded',
      payload: {
        external_leader_id: 'ext_pereira',
        name: 'Pereira',
        phone: '0151 555 0901',
        availability: ['Fr 09:00–11:00'],
        sort_key: 1,
      },
    },
    {
      at: '2027-01-01T00:02:00Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'WorkshopAdded',
      payload: {
        workshop_id: 'wks_keramik',
        title: 'Keramik',
        description: 'Mit den Händen gestalten.',
        audience: 'children',
        age_min: 5,
        age_max: 14,
        capacity: 8,
        participation_mode: 'assigned',
        leader_ids: ['per_mira', 'ext_pereira'],
        needs: [],
        sort_key: 1,
      },
    },
    {
      at: '2027-01-01T00:03:00Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'WorkshopSpaceAdded',
      payload: {
        workshop_space_id: 'wsp_atelier',
        name: 'Atelier',
        location_description: 'Haupthaus',
        capacity: 12,
        sort_key: 1,
      },
    },
    {
      at: '2027-01-01T00:04:00Z',
      actor: 'organiser@example.test',
      subject: null,
      type: 'WorkshopSlotAdded',
      payload: {
        slot_id: 'slot_fr_morning',
        starts_at: '2027-05-14T09:00:00Z',
        ends_at: '2027-05-14T11:00:00Z',
        sort_key: 1,
      },
    },
  ]
  return drafts.map((event, index) => ({ ...event, seq: index + 1 }))
}

test('the root renders an organiser-focused public shell', () => {
  open('/')
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Lübben 2027')
  expect(screen.getByText('Planungswerkzeug für die Familienfreizeit.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Als Organisator anmelden' }).getAttribute('href')).toBe(
    '/login',
  )
  expect(screen.queryByRole('link', { name: 'Anmelden' })).toBeNull()
  expect(screen.getByRole('main').id).toBe('content')
  expect(screen.getByRole('link', { name: 'Zum Inhalt' }).getAttribute('href')).toBe('#content')
  expect(screen.queryByRole('link', { name: /Organisationsteam/ })).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
})

test('the root renders the active profile landing copy', () => {
  const profile = {
    ...activeProfilePresentation,
    meta: {
      ...activeProfilePresentation.meta,
      public_landing: {
        heading: 'Profile-specific heading',
        intro: 'Profile-specific intro',
        actions: activeProfilePresentation.meta.public_landing.actions,
      },
    },
  }
  window.history.replaceState({}, '', '/')
  render(<App profile={profile} />)

  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Profile-specific heading')
  expect(screen.getByText('Profile-specific intro')).toBeTruthy()
})

test('the occasion landing renders configured route and external actions', () => {
  window.history.replaceState({}, '', '/')
  const profile = {
    ...activeProfilePresentation,
    meta: {
      ...activeProfilePresentation.meta,
      public_landing: {
        ...activeProfilePresentation.meta.public_landing,
        actions: [
          {
            id: 'organiser-login',
            label: { de: 'Als Organisator anmelden', en: 'Organiser login' },
            emphasis: 'primary' as const,
            destination: { kind: 'route' as const, to: '/login' },
          },
          {
            id: 'schedule',
            label: { de: 'Programm ansehen', en: 'View schedule' },
            emphasis: 'secondary' as const,
            destination: { kind: 'external' as const, href: 'https://example.org/schedule' },
          },
        ],
      },
    },
  }
  render(<App profile={profile} />)

  const organiser = screen.getByRole('link', { name: 'Als Organisator anmelden' })
  expect(organiser.getAttribute('href')).toBe('/login')
  expect(organiser.className).toContain('bg-main')

  const schedule = screen.getByRole('link', { name: 'Programm ansehen' })
  expect(schedule.getAttribute('href')).toBe('https://example.org/schedule')
  expect(schedule.className).toContain('bg-secondary-background')
})

test('the active profile logo is inverted for dark mode', () => {
  window.history.replaceState({}, '', '/')
  render(<App profile={activeProfilePresentation} />)

  const logo = document.querySelector(
    '[data-slot="decorative-illustration"] img[src*="luebben-2027"]',
  )
  expect(logo).toBeTruthy()
  expect(logo?.className).toContain('dark:invert')
})

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

  expect(await screen.findByText('Anfrage bearbeitet')).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: /Erneut anfordern in/ }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/login',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'organiser@example.test' }),
    }),
  )
})

test('the login form renders a dangerous demo link when the Worker returns one', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          accepted: true,
          magic_link: 'http://127.0.0.1/auth/demo-token',
        }),
        { status: 200 },
      ),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  window.history.replaceState({}, '', '/login')
  render(<App />)

  fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {
    target: { value: 'demo-organiser@example.invalid' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Magic Link anfordern' }))

  const link = await screen.findByRole('link', { name: 'Als Organisator anmelden' })
  expect(link.getAttribute('href')).toBe('http://127.0.0.1/auth/demo-token')
  expect(screen.getByText('Demo-Magic-Link bereit')).toBeTruthy()
  expect(screen.getByText('Klicke auf den Link, um Dich als Organisator anzumelden.')).toBeTruthy()
  expect(screen.getByRole('alert').className).toContain('bg-main')
  expect(screen.queryByLabelText('E-Mail-Adresse')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Magic Link anfordern' })).toBeNull()
})

test('a direct organiser URL loads the lazy route', async () => {
  open('/organiser')
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Abmelden' })).toBeTruthy()
})

test('an unauthenticated organiser URL returns to the login screen', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ),
  )
  window.history.replaceState({}, '', '/organiser')
  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Als Organisator anmelden' })).toBeTruthy()
})

test('ordinary route navigation preserves the user-controlled focus', async () => {
  open('/organiser')
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()

  const familiesLink = screen.getByRole('link', { name: /^Familien$/ })
  familiesLink.focus()
  fireEvent.click(familiesLink)

  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()
  expect(document.activeElement).toBe(familiesLink)
})

test('the organiser nav is labelled for assistive tech and the inventory page sets its own title', async () => {
  open('/organiser/accommodation/inventory')
  expect(await screen.findByRole('heading', { name: 'Unterkunft' })).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Unterbringungsbereiche' })).toBeTruthy()
  await waitFor(() => expect(document.title).toBe('Unterkunft · Familienfreizeit'))
})

test('section navigation keeps the primary and secondary current links separate', async () => {
  open('/organiser/accommodation/assignment')
  expect(await screen.findByRole('heading', { name: 'Wer schläft wo?' })).toBeTruthy()

  expect(screen.getByRole('link', { name: 'Unterbringung' }).getAttribute('aria-current')).toBe(
    'page',
  )
  expect(screen.getByRole('link', { name: 'Belegung' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Unterkunft' }).getAttribute('aria-current')).toBeNull()
})

test('workshop navigation exposes the intended areas and switches resource views with tabs', async () => {
  open('/organiser/workshops/slots')
  expect(await screen.findByRole('heading', { name: 'Slots' })).toBeTruthy()

  const navigation = screen.getByRole('navigation', { name: 'Workshopbereiche' })
  expect(
    within(navigation)
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['Übersicht', 'Teilnahme', 'Wünsche', 'Räume und Slots', 'Listen'])
  expect(
    within(navigation).getByRole('link', { name: 'Räume und Slots' }).getAttribute('aria-current'),
  ).toBe('page')
  expect(screen.getByRole('navigation', { name: 'Räume und Slots' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Slots' }).getAttribute('aria-current')).toBe('page')
  fireEvent.click(screen.getByRole('link', { name: 'Räume' }))
  expect(await screen.findByRole('heading', { name: 'Räume und Slots' })).toBeTruthy()
})

test('workshop participation shows the responsive person overview and links to wish traces', async () => {
  open('/organiser/workshops/participation', workshopFixtureEvents())
  expect(await screen.findByRole('heading', { name: 'Teilnahme' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Personen' })).toBeNull()
  expect(screen.queryByText('Wer nimmt woran teil, und wer leitet?')).toBeNull()
  expect(
    screen.queryByText('Ein Name zeigt, was aus den Wünschen der Person geworden ist.'),
  ).toBeNull()
  expect(screen.queryByText('4.–5. Wahl')).toBeNull()
  expect(
    within(screen.getByRole('navigation', { name: 'Teilnahmeansichten' })).getByRole('link', {
      name: 'Personen',
    }),
  ).toBeTruthy()
  expect(
    within(screen.getByRole('navigation', { name: 'Teilnahmeansichten' })).getByRole('link', {
      name: 'Programm',
    }),
  ).toBeTruthy()
  const table = document.querySelector('.workshop-participation__table')
  expect(table?.querySelector('tbody tr th')?.textContent).toContain('erwachsen')
  expect(table?.querySelectorAll('thead th')).toHaveLength(
    1 +
      (table?.querySelectorAll('tbody tr:first-child .workshop-participation__slot-cell').length ??
        0),
  )
  expect(table?.querySelector('thead')?.textContent).not.toMatch(/Rangfolge|Workshops/u)
  expect(table?.querySelector('caption')?.textContent).toMatch(
    /Teilnahme · \d+ Person(?:en)? · \d+ Slots?/u,
  )
  const firstSlotHeading = table?.querySelector('thead th:nth-child(2)')
  expect(firstSlotHeading?.textContent).toContain('Fr 11:00')
  expect(firstSlotHeading?.querySelector('.workshop-participation__slot-end')?.textContent).toBe(
    'bis 13:00',
  )
  expect(screen.getAllByRole('link', { name: /Wünsche verfolgen/u }).length).toBeGreaterThan(0)
  expect(
    screen
      .getByRole('navigation', { name: 'Workshopbereiche' })
      .querySelector('[aria-current="page"]')?.textContent,
  ).toBe('Teilnahme')
})

test('slot editing uses a duration and does not offer slot capacity', async () => {
  const { fetchMock } = open('/organiser/workshops/slots')
  expect(await screen.findByRole('heading', { name: 'Slots' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Slot hinzufügen' }))
  expect(screen.getByRole('heading', { name: 'Slot hinzufügen' })).toBeTruthy()
  const slotStart = screen.getByLabelText('Beginn') as HTMLInputElement
  expect(slotStart.value).toBe(`${activeProfile.meta.starts_on}T09:00`)
  expect(screen.getByLabelText('Dauer (Minuten)')).toBeTruthy()
  expect(screen.queryByLabelText(/^Plätze/)).toBeNull()

  fireEvent.change(screen.getByLabelText('Beginn'), {
    target: { value: '2027-05-14T11:30' },
  })
  fireEvent.change(screen.getByLabelText('Dauer (Minuten)'), { target: { value: '120' } })
  fireEvent.click(screen.getByRole('button', { name: 'Slot anlegen' }))

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith('/api/organiser/apply', expect.anything()),
  )
  const applyCall = fetchMock?.mock.calls.find(([input]) =>
    String(input).endsWith('/api/organiser/apply'),
  )
  const body = JSON.parse(String(applyCall?.[1]?.body ?? '{}')) as {
    events?: readonly { type?: string; payload?: Record<string, unknown> }[]
  }
  expect(body.events?.[0]).toMatchObject({
    type: 'WorkshopSlotAdded',
    payload: {
      starts_at: '2027-05-14T11:30:00.000Z',
      ends_at: '2027-05-14T13:30:00.000Z',
    },
  })
})

test('workshop allocation exposes three URL-backed Wunsch views', async () => {
  open('/organiser/workshops/allocation', workshopFixtureEvents())
  expect(await screen.findByRole('heading', { name: 'Wünsche' })).toBeTruthy()

  const navigation = screen.getByRole('navigation', { name: 'Wünsche' })
  expect(
    within(navigation)
      .getAllByRole('link')
      .map((tab) => tab.textContent),
  ).toEqual(['Antworten', 'Nachfrage', 'Verlauf'])
  expect(screen.getByRole('link', { name: 'Antworten' }).getAttribute('aria-current')).toBe('page')

  fireEvent.click(screen.getByRole('link', { name: 'Nachfrage' }))
  expect(await screen.findByRole('heading', { name: 'Nachfrage' })).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/allocation/demand')

  fireEvent.click(screen.getByRole('link', { name: 'Verlauf' }))
  expect(
    await screen.findByRole('heading', { name: 'Was ist aus jedem Wunsch geworden?' }),
  ).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/allocation/trace')
})

test('the workshop overview uses the prototype view labels', async () => {
  open('/organiser/workshops', workshopFixtureEvents())
  expect(await screen.findByRole('heading', { name: 'Workshops', level: 1 })).toBeTruthy()

  const views = screen.getByRole('navigation', { name: 'Workshopansichten' })
  expect(
    within(views)
      .getAllByRole('link')
      .map((tab) => tab.textContent?.replace(/\d+/g, '').trim()),
  ).toEqual(['Workshops', 'Leitungen', 'Externe Leitungen'])
})

test('the external leaders view follows the prototype list and stages a complete update', async () => {
  const { fetchMock } = open('/organiser/workshops/externe', workshopFixtureEvents())
  if (!fetchMock) throw new Error('organiser fetch mock not installed')

  expect(await screen.findByRole('heading', { name: 'Externe Leitungen' })).toBeTruthy()
  expect(screen.getByText('Pereira')).toBeTruthy()
  expect(screen.getAllByText('Keramik').length).toBeGreaterThan(0)
  expect(screen.getByText('alle Slots')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten: Pereira' }))

  expect(screen.getByRole('heading', { name: 'Externe Leitung: Pereira' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pereira Weber' } })
  fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }))

  expect(await screen.findByText('Pereira Weber')).toBeTruthy()
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith('/api/organiser/apply', expect.anything()),
  )
  const applyCall = fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith('/api/organiser/apply'),
  )
  const body = JSON.parse(String(applyCall?.[1]?.body ?? '{}')) as {
    events?: readonly { type?: string; payload?: Record<string, unknown> }[]
  }
  expect(body.events?.[0]).toMatchObject({
    type: 'ExternalLeaderUpdated',
    payload: { external_leader_id: 'ext_pereira', name: 'Pereira Weber' },
  })
})

test('the workshop overview presents resolved labels and derived placement data', async () => {
  open('/organiser/workshops', workshopFixtureEvents())

  expect(await screen.findByRole('heading', { name: 'Workshops', level: 1 })).toBeTruthy()
  expect(screen.getAllByText('Kinder').length).toBeGreaterThan(0)
  expect(screen.queryByText('Automatische Zuordnung')).toBeNull()
  expect(screen.getByText(/Mira Stein/)).toBeTruthy()
  expect(screen.getByText(/Atelier/)).toBeTruthy()
})

test('workshop authoring uses the focused editor dialog to create a workshop', async () => {
  const { fetchMock } = open('/organiser/workshops', workshopFixtureEvents())
  if (!fetchMock) throw new Error('organiser fetch mock not installed')

  expect(await screen.findByRole('heading', { name: 'Workshops', level: 1 })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Workshop hinzufügen' }))

  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Workshop hinzufügen' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Fotowerkstatt' } })
  fireEvent.change(screen.getByLabelText('Beschreibung für Familien'), {
    target: { value: 'Bilder machen und entwickeln.' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Entwurf anlegen' }))

  expect(await screen.findByText('Fotowerkstatt')).toBeTruthy()
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith('/api/organiser/apply', expect.anything()),
  )
  const applyCall = fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith('/api/organiser/apply'),
  )
  const body = JSON.parse(String(applyCall?.[1]?.body ?? '{}')) as {
    events?: readonly { type?: string; payload?: Record<string, unknown> }[]
  }
  expect(body.events?.[0]).toMatchObject({
    type: 'WorkshopAdded',
    payload: { title: 'Fotowerkstatt', description: 'Bilder machen und entwickeln.' },
  })
})

test('workshop authoring opens existing values and stages a complete update', async () => {
  const { fetchMock } = open('/organiser/workshops', workshopFixtureEvents())
  if (!fetchMock) throw new Error('organiser fetch mock not installed')

  expect(await screen.findByRole('heading', { name: 'Workshops', level: 1 })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten: Keramik' }))

  expect(screen.getByRole('heading', { name: 'Workshop bearbeiten: Keramik' })).toBeTruthy()
  expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Keramik')
  expect((screen.getByRole('checkbox', { name: 'Mira Stein' }) as HTMLInputElement).checked).toBe(
    true,
  )
  fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Keramik Plus' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: /^Plätze/ }), {
    target: { value: '10' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

  expect(await screen.findByText('Keramik Plus')).toBeTruthy()
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith('/api/organiser/apply', expect.anything()),
  )
  const applyCall = fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith('/api/organiser/apply'),
  )
  const body = JSON.parse(String(applyCall?.[1]?.body ?? '{}')) as {
    events?: readonly { type?: string; payload?: Record<string, unknown> }[]
  }
  expect(body.events?.[0]).toMatchObject({
    type: 'WorkshopUpdated',
    payload: { workshop_id: 'wks_keramik', title: 'Keramik Plus', capacity: 10 },
  })
})

test('the programme review keeps each view at its own URL and avoids false roster actions', async () => {
  open('/organiser/workshops/programme', workshopFixtureEvents())

  expect(await screen.findByRole('heading', { name: 'Programm' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Teilnahme' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Programm' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByText(/Freitag/)).toBeTruthy()
  expect(screen.getAllByText('Keramik').length).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: 'Keramik' })).toBeNull()

  fireEvent.click(screen.getByRole('link', { name: 'Nicht eingeplant' }))
  expect(
    await screen.findByRole('link', { name: 'Nicht eingeplant', current: 'page' }),
  ).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/programme/unplaced')
  expect(screen.getByText('Nicht eingeplant')).toBeTruthy()

  fireEvent.click(screen.getByRole('link', { name: 'Überschneidungen' }))
  expect(
    await screen.findByRole('link', { name: 'Überschneidungen', current: 'page' }),
  ).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/programme/overlaps')
  expect(screen.getByRole('heading', { name: 'Überschneidungen' })).toBeTruthy()
})

test('slot and space retirement require explicit confirmation', async () => {
  open('/organiser/workshops/spaces', workshopFixtureEvents())

  expect(await screen.findByRole('heading', { name: 'Räume und Slots' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }))

  expect(screen.getByRole('alertdialog')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Raum entfernen?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Behalten' }))
  expect(screen.queryByRole('alertdialog')).toBeNull()
})

test('a failed organiser log load shows a load error, not a save error', async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/api/me'))
      return Promise.resolve(
        new Response(
          JSON.stringify({ principal: { kind: 'organiser', email: 'organiser@example.test' } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
    return Promise.resolve(new Response(JSON.stringify({ error: 'internal' }), { status: 500 }))
  })
  vi.stubGlobal('fetch', fetchMock)
  window.history.replaceState({}, '', '/organiser')
  render(<App />)

  expect(await screen.findByText('Daten konnten nicht geladen werden')).toBeTruthy()
  expect(
    screen.getByText('Die Organisationsdaten konnten nicht geladen werden.', { exact: false }),
  ).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Neu laden' })).toBeTruthy()
  // No organiser nav or save-status control renders for a whole-app load failure.
  expect(screen.queryByRole('navigation')).toBeNull()
  expect(screen.queryByText(/Speichern fehlgeschlagen/)).toBeNull()
})

test('organiser links stay within the nested route base', async () => {
  open('/organiser')
  const familiesLink = await screen.findByRole('link', { name: /Alle Familien ansehen/ })
  expect(familiesLink.getAttribute('href')).toBe('/organiser/families')
})

test('organiser state survives client-side route and history navigation', async () => {
  const familyEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'FamilyInvited',
    payload: {
      family_id: 'fam_existing',
      email: 'existing@example.test',
      display_name: 'Bestehende Familie',
      locale: 'de',
    },
  }
  const { fetchMock } = open('/organiser', [familyEvent])
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()

  await enableDraftMode()
  fireEvent.click(screen.getByRole('link', { name: /Alle Familien ansehen/ }))
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()

  const inviteDialog = await openFamilyInviteDialog()
  fireEvent.change(inviteDialog.getByLabelText('Familienname'), {
    target: { value: 'Neue Familie' },
  })
  fireEvent.change(inviteDialog.getByLabelText('E-Mail'), { target: { value: 'neu@example.test' } })
  fireEvent.click(inviteDialog.getByRole('button', { name: 'Familie hinzufügen' }))
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')

  fireEvent.click(screen.getByRole('link', { name: 'Bestehende Familie' }))
  expect(await screen.findByRole('heading', { name: 'Bestehende Familie' })).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')

  fireEvent.click(screen.getByRole('link', { name: 'Familien' }))
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Neue Familie' })).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')

  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')

  window.history.pushState({}, '', '/organiser/families')
  fireEvent(window, new PopStateEvent('popstate'))
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')
  expect(
    fetchMock?.mock.calls.filter(([input]) => String(input).endsWith('/api/organiser/log')),
  ).toHaveLength(1)
})

test('leaving and re-entering the organiser starts a fresh in-memory session', async () => {
  open('/organiser')
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()

  fireEvent.click(screen.getByRole('link', { name: 'Familienfreizeit Lübben 2027' }))
  expect(await screen.findByRole('heading', { name: 'Lübben 2027' })).toBeTruthy()

  window.history.pushState({}, '', '/organiser')
  fireEvent(window, new PopStateEvent('popstate'))
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toBe(
    'Alles gespeichert. Speicheroptionen anzeigen',
  )
})

test('organiser draft mode replaces the upload control with its workspace', async () => {
  open('/organiser/families')
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()

  await enableDraftMode()
  expect(screen.getByRole('heading', { name: 'Noch keine Entwürfe' })).toBeTruthy()
  expect(
    screen.getByText('Neue Änderungen bleiben in diesem Browser, bis du sie speicherst.'),
  ).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toBe(
    'Entwurfsmodus aktiv, keine Entwürfe. Details anzeigen',
  )

  const inviteDialog = await openFamilyInviteDialog()
  fireEvent.change(inviteDialog.getByLabelText('Familienname'), {
    target: { value: 'Neue Familie' },
  })
  fireEvent.change(inviteDialog.getByLabelText('E-Mail'), {
    target: { value: 'neu@example.test' },
  })
  fireEvent.click(inviteDialog.getByRole('button', { name: 'Familie hinzufügen' }))

  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')
  fireEvent.click(saveStatusTrigger())
  expect(
    await screen.findByRole('heading', { name: '1 Änderung nur in diesem Browser' }),
  ).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Änderungen speichern' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Verwerfen …' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Verwerfen …' }))
  expect(await screen.findByRole('heading', { name: '1 Änderung verwerfen?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Ja, verwerfen' }))

  expect(
    await screen.findByRole('button', {
      name: 'Alles gespeichert. Speicheroptionen anzeigen',
    }),
  ).toBeTruthy()
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
  await enableDraftMode()
  fireEvent.click(screen.getByRole('link', { name: 'Personen' }))
  const addPerson = await screen.findByRole('button', { name: 'Person hinzufügen' })
  fireEvent.click(addPerson)
  const personDialog = await screen.findByRole('dialog')
  fireEvent.change(within(personDialog).getByLabelText('Vorname'), { target: { value: 'Lokale' } })
  fireEvent.change(within(personDialog).getByLabelText('Nachname'), { target: { value: 'Person' } })
  fireEvent.click(within(personDialog).getByRole('button', { name: 'Person hinzufügen' }))

  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')
  expect(await screen.findByText('Lokale Person')).toBeTruthy()
})

test('immediate mode sends the same staged event through apply automatically', async () => {
  const { fetchMock } = open('/organiser/families')
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()

  const inviteDialog = await openFamilyInviteDialog()
  fireEvent.change(inviteDialog.getByLabelText('Familienname'), {
    target: { value: 'Sofort Familie' },
  })
  fireEvent.change(inviteDialog.getByLabelText('E-Mail'), {
    target: { value: 'sofort@example.test' },
  })
  fireEvent.click(inviteDialog.getByRole('button', { name: 'Familie hinzufügen' }))

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
      age: null,
      role: 'adult',
    },
  }
  open('/organiser/families', [familyEvent, personEvent])
  const familyLink = await screen.findByRole('link', { name: 'Foo Familie' })
  expect(screen.getByLabelText('Familien durchsuchen')).toBeTruthy()
  expect(familyLink.getAttribute('href')).toBe('/organiser/families/6b4b44137d724c1e')
  fireEvent.click(familyLink)
  expect(await screen.findByRole('heading', { name: 'Foo Familie' })).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Personen' }))
  expect(await screen.findByRole('tab', { name: /Ada Beispiel/ })).toBeTruthy()
})

test('families keeps manual invitation without a bulk-import surface', async () => {
  open('/organiser/families')

  expect(await screen.findByRole('button', { name: 'Familie hinzufügen' })).toBeTruthy()
  expect(screen.queryByLabelText('Familienname')).toBeNull()
  expect(screen.queryByRole('heading', { name: 'Import' })).toBeNull()
  expect(screen.queryByRole('textbox', { name: 'CSV-Daten' })).toBeNull()
})

test('families validate invitations', async () => {
  open('/organiser/families')
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()
  expect(screen.getByLabelText('Familien durchsuchen')).toBeTruthy()

  const inviteDialog = await openFamilyInviteDialog()
  fireEvent.change(inviteDialog.getByLabelText('Familienname'), {
    target: { value: 'Neue Familie' },
  })
  fireEvent.change(inviteDialog.getByLabelText('E-Mail'), { target: { value: 'ungültig' } })
  fireEvent.click(inviteDialog.getByRole('button', { name: 'Familie hinzufügen' }))
  expect(screen.getByRole('alert').textContent).toBe('Bitte gib eine gültige E-Mail-Adresse ein.')
})

test.each(['/family', '/unknown', '/organiser/unknown'])(
  '%s has a recoverable not-found state',
  async (path) => {
    open(path)
    expect(await screen.findByRole('heading', { name: 'Diese Seite gibt es nicht' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Zur Startseite' }))
    expect(await screen.findByRole('heading', { name: 'Lübben 2027' })).toBeTruthy()
  },
)

test('route loading announces its state without exposing decorative skeletons', () => {
  render(<RouteLoading />)
  expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true')
  expect(screen.getByText('Ansicht wird vorbereitet …')).toBeTruthy()
  expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0)
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

test('a route change resets the error boundary without a child remount key', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenRoute(): never {
    throw new Error('private exception')
  }
  const { rerender } = render(
    <RouteBoundary reset_key="broken">
      <BrokenRoute />
    </RouteBoundary>,
  )
  expect(screen.getByRole('alert').textContent).toContain('Die Ansicht konnte nicht geladen werden')

  rerender(
    <RouteBoundary reset_key="recovered">
      <p>Recovered route</p>
    </RouteBoundary>,
  )
  expect(screen.getByText('Recovered route')).toBeTruthy()
})

test('an apply response with changed feature overrides asks for a reload', async () => {
  open('/organiser/families', [], activeProfilePresentation, [
    { feature: 'family-preferences.family-room-wishes', value: 'off' },
  ])
  expect(await screen.findByRole('heading', { name: /Familien/, level: 1 })).toBeTruthy()

  const inviteDialog = await openFamilyInviteDialog()
  fireEvent.change(inviteDialog.getByLabelText('Familienname'), {
    target: { value: 'Sofort Familie' },
  })
  fireEvent.change(inviteDialog.getByLabelText('E-Mail'), {
    target: { value: 'sofort@example.test' },
  })
  fireEvent.click(inviteDialog.getByRole('button', { name: 'Familie hinzufügen' }))

  expect(await screen.findByText('Diese Ansicht ist veraltet. Bitte lade sie neu.')).toBeTruthy()
})
