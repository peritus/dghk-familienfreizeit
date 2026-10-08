import { expect, test } from '@playwright/test'

for (const width of [390, 640]) {
  test(`typography role sizes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(
      `/iframe.html?id=foundations-design-tokens--${width === 390 ? 'phone' : 'tablet'}-typography&viewMode=story`,
    )
    const roles = page.locator('[data-typography-role]')
    await expect(roles).toHaveCount(8)
    const sizes = await roles.evaluateAll((elements) =>
      elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    )
    expect(sizes).toEqual(
      width === 390 ? [24, 20, 18, 16, 14, 14, 12, 12] : [30, 24, 20, 18, 16, 16, 14, 14],
    )
    await page.emulateMedia({ media: 'print' })
    expect(
      await roles.evaluateAll((elements) =>
        elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      ),
    ).toEqual([30, 24, 20, 18, 16, 16, 14, 14])
  })
}
for (const width of [390, 640, 768, 1024, 1280]) {
  test(`shared header and content sizes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/iframe.html?id=screens-organiser-workshops--width-${width}&viewMode=story`)
    const h1 = page.getByRole('heading', { name: 'Workshops', level: 1, exact: true })
    await expect(h1).toBeVisible()
    expect(await h1.evaluate((e) => getComputedStyle(e).fontSize)).toBe(
      width < 640 ? '24px' : '30px',
    )
    const primary = page.locator('[data-slot="primary-navigation"] [aria-current="page"]')
    const secondary = page.locator('[data-slot="secondary-navigation"] [aria-current="page"]')
    expect(await primary.evaluate((e) => getComputedStyle(e).fontSize)).toBe(
      width < 640 ? '14px' : '16px',
    )
    expect(await secondary.evaluate((e) => getComputedStyle(e).fontSize)).toBe(
      width < 640 ? '12px' : '14px',
    )
    expect((await primary.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect((await secondary.boundingBox())!.height).toBeGreaterThanOrEqual(40)
    const stats = page.locator('[data-slot="stat-value"]').first()
    expect(await stats.evaluate((e) => getComputedStyle(e).fontSize)).toBe(
      width < 640 ? '20px' : '24px',
    )
    const metric = page.locator('[data-slot="row-metric"] strong').first()
    expect(await metric.evaluate((e) => getComputedStyle(e).fontSize)).toBe(
      width < 640 ? '18px' : '20px',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const nav = await page.locator('[data-slot="primary-navigation"]').boundingBox()
    const active = await primary.boundingBox()
    expect(active!.x).toBeGreaterThanOrEqual(nav!.x - 1)
    expect(active!.x + active!.width).toBeLessThanOrEqual(nav!.x + nav!.width + 1)
  })
}
