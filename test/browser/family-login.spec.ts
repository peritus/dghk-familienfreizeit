import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from 'miniflare'

test('the built frontend logs in, edits through the real REST Worker and enters both apps', async ({
  page,
}) => {
  test.setTimeout(60000)
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
        DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS: 'both@example.test',
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
          email: 'both@example.test',
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
    await page.goto(`${origin}/login`)
    await page.getByLabel('E-Mail-Adresse').fill('BOTH@example.test')
    await page.getByRole('button', { name: 'Magic Link anfordern' }).click()
    const link = page.getByRole('link', { name: 'Anmelden', exact: true })
    await expect(link).toHaveAttribute('href', /\/auth\/[^/]+\/$/)
    await link.click()
    await expect(page.getByRole('heading', { name: 'App auswählen' })).toBeVisible()
    await page.getByRole('link', { name: 'Familienansicht', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Linde', exact: true })).toBeVisible()
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
    await page.getByRole('link', { name: 'Apps', exact: true }).click()
    await page.getByRole('link', { name: 'Organisationsteam', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Was braucht heute Aufmerksamkeit?' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Familien', exact: true }).click()
    await page.getByRole('link', { name: 'Linde', exact: true }).click()
    await page.getByRole('link', { name: 'Personen', exact: true }).click()
    await expect(page.getByRole('tab', { name: /Adelheid Linde/ })).toBeVisible()
    await page.getByRole('button', { name: 'Apps', exact: true }).click()
    await page.getByRole('link', { name: 'Familienansicht', exact: true }).click()
    await page.getByRole('button', { name: 'Abmelden', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible()
    await page.goto(`${origin}/family`)
    await expect(page.getByRole('heading', { name: 'Anmelden', exact: true })).toBeVisible()
  } finally {
    await runtime.dispose()
  }
})
