import { expect, test } from '@playwright/test'
import { uiCoverage } from '../../src/app/design/ui-coverage'

test.describe('repository-local UI contract', () => {
  test('every coverage entry resolves to a Storybook story', async ({ request }) => {
    const response = await request.get('/index.json')
    expect(response.ok()).toBeTruthy()
    const index = (await response.json()) as { entries: Record<string, { type: string }> }

    for (const entry of uiCoverage) {
      expect(index.entries[entry.id], `${entry.subject} (${entry.source})`).toBeTruthy()
      expect(['story', 'docs']).toContain(index.entries[entry.id]?.type)
    }
  })

  for (const entry of uiCoverage.filter(({ area }) => area !== 'foundation')) {
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
