import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { activeProfile } from '../../src/config/index.js'
import { loadKdl } from '../../src/events/kdl.js'
import { organiserUrls, organiserRouteDefinitions } from '../../src/organiser/routes.js'

const events = loadKdl(
  ['../fixtures/room-inventory/djh-luebben.kdl', '../fixtures/families/49_families.kdl']
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n'),
  activeProfile.validation_view,
)

test('populated family and accommodation screens retain data and one footer on paper', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        principal: { roles: ['organiser'], email: 'organiser@example.test' },
      },
    }),
  )
  await page.route('**/api/organiser/log', (route) =>
    route.fulfill({
      json: {
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
      },
    }),
  )
  const screens = [
    { path: organiserUrls.families(), heading: 'Familien', text: 'Morgan', name: 'families' },
    {
      path: organiserUrls.family_detail('fam_f0') + '/personen',
      heading: 'Morgan',
      text: 'Sam',
      name: 'family',
    },
    {
      path: organiserUrls.inventory(),
      heading: 'Unterkunft',
      text: 'Haupthaus',
      name: 'inventory',
    },
    {
      path: organiserUrls.assignment_board(),
      heading: 'Wer schläft wo?',
      text: 'Belegungsübersicht',
      name: 'assignment',
    },
  ]
  for (const screen of screens) {
    await page.emulateMedia({ media: 'screen', colorScheme: 'light' })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(screen.path)
    await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
    if (screen.name === 'assignment')
      await expect(
        page.getByRole('button', { name: /Festlegen|Erneut festlegen|Wieder öffnen/ }),
      ).toHaveCount(0)
    await page.screenshot({ path: `/tmp/dghk-${screen.name}-screen.png` })
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    await expect(
      page.getByRole('heading', {
        name: screen.name === 'assignment' ? 'Belegungsübersicht' : screen.heading,
        level: 1,
      }),
    ).toBeVisible()
    await expect(page.locator('main')).toContainText(screen.text)
    await expect(page.locator('[data-slot="application-bar"]')).toBeHidden()
    if (screen.name === 'family')
      await expect(page.getByRole('heading', { name: 'Person entfernen' })).toHaveCount(0)
    if (screen.name === 'inventory')
      await expect(page.locator('[data-slot="inline-entity-editor"]').first()).toBeHidden()

    await expect(page.locator('[data-slot="print-footer"]')).toBeVisible()
    await expect(page.locator('[data-slot="print-footer"]')).toContainText('Vertraulich')
    await page.screenshot({ path: `/tmp/dghk-${screen.name}-print.png` })
    const pdf = await page.pdf({
      path: `/tmp/dghk-${screen.name}-print.pdf`,
      preferCSSPageSize: true,
      printBackground: true,
    })
    expect(pdf.byteLength).toBeGreaterThan(10_000)
  }
})
