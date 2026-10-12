import { expect, test } from '@playwright/test'

for (const width of [390, 640, 768, 1024, 1280]) {
  test(`full workshop catalogue and expanded track fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/iframe.html?id=screens-organiser-workshops--width-${width}&viewMode=story`)
    await expect(page.getByRole('heading', { name: 'Kurse', exact: true, level: 1 })).toBeVisible()
    await expect(page.locator('[data-slot="collection-list"] > li')).toHaveCount(33)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Alle Schritte' }).click()
    await expect(page.locator('.workflow-details')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const direction = await page
      .locator('.workflow-full')
      .evaluate((element) => getComputedStyle(element).display)
    expect(direction).toBe(width < 640 ? 'flex' : 'grid')
  })
}

test('dark appearance, reduced motion and browser print preserve semantic surfaces and data', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('/iframe.html?id=screens-organiser-workshops--width-390&viewMode=story')
  const action = page.getByRole('button', { name: 'Kurs hinzufügen' })
  await expect(action).toBeVisible()
  await action.hover()
  expect(await action.evaluate((element) => getComputedStyle(element).translate)).toBe('none')
  const background = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background).not.toBe('rgb(255, 238, 214)')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.workflow-details')).toBeVisible()
  await expect(page.locator('.workflow-compact')).toBeHidden()
  await expect(action).toBeHidden()
  await expect(page.locator('[data-slot="stats-strip"] > *')).toHaveCount(4)
  await expect(page.locator('[data-slot="print-context"]')).toContainText('33 von 33 Kursen')
  await expect(page.locator('[data-slot="print-identity"] img')).toBeVisible()
  await page.pdf({
    path: test.info().outputPath('workshops-a4.pdf'),
    format: 'A4',
    printBackground: true,
  })
})
