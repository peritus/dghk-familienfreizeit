import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { after, test } from 'node:test'
import { convertV4MiniflareOptions, Log, LogLevel, Miniflare } from 'miniflare'

const directory = resolve('dist/dghk_familienfreizeit')
const config = JSON.parse(await readFile(resolve(directory, 'wrangler.json'), 'utf8'))
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    name: config.name,
    scriptPath: resolve(directory, config.main),
    compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags,
    d1Databases: Object.fromEntries(
      config.d1_databases.map((database) => [database.binding, database.database_id]),
    ),
    assets: {
      directory: resolve(directory, config.assets.directory),
      binding: config.assets.binding,
      run_worker_first: config.assets.run_worker_first,
      routerConfig: { has_user_worker: true },
      assetConfig: { not_found_handling: config.assets.not_found_handling },
    },
    log: new Log(LogLevel.ERROR),
  }),
)
after(() => runtime.dispose())

test('built Worker reaches a real local D1 database', async () => {
  const response = await runtime.dispatchFetch('http://localhost/api/health')
  assert.equal(response.status, 200, await response.clone().text())
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('API and auth navigations never fall through to the SPA', async () => {
  for (const path of ['/api', '/api/unknown', '/auth', '/auth/unknown']) {
    const response = await runtime.dispatchFetch(`http://localhost${path}`, {
      redirect: 'manual',
      headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' },
    })
    if (path === '/auth/unknown') {
      assert.equal(response.status, 302, path)
      assert.equal(response.headers.get('location'), '/login?error=expired')
    } else {
      assert.equal(response.status, 404, path)
      assert.deepEqual(await response.json(), { error: 'not_found' })
    }
  }
})

test('built SPA supports public and nested organiser navigation with real assets', async () => {
  for (const path of ['/', '/family', '/login', '/organiser', '/organiser/unknown']) {
    const response = await runtime.dispatchFetch(`http://localhost${path}`, {
      headers: { accept: 'text/html', 'sec-fetch-mode': 'navigate' },
    })
    assert.equal(response.status, 200, path)
    const html = await response.text()
    assert.match(html, /lang="de"/)
    assert.match(html, /id="root"/)
    assert.doesNotMatch(html, /src\/app\/main.tsx/)
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map((match) => match[1])
    assert.ok(assets.some((asset) => asset.endsWith('.js')))
    assert.ok(assets.some((asset) => asset.endsWith('.css')))
    for (const asset of assets) {
      const resource = await runtime.dispatchFetch(`http://localhost${asset}`)
      assert.equal(resource.status, 200, asset)
      assert.match(
        resource.headers.get('content-type'),
        asset.endsWith('.css') ? /text\/css/ : /javascript/,
      )
    }
  }
})
