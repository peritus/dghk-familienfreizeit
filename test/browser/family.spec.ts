import { expect, test } from '@playwright/test'
import type { FamilyRepresentation } from '../../src/family-detail/model.js'

const initial: FamilyRepresentation = {
  data: {
    family: { id: 'fam_linde', display_name: 'Linde', email: 'linde@example.test' },
    people: [{ id: 'per_ada', given_name: 'Ada', family_name: 'Linde', role: 'child', age: 9 }],
    sections: [
      {
        key: 'room-wishes',
        title: 'Zimmerwünsche',
        intro: null,
        notice: null,
        visible: true,
        writable: true,
      },
      { key: 'food', title: 'Essen', intro: null, notice: null, visible: true, writable: true },
    ],
    preferences: {
      fam_linde: {
        'family-note': {
          key: 'family-note',
          section_key: 'room-wishes',
          target_id: 'fam_linde',
          title: 'Sonst noch etwas?',
          help: 'Freitext — das Organisationsteam liest mit.',
          kind: 'free-text',
          invert: false,
          strengths: [],
          options: [],
          answer: { values: [], answered: false },
          disabled: false,
          disabled_reason: null,
        },
      },
      per_ada: {
        diet: {
          key: 'diet',
          section_key: 'food',
          target_id: 'per_ada',
          title: 'Was isst die Person?',
          help: null,
          kind: 'choice',
          invert: false,
          strengths: [],
          options: [
            { value: 'vegetarian', label: 'Vegetarisch' },
            { value: 'vegan', label: 'Vegan' },
          ],
          answer: { values: [], answered: false },
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
    '/api/family/people/per_ada/preferences/diet': '"diet-1"',
    '/api/family/preferences/family-note': '"note-1"',
  },
}

test('login role choices, REST edits, shared header, phone layout and browser print', async ({
  page,
}) => {
  let current = structuredClone(initial)
  const requests: { path: string; method: string; etag: string | undefined; body: unknown }[] = []
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        principal: {
          email: 'linde@example.test',
          roles: ['family', 'organiser'],
          family_id: 'fam_linde',
        },
      },
    }),
  )
  await page.route('**/api/family**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      await route.fulfill({ json: current })
      return
    }
    requests.push({
      path,
      method: request.method(),
      etag: request.headers()['if-match'],
      body: request.postDataJSON(),
    })
    if (path.endsWith('/diet'))
      current.data.preferences.per_ada!.diet!.answer = request.postDataJSON()
    else
      current = {
        ...current,
        data: {
          ...current.data,
          family: { ...current.data.family, display_name: request.postDataJSON().display_name },
        },
      }
    await route.fulfill({ json: {} })
  })
  const forbidden: string[] = []
  page.on('request', (request) => {
    if (/\/api\/(organiser|events)/.test(request.url())) forbidden.push(request.url())
  })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Wie möchtest du dich anmelden?' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Als Organisator anmelden' })).toHaveAttribute(
    'href',
    '/organiser',
  )
  await page.getByRole('link', { name: 'Als Familie anmelden' }).click()
  await expect(page.getByRole('heading', { name: 'Linde', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Wie möchtest du dich anmelden?' })).toBeVisible()
  await page.getByRole('link', { name: 'Als Familie anmelden' }).click()
  await page.getByRole('button', { name: 'Familie bearbeiten' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('E-Mail', { exact: true })).toHaveCount(0)
  await dialog.getByLabel('Familienname', { exact: true }).fill('Eiche')
  await dialog.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Eiche', exact: true })).toBeVisible()
  await expect(page.locator('[data-slot="application-bar"]')).toContainText(
    'DGHK Berlin-Brandenburg · Familie Eiche',
  )
  await expect(page.getByRole('link', { name: 'Familienfreizeit Lübben 2027' })).toHaveAttribute(
    'href',
    '/',
  )
  expect(await page.locator('body').innerText()).not.toMatch(/\bapps?\b/i)
  await page.getByRole('link', { name: 'Essen', exact: true }).click()
  await expect(page).toHaveURL(/\/family\/essen\/per_ada$/)
  await page.getByRole('radio', { name: 'Vegan', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Vegan', exact: true })).toBeChecked()
  expect(requests).toEqual([
    { path: '/api/family', method: 'PATCH', etag: '"family-1"', body: { display_name: 'Eiche' } },
    {
      path: '/api/family/people/per_ada/preferences/diet',
      method: 'PUT',
      etag: '"diet-1"',
      body: { values: [{ value: 'vegan', strength: null }], answered: true },
    },
  ])
  await page.getByRole('link', { name: 'Personen', exact: true }).click()
  await expect(page.getByLabel('Vorname', { exact: true })).toHaveValue('Ada')
  await expect(page.getByRole('button', { name: 'Person entfernen' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Speicheroptionen|Details anzeigen/ })).toHaveCount(
    0,
  )
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width + 1,
    )
    await expect(page.locator('[data-slot="application-frame"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  }
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('[data-slot="application-bar"]')).toBeHidden()
  await expect(page.locator('[data-slot="print-footer"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Speichern', exact: true })).toBeHidden()
  expect(forbidden).toEqual([])
})
