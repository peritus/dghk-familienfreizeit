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
    const printed = await roles.evaluateAll((elements) =>
      elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    )
    for (const [i, value] of [30, 24, 20, 18, 16, 16, 14, 14].entries())
      expect(printed[i]).toBeCloseTo((value * 10) / 12, 3)
  })
}
for (const width of [390, 640, 768, 1024, 1280]) {
  test(`shared header and content sizes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/iframe.html?id=screens-organiser-workshops--width-${width}&viewMode=story`)
    const h1 = page.getByRole('heading', { name: 'Workshops', level: 1, exact: true })
    await expect(h1).toBeVisible({ timeout: 15000 })
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

for (const width of [390, 640]) {
  for (const [kind, label, dashed, action] of [
    ['saved', 'alles gespeichert', false, null],
    ['saving', 'wird gespeichert', false, null],
    ['pending', '3 ungespeicherte Änderungen', true, 'Speichern'],
    ['empty', 'nichts offen', true, null],
    ['error', 'nicht gespeichert', false, 'Wiederholen'],
  ] as const) {
    test(`compact status ${kind} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(
        `/iframe.html?id=application-organiser-header-menu--${kind}-${width}&viewMode=story`,
      )
      const pill = page.getByRole('button', { name: /^Menü \(Speichern, Abmelden\)/ })
      await expect(pill).toBeVisible()
      await expect(pill).toHaveAttribute('aria-label', new RegExp(label, 'i'))
      await expect(pill).toHaveAttribute('aria-haspopup', 'dialog')
      await expect(pill).toHaveAttribute('aria-expanded', 'false')
      expect(await pill.evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe(
        dashed ? 'dashed' : 'solid',
      )
      expect((await pill.boundingBox())!.height).toBe(40)
      if (action)
        await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Abmelden', exact: true })).toBeHidden()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (kind === 'saving') {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        expect(
          await pill
            .locator('.lucide-loader-circle')
            .evaluate((e) => getComputedStyle(e).animationName),
        ).toBe('none')
      }
    })
  }
  test(`compact modal geometry, focus, close and scroll lock at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(
      `/iframe.html?id=application-organiser-header-menu--saved-${width}&viewMode=story`,
    )
    const pill = page.getByRole('button', { name: /^Menü \(Speichern, Abmelden\)/ })
    await pill.click()
    const dialog = page.getByRole('dialog', { name: 'Menü' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      await dialog
        .getByRole('heading', { name: 'Menü', level: 2 })
        .evaluate((e) => getComputedStyle(e).fontSize),
    ).toBe('16px')
    const rect = (await dialog.boundingBox())!
    expect(rect.width).toBe(width < 640 ? width : 340)
    expect(rect.x).toBe(width < 640 ? 0 : width - 356)
    expect(rect.y).toBe(width < 640 ? 900 - rect.height : 64)
    await expect(dialog.getByRole('heading', { name: 'Menü', level: 2 })).toBeVisible()
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab')
      await expect.poll(() => dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true)
    }
    if (width === 390)
      expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe('hidden')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(pill).toBeFocused()
    await pill.click()
    await dialog.getByRole('button', { name: 'Schließen' }).click()
    await expect(pill).toBeFocused()
    await pill.click()
    await page.locator('.header-menu-viewport').click({ position: { x: 5, y: 5 } })
    await expect(pill).toBeFocused()
  })
}
test('compact menu interaction story uses one reducer and preserves save transitions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/iframe.html?id=application-organiser-header-menu--interaction&viewMode=story')
  await expect(page.getByRole('button', { name: /^Menü.*alles gespeichert/ })).toBeFocused()
  await expect(page.getByRole('dialog', { name: 'Menü' })).toBeHidden()
})
test('compact menu closes at desktop breakpoint and stays hidden on print', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/iframe.html?id=screens-organiser-workshops--width-390&viewMode=story')
  await page.getByRole('button', { name: /^Menü/ }).click()
  await expect(page.getByRole('dialog', { name: 'Menü' })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.header-menu-viewport')).toBeHidden()
  await expect(page.locator('[data-slot="application-bar"]')).toBeHidden()
  await expect(page.locator('.workflow-details')).toBeVisible()
  await page.emulateMedia({ media: 'screen' })
  await page.setViewportSize({ width: 768, height: 900 })
  await expect(page.getByRole('dialog', { name: 'Menü' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Abmelden', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Speicheroptionen anzeigen/ })).toBeVisible()
})
test('workflow collapsed row and keyboard button each toggle once', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=shared-primitives-workflowstepper--workshop-choice&viewMode=story',
  )
  const row = page.locator('.workflow-compact')
  await row.locator('ol').click()
  await expect(page.locator('.workflow-details')).toBeVisible()
  await page.getByRole('heading', { name: /Nächster Schritt/ }).click()
  await expect(page.locator('.workflow-details')).toBeVisible()
  await page.getByRole('button', { name: 'Weniger' }).click()
  const toggle = page.getByRole('button', { name: 'Alle Schritte' })
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.workflow-details')).toBeVisible()
  await page.getByRole('button', { name: 'Weniger' }).click()
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.workflow-details')).toBeVisible()
  await expect(row).not.toHaveAttribute('role', 'button')
  await expect(row).not.toHaveAttribute('tabindex', '0')
})
