import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { App } from '../../src/app/app'
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

function open(events: readonly Event[] = []) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/me'))
      return Promise.resolve(
        new Response(
          JSON.stringify({ principal: { kind: 'organiser', email: 'organiser@example.test' } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
    if (url.endsWith('/api/organiser/apply')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        input_seq?: number
        events?: readonly Record<string, unknown>[]
      }
      const inputSeq = body.input_seq ?? 0
      const applied = (body.events ?? []).map((event, index) => ({
        at: new Date().toISOString(),
        actor: 'organiser@example.test',
        ...event,
        seq: inputSeq + index + 1,
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
  window.history.replaceState({}, '', '/organiser/inventory')
  return { fetchMock, view: render(<App />) }
}

test('empty state offers only the first step, no stats strip', async () => {
  open()
  expect(await screen.findByText('Noch keine Unterkunft angelegt')).toBeTruthy()
  expect(screen.queryByText('Schlafplätze')).toBeNull()
  expect(screen.queryByText('Gebäude')).toBeNull()
})

test('adding a building, then a room with a duplicate number, is rejected', async () => {
  open()
  await screen.findByText('Noch keine Unterkunft angelegt')
  fireEvent.change(screen.getByLabelText('Name des Gebäudes'), {
    target: { value: 'Haupthaus' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Gebäude anlegen' }))

  expect(await screen.findByRole('heading', { name: 'Haupthaus' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: '+ Zimmer hinzufügen' }))
  fireEvent.click(screen.getByRole('button', { name: 'Zimmer anlegen' }))
  expect(await screen.findByText('Gib eine Nummer oder einen Namen ein.')).toBeTruthy()

  fireEvent.change(screen.getByLabelText('Nummer oder Name'), { target: { value: '101' } })
  fireEvent.change(screen.getByLabelText('Bad'), { target: { value: 'private' } })
  fireEvent.change(screen.getByLabelText('Preis pro Schlafplatz'), { target: { value: '20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Zimmer anlegen' }))

  const roomButton = await screen.findByRole('button', { name: /101/ })
  expect(roomButton).toBeTruthy()

  // Room 101 auto-opens; its detail row is visible with the bed-add form.
  expect(await screen.findByText(/Noch keine Betten/)).toBeTruthy()

  // A second room with the same number in the same building is rejected.
  fireEvent.click(screen.getByRole('button', { name: '+ Zimmer hinzufügen' }))
  fireEvent.change(screen.getByLabelText('Nummer oder Name'), { target: { value: '101' } })
  fireEvent.change(screen.getByLabelText('Bad'), { target: { value: 'private' } })
  fireEvent.change(screen.getByLabelText('Preis pro Schlafplatz'), { target: { value: '20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Zimmer anlegen' }))
  expect(await screen.findByText('In Haupthaus gibt es schon ein Zimmer 101.')).toBeTruthy()
}, 20000)

test('apartment rooms group added beds by Schlafraum, with a "+ Neuer Schlafraum" control', async () => {
  const buildingEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Gartenhaus', sort_key: 1 },
  }
  const roomEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_1',
      building_id: 'bld_1',
      number: '35',
      floor: null,
      room_type: 'apartment',
      sort_key: 1,
    },
  }
  open([buildingEvent, roomEvent])

  fireEvent.click(await screen.findByRole('button', { name: /35/ }))
  // First bed: no Schlafraum exists yet, defaults to "Schlafraum 1".
  fireEvent.click(screen.getByRole('button', { name: 'Bett hinzufügen' }))
  expect(await screen.findByRole('heading', { name: 'Schlafraum 1' })).toBeTruthy()

  // Second bed: create a new Schlafraum via "+ Neuer Schlafraum".
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Schlafraum' })).getByRole('button', {
      name: '+ Neuer Schlafraum',
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Bett hinzufügen' }))
  expect(await screen.findByRole('heading', { name: 'Schlafraum 2' })).toBeTruthy()
}, 20000)

test('adding a bunk bed shows the age hint and the Oben/Unten slots, and updates the Keine-Betten badge', async () => {
  const buildingEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Haupthaus', sort_key: 1 },
  }
  const roomEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_1',
      building_id: 'bld_1',
      number: '101',
      floor: null,
      room_type: 'standard',
      sort_key: 1,
    },
  }
  const bathLabel: Event = {
    seq: 3,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'LabelSet',
    payload: { entity_id: 'rm_1', key: 'sanitary', value: 'private', strength: null, note: null },
  }
  const priceLabel: Event = {
    seq: 4,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'LabelSet',
    payload: {
      entity_id: 'rm_1',
      key: 'price-per-bed-eur',
      value: 20,
      strength: null,
      note: null,
    },
  }
  open([buildingEvent, roomEvent, bathLabel, priceLabel])

  expect(await screen.findByText('Keine Betten')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: /101/ }))
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Bettart' })).getByRole('button', {
      name: 'Etagenbett',
    }),
  )
  // D35: the "Oben erst ab 6 Jahren" age hint is deliberately not shown —
  // no assignment logic exists yet to act on it.
  expect(screen.queryByText(/Oben erst ab 6 Jahren/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Bett hinzufügen' }))

  expect(await screen.findByText('Oben')).toBeTruthy()
  expect(screen.getByText('Unten')).toBeTruthy()
  expect(screen.queryByText('Keine Betten')).toBeNull()
}, 20000)

test('room rows carry mobile field labels (visible only under the max-md breakpoint)', async () => {
  const buildingEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Haupthaus', sort_key: 1 },
  }
  const roomEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_1',
      building_id: 'bld_1',
      number: '101',
      floor: 'ground',
      room_type: 'standard',
      sort_key: 1,
    },
  }
  open([buildingEvent, roomEvent])

  await screen.findByRole('button', { name: /101/ })
  for (const label of ['Etage:', 'Typ:', 'Bad:', 'Betten:', 'Plätze:', 'Preis/Platz:'])
    expect(screen.getByText(label)).toBeTruthy()
}, 20000)

test('a building with rooms explains inline why it cannot be removed, instead of a disabled button', async () => {
  const buildingEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Haupthaus', sort_key: 1 },
  }
  const roomEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_1',
      building_id: 'bld_1',
      number: '101',
      floor: null,
      room_type: 'standard',
      sort_key: 1,
    },
  }
  open([buildingEvent, roomEvent])

  fireEvent.click(await screen.findByText('Gebäude bearbeiten'))
  const removeButton = screen.getByRole('button', { name: 'Gebäude entfernen' })
  expect(removeButton.hasAttribute('disabled')).toBe(false)
  fireEvent.click(removeButton)
  expect(
    await screen.findByText(
      'Ein Gebäude mit Zimmern kann nicht entfernt werden. Entferne zuerst die Zimmer.',
    ),
  ).toBeTruthy()
}, 20000)

test('deleting an empty building asks for confirmation via the AlertDialog', async () => {
  const buildingEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Haupthaus', sort_key: 1 },
  }
  open([buildingEvent])

  fireEvent.click(await screen.findByText('Gebäude bearbeiten'))
  fireEvent.click(screen.getByRole('button', { name: 'Gebäude entfernen' }))

  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('Gebäude Haupthaus entfernen?')).toBeTruthy()
  expect(within(dialog).getByRole('button', { name: 'Behalten' })).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Ja, entfernen' }))
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(await screen.findByText('Noch keine Unterkunft angelegt')).toBeTruthy()
}, 20000)

test('deleting a room with beds asks for confirmation and names the bed count', async () => {
  const buildingEvent: Event = {
    seq: 1,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BuildingAdded',
    payload: { building_id: 'bld_1', name: 'Haupthaus', sort_key: 1 },
  }
  const roomEvent: Event = {
    seq: 2,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'RoomAdded',
    payload: {
      room_id: 'rm_1',
      building_id: 'bld_1',
      number: '101',
      floor: null,
      room_type: 'standard',
      sort_key: 1,
    },
  }
  const bedEvent: Event = {
    seq: 3,
    at: '2027-01-01T00:00:00Z',
    actor: 'organiser@example.test',
    subject: null,
    type: 'BedAdded',
    payload: {
      bed_id: 'bed_1',
      room_id: 'rm_1',
      label: '',
      bed_type: 'single',
      sleeps: 1,
      sort_key: 1,
    },
  }
  const { view } = open([buildingEvent, roomEvent, bedEvent])

  fireEvent.click(await screen.findByRole('button', { name: /101/ }))
  const detail = within(view.container.querySelector('#betten-rm_1') as HTMLElement)
  fireEvent.click(detail.getByRole('button', { name: 'Zimmer entfernen' }))
  // The confirmation dialog renders in a portal, outside the detail row.
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('Zimmer 101 entfernen?')).toBeTruthy()
  expect(within(dialog).getByText('Die 1 Betten darin werden auch entfernt.')).toBeTruthy()
  expect(within(dialog).getByRole('button', { name: 'Behalten' })).toBeTruthy()
  expect(within(dialog).getByRole('button', { name: 'Ja, entfernen' })).toBeTruthy()
}, 20000)
