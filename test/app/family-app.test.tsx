import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from '../../src/app/app.js'
import { activeProfilePresentation } from '../../src/app/active-profile.js'
import type { FamilyRepresentation } from '../../src/app/family/api.js'
const fixture: FamilyRepresentation = {
  data: {
    family: { id: 'fam_a', display_name: 'Linde', email: 'a@example.test' },
    people: [{ id: 'per_a', given_name: 'Ada', family_name: 'Linde', role: 'child', age: 9 }],
    sections: [
      {
        key: 'people',
        title: 'Personen',
        intro: null,
        notice: null,
        visible: true,
        writable: true,
      },
      { key: 'food', title: 'Essen', intro: null, notice: null, visible: true, writable: true },
    ],
    preferences: {
      per_a: {
        diet: {
          key: 'diet',
          section_key: 'food',
          target_id: 'per_a',
          title: 'Was isst die Person?',
          help: null,
          kind: 'choice',
          invert: false,
          strengths: [],
          options: [
            { value: 'vegetarian', label: 'Vegetarisch' },
            { value: 'vegan', label: 'Vegan' },
          ],
          answer: { values: [{ value: 'vegetarian', strength: null }], answered: true },
          disabled: false,
          disabled_reason: null,
        },
      },
    },
    workshops: [],
    max_rank: 3,
    rankings: {},
    signups: {},
    interests: {},
    can_edit_email: false,
    can_remove_person: false,
  },
  resource_etags: {
    '/api/family': '"family-1"',
    '/api/family/people/per_a': '"person-1"',
    '/api/family/people/per_a/preferences/diet': '"diet-1"',
  },
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function open(path: string, fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock)
  window.history.replaceState({}, '', path)
  return render(<App profile={activeProfilePresentation} />)
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
test('both memberships are offered during shared login', async () => {
  open(
    '/login',
    vi.fn(async () =>
      json({
        principal: { email: 'a@example.test', roles: ['family', 'organiser'], family_id: 'fam_a' },
      }),
    ),
  )
  expect(
    await screen.findByRole('heading', { name: 'Wie möchtest du dich anmelden?' }),
  ).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Als Familie anmelden' }).getAttribute('href')).toBe(
    '/family',
  )
  expect(screen.getByRole('link', { name: 'Als Organisator anmelden' }).getAttribute('href')).toBe(
    '/organiser',
  )
})
test('one membership enters the family app and shares all four topic links', async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
    String(input) === '/api/me' ? json({ principal: { roles: ['family'] } }) : json(fixture),
  )
  open('/login', fetchMock)
  expect(await screen.findByRole('heading', { name: 'Linde' })).toBeTruthy()
  for (const title of ['Zimmer', 'Personen', 'Essen', 'Workshops'])
    expect(screen.getByRole('link', { name: title })).toBeTruthy()
  expect(
    screen.queryByRole('button', { name: /Speicheroptionen|Entwürfe|Person entfernen/ }),
  ).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: 'Personen' }))
  expect(await screen.findByLabelText('Vorname')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Person entfernen' })).toBeNull()
  expect(
    fetchMock.mock.calls.filter(
      ([input]) => String(input).startsWith('/api/organiser') || String(input) === '/api/events',
    ),
  ).toHaveLength(0)
})
test('family edits use REST with the displayed resource ETag and reload committed data', async () => {
  let current = structuredClone(fixture)
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      current = {
        ...current,
        data: { ...current.data, family: { ...current.data.family, display_name: 'Eiche' } },
      }
      return json({})
    }
    expect(String(input)).toBe('/api/family')
    return json(current)
  })
  open('/family', fetchMock)
  await screen.findByRole('heading', { name: 'Linde' })
  fireEvent.click(screen.getByRole('button', { name: 'Familie bearbeiten' }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.queryByLabelText('E-Mail')).toBeNull()
  fireEvent.change(dialog.getByLabelText('Familienname'), { target: { value: 'Eiche' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Änderungen speichern' }))
  expect(await screen.findByRole('heading', { name: 'Eiche' })).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/family',
    expect.objectContaining({
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'If-Match': '"family-1"' },
      body: JSON.stringify({ display_name: 'Eiche' }),
    }),
  )
})
test('stale preference edits show an error and refresh without silently retrying', async () => {
  let writes = 0
  const changed = structuredClone(fixture)
  changed.data.preferences.per_a!.diet!.answer = {
    values: [{ value: 'vegan', strength: null }],
    answered: true,
  }
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      writes++
      return json(
        { error: 'resource_changed', message: 'Die Angaben wurden inzwischen geändert.' },
        412,
      )
    }
    return json(writes ? changed : fixture)
  })
  open('/family/essen/per_a', fetchMock)
  await screen.findByRole('radio', { name: 'Vegan' })
  fireEvent.click(screen.getByRole('radio', { name: 'Vegan' }))
  await waitFor(() =>
    expect(
      screen
        .getAllByRole('alert')
        .some((item) => item.textContent?.includes('inzwischen geändert')),
    ).toBe(true),
  )
  expect(writes).toBe(1)
  expect((screen.getByRole('radio', { name: 'Vegan' }) as HTMLInputElement).checked).toBe(true)
})
test('an expired family session reaches the same login screen', async () => {
  open(
    '/family',
    vi.fn(async () => json({ error: 'unauthorized' }, 401)),
  )
  expect(await screen.findByRole('heading', { name: 'Anmelden' })).toBeTruthy()
  expect(window.location.pathname).toBe('/login')
})

test('a stale person edit refreshes the form before an explicit new submission', async () => {
  let writes = 0
  const changed = structuredClone(fixture)
  changed.data.people[0]!.given_name = 'Remote'
  changed.resource_etags = {
    ...changed.resource_etags,
    '/api/family/people/per_a': '"person-2"',
  }
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      writes++
      if (writes === 1)
        return json(
          { error: 'resource_changed', message: 'Die Angaben wurden inzwischen geändert.' },
          412,
        )
      expect(init.headers).toMatchObject({ 'If-Match': '"person-2"' })
      expect(JSON.parse(String(init.body))).toMatchObject({ given_name: 'Final' })
      changed.data.people[0]!.given_name = 'Final'
      return json({})
    }
    return json(writes ? changed : fixture)
  })
  open('/family/personen/per_a', fetchMock)
  fireEvent.change(await screen.findByLabelText('Vorname'), { target: { value: 'Local' } })
  fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
  await waitFor(() =>
    expect((screen.getByLabelText('Vorname') as HTMLInputElement).value).toBe('Remote'),
  )
  expect(writes).toBe(1)
  expect(screen.getByRole('alert').textContent).toContain('inzwischen geändert')
  fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Final' } })
  fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
  await waitFor(() => expect(writes).toBe(2))
})

test('a stale family edit reveals the current committed name before reopening the form', async () => {
  let writes = 0
  const changed = structuredClone(fixture)
  changed.data.family.display_name = 'Remote family'
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      writes++
      return json(
        { error: 'resource_changed', message: 'Die Angaben wurden inzwischen geändert.' },
        412,
      )
    }
    return json(writes ? changed : fixture)
  })
  open('/family', fetchMock)
  await screen.findByRole('heading', { name: 'Linde' })
  fireEvent.click(screen.getByRole('button', { name: 'Familie bearbeiten' }))
  fireEvent.change(screen.getByLabelText('Familienname'), { target: { value: 'Local family' } })
  fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }))
  await screen.findByRole('heading', { name: 'Remote family' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(writes).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: 'Familie bearbeiten' }))
  expect((screen.getByLabelText('Familienname') as HTMLInputElement).value).toBe('Remote family')
})

test('person tabs support arrow navigation and keep focus on the selected person', async () => {
  const data = structuredClone(fixture)
  data.data.people = [
    ...data.data.people,
    { id: 'per_second', given_name: 'Bo', family_name: 'Linde', role: 'adult', age: null },
  ]
  open(
    '/family/essen/per_a',
    vi.fn(async () => json(data)),
  )
  const first = await screen.findByRole('tab', { name: /Ada Linde/ })
  const second = screen.getByRole('tab', { name: /Bo Linde/ })
  first.focus()
  fireEvent.keyDown(first, { key: 'ArrowDown' })
  await waitFor(() => expect(second.getAttribute('aria-selected')).toBe('true'))
  expect(document.activeElement).toBe(second)
  expect(window.location.pathname).toBe('/family/essen/per_second')
  fireEvent.keyDown(second, { key: 'Home' })
  await waitFor(() => expect(first.getAttribute('aria-selected')).toBe('true'))
  expect(document.activeElement).toBe(first)
})
