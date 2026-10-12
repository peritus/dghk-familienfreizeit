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
        principal: { roles: ['organiser'], email: 'organiser@example.test' },
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
        feature_overrides: [],
      }),
    }),
  )
}

test.beforeEach(async ({ page }) => {
  await mockOrganiserApi(page)
})

test('direct navigation reaches every implemented organiser route', async ({ page }) => {
  test.setTimeout(60_000)
  for (const route of organiserRouteDefinitions) {
    await page.goto(route.test_path)
    await expect(page.getByRole('heading', { name: 'Diese Seite gibt es nicht' })).toHaveCount(0)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('[data-slot="screen-layout"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.locator('[data-slot="application-frame"]')).toHaveCount(1)
  }
}, 60_000)

for (const route of organiserRouteDefinitions) {
  test(`screen and print contract: ${route.id}`, async ({ page }) => {
    await page.emulateMedia({ media: 'screen' })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(route.test_path)
    await expect(page.locator('[data-slot="application-bar"]')).toContainText('Organisationsteam', {
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: 'Ansicht laden' })).toHaveCount(0)
    const main = page.locator('main')
    const box = await main.boundingBox()
    expect(box!.width, route.test_path).toBe(1024)
    const order = await page.locator('[data-slot="screen-layout"]').evaluate((screen) =>
      Array.from(screen.children)
        .map((child) => child.getAttribute('data-slot'))
        .filter((slot) => slot && slot !== 'print-context'),
    )
    const expected = [
      'screen-secondary-navigation',
      'screen-header',
      'screen-notices',
      'screen-status',
      'screen-tertiary-navigation',
      'screen-content',
      'screen-footer',
    ]
    expect(order, route.test_path).toEqual(expected.filter((slot) => order.includes(slot)))
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      route.test_path,
    ).toBeLessThanOrEqual(391)
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    await expect(page.locator('[data-slot="application-bar"]')).toBeHidden()
    const visibleFooters = await page
      .locator('[data-slot="print-footer"]')
      .evaluateAll(
        (footers) => footers.filter((footer) => footer.getBoundingClientRect().height > 0).length,
      )
    expect(visibleFooters, route.test_path).toBe(1)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    for (const action of await page.locator('[data-slot="button"]').all())
      await expect(action).toBeHidden()
  })
}

test('public, login, and unknown screens print through the shared frame', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ status: 401, json: {} }))
  for (const route of ['/', '/login', '/unknown-screen']) {
    await page.emulateMedia({ media: 'screen' })
    await page.goto(route)
    await expect(page.getByRole('heading', { name: 'Ansicht laden' })).toHaveCount(0)
    if (route !== '/') await expect(page.locator('[data-slot="screen-layout"]')).toHaveCount(1)
    await expect(page.locator('[data-slot="application-frame"]')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    await expect(page.locator('[data-slot="print-identity"]')).toBeVisible()
    await expect(page.locator('[data-slot="print-footer"]')).toBeVisible()
    await expect(page.locator('[data-slot="application-bar"]')).toBeHidden()
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

  await page.getByRole('link', { name: 'Familien', exact: true }).click()
  await expect(page).toHaveURL(/\/organiser\/families$/)
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`${familyRoute}$`))
  await page.goForward()
  await expect(page).toHaveURL(/\/organiser\/families$/)
})

test('module navigation reaches canonical public URLs without duplicating the base', async ({
  page,
}) => {
  await page.goto('/organiser/accommodation/inventory')
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
  await expect(page.getByRole('heading', { name: 'Unterkunft', exact: true })).toBeVisible()

  await page.goto('/organiser/workshops/spaces')
  await expect(page.getByRole('heading', { name: 'Räume und Slots' })).toBeVisible()
  await page.getByRole('link', { name: 'Slots', exact: true }).click()
  await expect(page).toHaveURL(/\/organiser\/workshops\/slots$/)
})

test('rendered organiser links are canonical and never duplicate the route base', async ({
  page,
}) => {
  test.setTimeout(60_000)
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
