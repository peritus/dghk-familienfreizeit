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
        feature_overrides: [],
      }),
    }),
  )
})

test('participation switches between the detailed table, narrow cards, and landscape print', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/organiser/workshops/participation')
  await expect(page.getByRole('heading', { name: 'Teilnahme' })).toBeVisible()
  const participationViews = page.getByRole('tablist', { name: 'Teilnahmeansichten' })
  await expect(participationViews.getByRole('tab', { name: 'Personen' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(participationViews.getByRole('tab', { name: 'Programm' })).toHaveAttribute(
    'aria-selected',
    'false',
  )
  await expect(page.getByText('Wer nimmt woran teil, und wer leitet?')).toHaveCount(0)
  await expect(
    page.getByText('Ein Name zeigt, was aus den Wünschen der Person geworden ist.'),
  ).toHaveCount(0)
  await expect(page.locator('.workshop-participation__wide')).toBeVisible()
  await expect(page.locator('.workshop-participation__table tbody tr').first()).toBeVisible()
  await expect(page.locator('.workshop-participation__table thead')).toHaveCSS(
    'display',
    'table-header-group',
  )
  const headerText = await page.locator('.workshop-participation__table thead').innerText()
  expect(headerText).not.toMatch(/Rangfolge|Workshops/u)
  await expect(page.locator('.workshop-participation__legend')).toContainText('keine Zuordnung')
  await expect(page.locator('.workshop-participation__legend')).not.toContainText('Offen')
  await expect(page.locator('.workshop-participation__table')).not.toContainText('Offen')
  await expect(page.locator('.workshop-participation__table')).not.toContainText(/Keine Antwort/u)
  await expect(
    page.locator('.workshop-participation__table .workshop-participation__slot-cell--open'),
  ).toHaveCount(0)
  await expect(page.locator('.workshop-participation__table tbody tr.is-open')).toHaveCount(0)
  const slotWidths = await page
    .locator('.workshop-participation__table tbody tr')
    .first()
    .locator('.workshop-participation__slot-cell')
    .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width))
  expect(Math.max(...slotWidths) - Math.min(...slotWidths)).toBeLessThanOrEqual(1)
  const leaderCell = page
    .locator('.workshop-participation__slot-cell--leader')
    .filter({ hasText: 'Leitet Waldexpedition' })
    .first()
  await expect(leaderCell).toContainText('Leitet Waldexpedition')
  await expect(leaderCell).toHaveCSS('background-image', 'none')
  const freeMark = page
    .locator('.workshop-participation__slot-cell--free [aria-hidden="true"]')
    .first()
  await expect(freeMark).toHaveText('-')
  await page.screenshot({ path: '/tmp/dghk-participation-desktop.png' })

  await participationViews.getByRole('tab', { name: 'Programm' }).click()
  await expect(page).toHaveURL(/\/organiser\/workshops\/programme$/u)
  await expect(
    page.getByRole('navigation', { name: 'Workshopbereiche' }).getByRole('link', {
      name: 'Teilnahme',
    }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(participationViews.getByRole('tab', { name: 'Programm' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await participationViews.getByRole('tab', { name: 'Personen' }).click()
  await expect(page).toHaveURL(/\/organiser\/workshops\/participation$/u)
  await expect(participationViews.getByRole('tab', { name: 'Personen' })).toHaveAttribute(
    'aria-selected',
    'true',
  )

  const lightBackground = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  await page.emulateMedia({ colorScheme: 'dark' })
  const darkBackground = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(darkBackground).not.toBe(lightBackground)
  await page.screenshot({ path: '/tmp/dghk-participation-dark.png' })
  await page.emulateMedia({ colorScheme: 'light' })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.workshop-participation__narrow')).toBeVisible()
  await expect(page.locator('.workshop-participation__wide')).toBeHidden()
  await expect(page.locator('.workshop-participation__card').first()).toBeVisible()
  await expect(page.locator('.workshop-participation__narrow')).not.toContainText('Offen')
  await expect(page.locator('.workshop-participation__narrow')).not.toContainText(/Keine Antwort/u)
  await expect(page.locator('.workshop-participation__card').first()).not.toContainText(
    /Rangfolge|\d+ Workshops/u,
  )
  await page.screenshot({ path: '/tmp/dghk-participation-mobile.png' })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.workshop-participation__wide')).toBeVisible()
  await expect(page.locator('.workshop-participation__narrow')).toBeHidden()
  const printSlotWidths = await page
    .locator('.workshop-participation__table tbody tr')
    .first()
    .locator('.workshop-participation__slot-cell')
    .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width))
  expect(Math.max(...printSlotWidths) - Math.min(...printSlotWidths)).toBeLessThanOrEqual(1)
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
  await expect(page.locator('.workshop-participation__table')).not.toContainText('Offen')
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
