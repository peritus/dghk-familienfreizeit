import { expect, test, type Page } from '@playwright/test'
import { isKnownOrganiserPath, organiserRouteDefinitions } from '../../src/organiser/routes.js'

const familyId = 'fam_6b4b44137d724c1e'
const familyRoute = '/organiser/families/6b4b44137d724c1e'

const familyEvent = {
  seq: 1,
  at: '2027-01-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: null,
  type: 'FamilyInvited',
  payload: {
    family_id: familyId,
    email: 'foo@example.com',
    display_name: 'Foo Familie',
    locale: 'de',
  },
}

async function mockOrganiserApi(page: Page): Promise<void> {
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        principal: { kind: 'organiser', email: 'organiser@example.test' },
      }),
    }),
  )
  await page.route('**/api/organiser/log', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [familyEvent],
        head_seq: 1,
        build_revision: 'development',
        compatibility_revision: 1,
        screen_registry: organiserRouteDefinitions.map(({ id, absolute_path: route, label }) => ({
          id,
          route,
          label,
          audience: 'organiser',
          host: 'kernel',
        })),
      }),
    }),
  )
}

test.beforeEach(async ({ page }) => {
  await mockOrganiserApi(page)
})

test('direct navigation reaches every implemented organiser route', async ({ page }) => {
  for (const route of organiserRouteDefinitions) {
    await page.goto(route.test_path)
    await expect(page.getByRole('heading', { name: 'Diese Seite gibt es nicht' })).toHaveCount(0)
    await expect(page.locator('main')).toBeVisible()
  }
})

test('dashboard, families, and family detail form one working navigation chain', async ({
  page,
}) => {
  await page.goto('/organiser')
  await expect(page).toHaveURL(/\/organiser$/)
  await expect(
    page.getByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
  ).toBeVisible()

  const dashboardFamiliesLink = page.getByRole('link', { name: /Alle Familien ansehen/ })
  await expect(dashboardFamiliesLink).toHaveAttribute('href', '/organiser/families')
  await dashboardFamiliesLink.click()
  await expect(page).toHaveURL(/\/organiser\/families$/)

  const familyLink = page.getByRole('link', { name: 'Foo Familie' })
  await expect(familyLink).toHaveAttribute('href', familyRoute)
  await familyLink.click()
  await expect(page).toHaveURL(new RegExp(`${familyRoute}$`))
  await expect(page.getByRole('heading', { name: 'Foo Familie' })).toBeVisible()

  await page.getByRole('link', { name: '← Familien' }).click()
  await expect(page).toHaveURL(/\/organiser\/families$/)
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`${familyRoute}$`))
  await page.goForward()
  await expect(page).toHaveURL(/\/organiser\/families$/)
})

test('module navigation reaches canonical public URLs without duplicating the base', async ({
  page,
}) => {
  await page.goto('/organiser')
  const boardLink = page.getByRole('link', { name: 'Belegung' })
  await expect(boardLink).toHaveAttribute('href', '/organiser/accommodation/assignment')
  await boardLink.click()
  await expect(page).toHaveURL(/\/organiser\/accommodation\/assignment$/)
  await expect(page.getByRole('heading', { name: 'Wer schläft wo?' })).toBeVisible()
})

test('accommodation parent redirects to inventory and workshop spaces links to slots', async ({
  page,
}) => {
  await page.goto('/organiser/accommodation')
  await expect(page).toHaveURL(/\/organiser\/accommodation\/inventory$/)
  await expect(page.getByRole('heading', { name: 'Unterkunft' })).toBeVisible()

  await page.goto('/organiser/workshops/spaces')
  await expect(page.getByRole('heading', { name: 'Räume und Slots' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Slots verwalten' })).toHaveAttribute(
    'href',
    '/organiser/workshops/slots',
  )
})

test('rendered organiser links are canonical and never duplicate the route base', async ({
  page,
}) => {
  const paths = organiserRouteDefinitions.map(({ test_path }) => test_path)
  for (const path of paths) {
    await page.goto(path)
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => href?.startsWith('/organiser') ?? false),
      )
    for (const href of hrefs) {
      expect(isKnownOrganiserPath(href)).toBe(true)
      expect(href).not.toContain('/organiser/organiser')
      expect(href).not.toContain('@')
    }
  }
})

test('invalid organiser paths use the recoverable not-found state', async ({ page }) => {
  await page.goto('/organiser/organiser/families')
  await expect(page.getByRole('heading', { name: 'Diese Seite gibt es nicht' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zur Startseite' })).toHaveAttribute('href', '/')
})
