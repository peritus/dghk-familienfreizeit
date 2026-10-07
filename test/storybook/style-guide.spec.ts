import { expect, test } from '@playwright/test'
import { uiCoverage } from '../../src/app/design/ui-coverage'

test.describe('repository-local UI contract', () => {
  test('story navigation stays inside the preview iframe', async ({ page }) => {
    await page.goto('/iframe.html?id=application-organiser-app--loaded-dashboard&viewMode=story')
    await expect(
      page.getByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
    ).toBeVisible()
    const organiserStoryUrl = page.url()

    await page.getByRole('link', { name: 'Familien', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Familien/, level: 1 })).toBeVisible()
    expect(page.url()).toBe(organiserStoryUrl)

    await page.goto(
      '/iframe.html?id=modules-room-assignment-components-assignment-board--room-card-variants&viewMode=story',
    )
    const roomStoryUrl = page.url()
    await page.getByRole('link', { name: 'Zimmer 23' }).first().click()
    expect(page.url()).toBe(roomStoryUrl)
  })

  test('coverage entries and Storybook entries match one to one', async ({ request }) => {
    const response = await request.get('/index.json')
    expect(response.ok()).toBeTruthy()
    const index = (await response.json()) as {
      entries: Record<string, { type: string; importPath: string }>
    }

    for (const entry of uiCoverage) {
      expect(index.entries[entry.id], `${entry.subject} (${entry.source})`).toBeTruthy()
      expect(['story', 'docs']).toContain(index.entries[entry.id]?.type)
    }

    const registered = new Set(uiCoverage.map(({ id }) => id))
    const unregistered = Object.entries(index.entries)
      .filter(([id, { type }]) => ['story', 'docs'].includes(type) && !registered.has(id))
      .map(([id, { importPath }]) => `${id} (${importPath})`)
    expect(unregistered, 'every story needs a uiCoverage entry').toEqual([])
  })

  for (const entry of uiCoverage.filter(
    (entry) => entry.area !== 'foundation' && entry.snapshot !== false,
  )) {
    test(`visual contract: ${entry.area}: ${entry.subject}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${entry.id}&viewMode=story`)
      if (entry.media) await page.emulateMedia({ media: entry.media })
      const root = page.locator('#storybook-root')
      const target = entry.screenshot_target === 'dialog' ? page.getByRole('dialog') : root
      await expect(target).toBeVisible({ timeout: 15_000 })
      await page.evaluate(async () => {
        await document.fonts?.ready
      })
      await expect(target).toHaveScreenshot(`${entry.id}.png`, {
        animations: 'disabled',
        caret: 'hide',
      })
    })
  }
})
