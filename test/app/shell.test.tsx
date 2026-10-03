import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { App } from '../../src/app/app'
import { RouteBoundary, RouteLoading } from '../../src/app/components/application/route-states'
import { buildRevision, compatibilityRevision } from '../../src/config/build.js'
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
        display_name: 'Familie Stein',
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
        birthdate: '1988-04-12',
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
        availability_windows: [
          { starts_at: '2027-05-14T08:00:00Z', ends_at: '2027-05-14T18:00:00Z' },
        ],
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

test('ordinary route navigation preserves the user-controlled focus', async () => {
  open('/organiser')
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()

  const familiesLink = screen.getByRole('link', { name: /^Familien$/ })
  familiesLink.focus()
  fireEvent.click(familiesLink)

  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()
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
  ).toEqual(['Workshops', 'Programm', 'Wünsche', 'Räume und Slots'])
  expect(
    within(navigation).getByRole('link', { name: 'Räume und Slots' }).getAttribute('aria-current'),
  ).toBe('page')
  expect(screen.getByRole('tablist', { name: 'Räume und Slots' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Slots' }).getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('tab', { name: 'Räume' }))
  expect(await screen.findByRole('heading', { name: 'Räume und Slots' })).toBeTruthy()
})

test('workshop allocation exposes three URL-backed Wunsch views', async () => {
  open('/organiser/workshops/allocation', workshopFixtureEvents())
  expect(await screen.findByRole('heading', { name: 'Wünsche' })).toBeTruthy()

  const navigation = screen.getByRole('tablist', { name: 'Wünsche' })
  expect(
    within(navigation)
      .getAllByRole('tab')
      .map((tab) => tab.textContent),
  ).toEqual(['Antworten', 'Nachfrage', 'Verlauf'])
  expect(screen.getByRole('tab', { name: 'Antworten' }).getAttribute('aria-selected')).toBe('true')

  fireEvent.click(screen.getByRole('tab', { name: 'Nachfrage' }))
  expect(await screen.findByRole('heading', { name: 'Nachfrage' })).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/allocation/demand')

  fireEvent.click(screen.getByRole('tab', { name: 'Verlauf' }))
  expect(
    await screen.findByRole('heading', { name: 'Was ist aus jedem Wunsch geworden?' }),
  ).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/allocation/trace')
})

test('the workshop overview uses the prototype view labels', async () => {
  open('/organiser/workshops', workshopFixtureEvents())
  expect(await screen.findByRole('heading', { name: 'Workshopübersicht' })).toBeTruthy()

  const views = screen.getByRole('tablist', { name: 'Workshopansichten' })
  expect(
    within(views)
      .getAllByRole('tab')
      .map((tab) => tab.textContent),
  ).toEqual(['Workshops', 'Leitungen', 'Externe Leitungen'])
})

test('the external leaders view follows the prototype list and stages a complete update', async () => {
  const { fetchMock } = open('/organiser/workshops/externe', workshopFixtureEvents())
  if (!fetchMock) throw new Error('organiser fetch mock not installed')

  expect(await screen.findByRole('heading', { name: 'Externe Leitungen' })).toBeTruthy()
  expect(screen.getByText('Pereira')).toBeTruthy()
  expect(screen.getByText('Keramik')).toBeTruthy()
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

  expect(await screen.findByRole('heading', { name: 'Workshopübersicht' })).toBeTruthy()
  expect(screen.getAllByText('Kinder').length).toBeGreaterThan(0)
  expect(screen.getByText('Automatische Zuordnung')).toBeTruthy()
  expect(screen.getByText(/Mira Stein/)).toBeTruthy()
  expect(screen.getByText(/Atelier/)).toBeTruthy()
})

test('workshop authoring uses the focused editor dialog to create a workshop', async () => {
  const { fetchMock } = open('/organiser/workshops', workshopFixtureEvents())
  if (!fetchMock) throw new Error('organiser fetch mock not installed')

  expect(await screen.findByRole('heading', { name: 'Workshopübersicht' })).toBeTruthy()
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

  expect(await screen.findByRole('heading', { name: 'Workshopübersicht' })).toBeTruthy()
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
  expect(screen.getByRole('link', { name: 'Programm' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByText(/Freitag/)).toBeTruthy()
  expect(screen.getByText('Keramik')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Keramik' })).toBeNull()

  fireEvent.click(screen.getByRole('tab', { name: 'Nicht eingeplant' }))
  expect(await screen.findByRole('tab', { name: 'Nicht eingeplant', selected: true })).toBeTruthy()
  expect(window.location.pathname).toBe('/organiser/workshops/programme/unplaced')
  expect(screen.getByText('Nicht eingeplant')).toBeTruthy()

  fireEvent.click(screen.getByRole('tab', { name: 'Überschneidungen' }))
  expect(await screen.findByRole('tab', { name: 'Überschneidungen', selected: true })).toBeTruthy()
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

  expect(
    await screen.findByText('Die Organisationsdaten konnten nicht geladen werden'),
  ).toBeTruthy()
  expect(
    screen.getByText('Die Familiendaten konnten nicht geladen werden.', { exact: false }),
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
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()

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

  fireEvent.click(screen.getByRole('link', { name: '← Familien' }))
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Neue Familie' })).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')

  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
  expect(
    await screen.findByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeTruthy()
  expect(saveStatusTrigger().getAttribute('aria-label')).toContain('1 Änderung')

  window.history.pushState({}, '', '/organiser/families')
  fireEvent(window, new PopStateEvent('popstate'))
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()
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

  fireEvent.click(screen.getByRole('link', { name: 'Familienfreizeit' }))
  expect(
    await screen.findByRole('heading', { name: 'Willkommen zur Familienfreizeit' }),
  ).toBeTruthy()

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
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()

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
  fireEvent.click(screen.getByRole('tab', { name: 'Personen' }))
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
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()

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
      birthdate: null,
      role: 'adult',
    },
  }
  open('/organiser/families', [familyEvent, personEvent])
  const familyLink = await screen.findByRole('link', { name: 'Foo Familie' })
  expect(screen.getByLabelText('Familien durchsuchen')).toBeTruthy()
  expect(familyLink.getAttribute('href')).toBe('/organiser/families/6b4b44137d724c1e')
  fireEvent.click(familyLink)
  expect(await screen.findByRole('heading', { name: 'Foo Familie' })).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: 'Personen' }))
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
  expect(await screen.findByRole('heading', { name: /Familien/ })).toBeTruthy()
  expect(screen.getByLabelText('Familien durchsuchen')).toBeTruthy()

  const inviteDialog = await openFamilyInviteDialog()
  fireEvent.change(inviteDialog.getByLabelText('Familienname'), {
    target: { value: 'Neue Familie' },
  })
  fireEvent.change(inviteDialog.getByLabelText('E-Mail'), { target: { value: 'ungültig' } })
  fireEvent.click(inviteDialog.getByRole('button', { name: 'Familie hinzufügen' }))
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
