import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { activeProfile } from '../../src/config/index.js'
import { loadKdl } from '../../src/events/kdl.js'
import { organiserRouteDefinitions } from '../../src/organiser/routes.js'

const fixture = readFileSync(
  new URL('../fixtures/workshop-assignment/prototype-dataset.kdl', import.meta.url),
  'utf-8',
)
const initialEvents = loadKdl(fixture, activeProfile.validation_view)
const addedMembers = Array.from({ length: 5 }, (_, index) => ({
  seq: initialEvents.length + index + 1,
  at: '2027-05-01T00:00:00Z',
  actor: 'organiser@example.test',
  subject: null,
  type: 'PersonAdded' as const,
  payload: {
    person_id: `per_print_${index + 1}`,
    family_id: 'fam_f0',
    given_name: `PrintMember${index + 1}`,
    family_name: 'Morgan',
    age: 8 + index,
    role: 'child',
  },
}))
const events = [...initialEvents, ...addedMembers]
const memberNames = [
  'Sam',
  'Alex',
  'Jamie',
  ...addedMembers.map(({ payload }) => payload.given_name),
]

test('an eight-member family plan uses stacked cards on A4 portrait print', async ({ page }) => {
  test.setTimeout(90_000)
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
        events,
        head_seq: events.length,
        build_revision: 'development',
        compatibility_revision: 1,
        screen_registry: organiserRouteDefinitions.map(({ id, absolute_path: path, label }) => ({
          id,
          route: path,
          label,
          audience: 'organiser',
          host: 'kernel',
        })),
        feature_overrides: [],
      }),
    }),
  )

  await page.emulateMedia({ media: 'screen', colorScheme: 'light' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/organiser/workshops/lists/families?family=fam_f0')
  await expect(page.getByRole('heading', { name: 'Familie Morgan', level: 2 })).toBeVisible()

  const familyPlan = page.locator('.workshop-family-plan-print-cards')
  const wide = familyPlan.locator('.workshop-list-wide')
  const narrow = familyPlan.locator('.workshop-list-narrow')
  await expect(wide).toBeVisible()
  await expect(narrow).toBeHidden()
  for (const name of memberNames) await expect(wide).toContainText(name)

  await page.emulateMedia({ media: 'print', colorScheme: 'light' })
  await expect(wide).toBeHidden()
  await expect(narrow).toBeVisible()
  for (const name of memberNames) await expect(narrow).toContainText(name)
  await expect(narrow).toContainText('09:00')
  expect(await narrow.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

  const pdf = await page.pdf({
    format: 'A4',
    landscape: false,
    printBackground: true,
  })
  expect(pdf.byteLength).toBeGreaterThan(10_000)
  const printedPages =
    Buffer.from(pdf)
      .toString('latin1')
      .match(/\/Type\s*\/Page\b/gu) ?? []
  expect(printedPages.length).toBeGreaterThan(1)
})
