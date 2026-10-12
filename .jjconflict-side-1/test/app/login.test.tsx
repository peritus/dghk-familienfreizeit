import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Router, Route, Switch } from 'wouter'
import { memoryLocation } from 'wouter/memory-location'
import { Login } from '../../src/app/auth/login.js'
import { activeProfilePresentation } from '../../src/app/active-profile.js'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
function open(fetchMock: ReturnType<typeof vi.fn>, locale = 'de') {
  vi.stubGlobal('fetch', fetchMock)
  const location = memoryLocation({ path: '/login', record: true })
  const view = render(
    <Router hook={location.hook}>
      <Switch>
        <Route path="/login">
          <Login
            profile={{
              ...activeProfilePresentation,
              meta: { ...activeProfilePresentation.meta, locale },
            }}
          />
        </Route>
        <Route path="/family">
          <p>Family destination</p>
        </Route>
        <Route path="/organiser">
          <p>Organiser destination</p>
        </Route>
      </Switch>
    </Router>,
  )
  return { ...view, location }
}
test.each(['family', 'organiser'])(
  'a sole %s role enters its destination without rendering choices',
  async (role) => {
    open(vi.fn(async () => json({ principal: { roles: [role] } })))
    expect(
      await screen.findByText(role === 'family' ? 'Family destination' : 'Organiser destination'),
    ).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Anmeldung auswählen' })).toBeNull()
  },
)
test('both roles get normal navigation links during login', async () => {
  open(vi.fn(async () => json({ principal: { roles: ['family', 'organiser'] } })))
  await screen.findByRole('heading', { name: 'Wie möchtest du dich anmelden?' })
  const family = screen.getByRole('link', { name: 'Als Familie anmelden' })
  expect(family.getAttribute('href')).toBe('/family')
  expect(screen.getByRole('link', { name: 'Als Organisator anmelden' }).getAttribute('href')).toBe(
    '/organiser',
  )
  expect(family.className).toBe(
    screen.getByRole('link', { name: 'Als Organisator anmelden' }).className,
  )
  fireEvent.click(family)
  expect(await screen.findByText('Family destination')).toBeTruthy()
})
test('unknown or duplicate roles never create extra choices', async () => {
  open(vi.fn(async () => json({ principal: { roles: ['family', 'family', 'unknown'] } })))
  await screen.findByText('Family destination')
  expect(screen.queryByRole('navigation')).toBeNull()
})
test('a missing membership shows the sign-in form', async () => {
  open(vi.fn(async () => json({ principal: { roles: [] } })))
  expect(await screen.findByLabelText('E-Mail-Adresse')).toBeTruthy()
  expect(screen.queryByRole('navigation')).toBeNull()
})
test('identity failures offer an explicit retry and hide exception details', async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('private failure'))
    .mockResolvedValue(json({}, 401))
  open(fetchMock)
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Dein Zugang konnte nicht geladen werden. Bitte versuche es erneut.',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
  await screen.findByLabelText('E-Mail-Adresse')
  expect(document.body.textContent).not.toContain('private failure')
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
test('leaving login aborts its identity read', async () => {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise(() => {}))
  const view = open(fetchMock)
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  const signal = (fetchMock.mock.calls[0]![1] as RequestInit).signal!
  view.unmount()
  expect(signal.aborted).toBe(true)
})

test('English login choices use the approved role wording', async () => {
  open(
    vi.fn(async () => json({ principal: { roles: ['family', 'organiser'] } })),
    'en',
  )
  await screen.findByRole('heading', { name: 'How would you like to sign in?' })
  expect(screen.getByRole('navigation', { name: 'Choose how to sign in' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Sign in as a family' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Sign in as an organiser' })).toBeTruthy()
  expect(document.body.textContent).not.toMatch(/\bapps?\b/i)
})
test('the English email form and demo link describe shared access', async () => {
  open(
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST' ? json({ magic_link: '/auth/example/' }) : json({}, 401),
    ),
    'en',
  )
  fireEvent.change(await screen.findByLabelText('Email address'), {
    target: { value: 'a@example.test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Request magic link' }))
  expect(await screen.findByText('Follow the link to sign in.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy()
  expect(document.body.textContent).not.toMatch(/as an organiser|\bapps?\b/i)
})
