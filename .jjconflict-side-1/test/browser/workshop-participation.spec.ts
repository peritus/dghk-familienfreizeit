import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { activeProfile } from '../../src/config/index.js'
import { loadKdl } from '../../src/events/kdl.js'
import { organiserRouteDefinitions } from '../../src/organiser/routes.js'

const fixture = readFileSync(
  new URL('../fixtures/workshop-assignment/prototype-dataset.kdl', import.meta.url),
  'utf-8',
)
const events = loadKdl(fixture, activeProfile.validation_view)

test.beforeEach(async ({ page }) => {
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
        events,
        head_seq: events.length,
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
})

test('participation switches between the detailed table, narrow cards, and landscape print', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/organiser/workshops/participation')
  await expect(page.getByRole('heading', { name: 'Personen' })).toBeVisible()
  await expect(page.locator('.workshop-participation__wide')).toBeVisible()
  await expect(page.locator('.workshop-participation__table tbody tr').first()).toBeVisible()
  await page.screenshot({ path: '/tmp/dghk-participation-desktop.png' })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.workshop-participation__narrow')).toBeVisible()
  await expect(page.locator('.workshop-participation__wide')).toBeHidden()
  await expect(page.locator('.workshop-participation__card').first()).toBeVisible()
  await page.screenshot({ path: '/tmp/dghk-participation-mobile.png' })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.workshop-participation__wide')).toBeVisible()
  await expect(page.locator('.workshop-participation__narrow')).toBeHidden()
  expect(
    await page
      .locator('.workshop-participation__print-stamp')
      .evaluate((element) => getComputedStyle(element).position),
  ).toBe('fixed')
  expect(
    await page
      .locator('.workshop-participation__table tfoot td')
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe('table-cell')
  await page.screenshot({ path: '/tmp/dghk-participation-print.png' })
  const pdf = await page.pdf({
    path: '/tmp/dghk-participation-print.pdf',
    format: 'A4',
    landscape: true,
    printBackground: true,
  })
  expect(pdf.byteLength).toBeGreaterThan(10_000)
  const printedPages =
    Buffer.from(pdf)
      .toString('latin1')
      .match(/\/Type\s*\/Page\b/gu) ?? []
  expect(printedPages.length).toBeGreaterThan(1)
})
