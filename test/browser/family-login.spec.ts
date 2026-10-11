import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from 'miniflare'

async function startRuntime(
  organiserEmail = 'both@example.test',
  familyEmail = 'both@example.test',
) {
  const directory = resolve('dist/dghk_familienfreizeit')
  const config = JSON.parse(await readFile(resolve(directory, 'wrangler.json'), 'utf8')) as {
    name: string
    main: string
    compatibility_date: string
    compatibility_flags: string[]
    assets: { directory: string; binding: string; run_worker_first: string[] }
  }
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      name: config.name,
      scriptPath: resolve(directory, config.main),
      compatibilityDate: config.compatibility_date,
      compatibilityFlags: config.compatibility_flags,
      d1Databases: { DB: 'family-browser' },
      bindings: {
        DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: organiserEmail,
        DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN: 'true',
        DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES: 'true',
      },
      assets: {
        directory: resolve(directory, config.assets.directory),
        binding: config.assets.binding,
        run_worker_first: config.assets.run_worker_first,
        routerConfig: { has_user_worker: true },
        assetConfig: { not_found_handling: 'single-page-application' },
      },
      log: new Log(LogLevel.ERROR),
    }),
  )
  try {
    const db = await runtime.getD1Database('DB')
    const migration = await readFile('migrations/0001_m1_kernel.sql', 'utf8')
    for (const statement of migration
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean))
      await db.prepare(statement).run()
    const seed = [
      {
        type: 'FamilyInvited',
        payload: {
          family_id: 'fam_both',
          email: familyEmail,
          display_name: 'Linde',
          locale: 'de',
        },
      },
      {
        type: 'PersonAdded',
        payload: {
          person_id: 'per_ada',
          family_id: 'fam_both',
          given_name: 'Ada',
          family_name: 'Linde',
          role: 'child',
          age: 9,
        },
      },
    ]
    for (const [index, event] of seed.entries())
      await db
        .prepare(
          'INSERT INTO event(seq,at,actor,type,subject,payload) VALUES (?1,?2,?3,?4,NULL,?5)',
        )
        .bind(
          index + 1,
          new Date().toISOString(),
          'both@example.test',
          event.type,
          JSON.stringify(event.payload),
        )
        .run()
    const origin = String(await runtime.ready).replace(/\/$/, '')
    return { runtime, db, origin }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}

async function signIn(page: Page, origin: string, email: string) {
  await page.goto(`${origin}/login`)
  await page.getByLabel('E-Mail-Adresse').fill(email)
  await page.getByRole('button', { name: 'Magic Link anfordern' }).click()
  const link = page.getByRole('link', { name: 'Anmelden', exact: true })
  await expect(link).toHaveAttribute('href', /\/auth\/[^/]+\/$/)
  await link.click()
}

async function expectNoSwitch(page: Page) {
  await expect(page.getByRole('link', { name: 'Apps', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Apps', exact: true })).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toMatch(/\bapps?\b/i)
  for (const label of await page
    .locator('[aria-label]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))))
    expect(label).not.toMatch(/\bapps?\b/i)
}

test('real login choices preserve Back, REST edits, direct access and logout/relogin', async ({
  page,
}) => {
  test.setTimeout(90000)
  const { runtime, db, origin } = await startRuntime()
  try {
    await signIn(page, origin, 'BOTH@example.test')
    await expect(page).toHaveURL(`${origin}/login`)
    await expect(
      page.getByRole('heading', { name: 'Wie möchtest du dich anmelden?' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Als Familie anmelden', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Linde', exact: true })).toBeVisible()
    await expectNoSwitch(page)
    await page.goBack()
    await expect(page).toHaveURL(`${origin}/login`)
    await expect(
      page.getByRole('heading', { name: 'Wie möchtest du dich anmelden?' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Als Familie anmelden', exact: true }).click()
    await page.getByRole('link', { name: 'Essen', exact: true }).click()
    await page.getByRole('radio', { name: 'Vegan', exact: true }).click()
    await expect(page.getByRole('radio', { name: 'Vegan', exact: true })).toBeChecked()
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Vegan', exact: true })).toBeChecked()
    await page.getByRole('link', { name: 'Personen', exact: true }).click()
    await page.getByLabel('Vorname', { exact: true }).fill('Adelheid')
    await page.getByRole('button', { name: 'Speichern', exact: true }).click()
    await expect(page.getByRole('tab', { name: /Adelheid Linde/ })).toBeVisible()
    expect(
      await db.prepare('SELECT actor FROM event ORDER BY seq DESC LIMIT 1').first('actor'),
    ).toBe('both@example.test')
    await page.goto(`${origin}/organiser`)
    await expectNoSwitch(page)
    await expect(
      page.getByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Familien', exact: true }).click()
    await page.getByRole('link', { name: 'Linde', exact: true }).click()
    await page.getByRole('link', { name: 'Personen', exact: true }).click()
    await expect(page.getByRole('tab', { name: /Adelheid Linde/ })).toBeVisible()
    await page.getByRole('button', { name: 'Abmelden', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Lübben 2027', exact: true })).toBeVisible()
    await signIn(page, origin, 'both@example.test')
    await page.getByRole('link', { name: 'Als Familie anmelden', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Linde', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Abmelden', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible()
    await page.goto(`${origin}/family`)
    await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible()
  } finally {
    await runtime.dispose()
  }
})

for (const role of ['family', 'organiser'] as const) {
  test(`real sole ${role} login enters its view without choices`, async ({ page }) => {
    test.setTimeout(60000)
    const { runtime, origin } = await startRuntime(
      role === 'organiser' ? 'solo@example.test' : 'other@example.test',
      role === 'family' ? 'solo@example.test' : 'other@example.test',
    )
    try {
      await page.addInitScript(() => {
        const observations: string[] = []
        Object.defineProperty(window, 'login_choice_observations', { value: observations })
        new MutationObserver(() => {
          if (document.querySelector('nav[aria-label="Anmeldung auswählen"]'))
            observations.push('choices')
        }).observe(document, { subtree: true, childList: true })
      })
      await signIn(page, origin, 'solo@example.test')
      await expect(page).toHaveURL(`${origin}/${role}`)
      await expect(
        page.getByRole('heading', {
          name: role === 'family' ? 'Linde' : 'Was braucht heute Aufmerksamkeit?',
          exact: true,
        }),
      ).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Anmeldung auswählen' })).toHaveCount(0)
      expect(await page.evaluate(() => Reflect.get(window, 'login_choice_observations'))).toEqual(
        [],
      )
      await expectNoSwitch(page)
    } finally {
      await runtime.dispose()
    }
  })
}
