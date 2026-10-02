import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'

const defaultBaseUrl = 'http://127.0.0.1:5173'
const defaultBatchSize = 50
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function usage() {
  return `Usage: npm run db:import-fixture -- [options] <fixture.kdl>

Options:
  --base-url URL             Worker URL (default: ${defaultBaseUrl})
  --session-cookie COOKIE    Existing organiser sid cookie or Cookie header
  --magic-link URL           Single-use organiser magic-link URL
  --batch-size COUNT         Events per HTTP request (default: ${defaultBatchSize})
  --allow-non-empty          Allow appending to an existing event log
  --help                     Show this help

The fixture is parsed and validated with the active occasion profile before any
HTTP request appends events. Use either --session-cookie or --magic-link.
`
}

export function parseArgs(argv) {
  const options = {
    baseUrl: defaultBaseUrl,
    sessionCookie: null,
    magicLink: null,
    batchSize: defaultBatchSize,
    allowNonEmpty: false,
    fixturePath: null,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    if (argument === '--allow-non-empty') {
      options.allowNonEmpty = true
      continue
    }
    if (
      argument === '--base-url' ||
      argument === '--session-cookie' ||
      argument === '--cookie' ||
      argument === '--magic-link' ||
      argument === '--batch-size'
    ) {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`)
      if (argument === '--base-url') options.baseUrl = value
      else if (argument === '--session-cookie' || argument === '--cookie')
        options.sessionCookie = value
      else if (argument === '--magic-link') options.magicLink = value
      else options.batchSize = parseBatchSize(value)
      continue
    }
    if (argument.startsWith('--base-url=')) options.baseUrl = argument.slice('--base-url='.length)
    else if (argument.startsWith('--session-cookie=') || argument.startsWith('--cookie='))
      options.sessionCookie = argument.slice(argument.indexOf('=') + 1)
    else if (argument.startsWith('--magic-link='))
      options.magicLink = argument.slice('--magic-link='.length)
    else if (argument.startsWith('--batch-size='))
      options.batchSize = parseBatchSize(argument.slice('--batch-size='.length))
    else if (argument.startsWith('-')) throw new Error(`unknown option ${argument}`)
    else if (options.fixturePath) throw new Error('only one fixture path may be supplied')
    else options.fixturePath = resolve(argument)
  }

  if (!options.help && !options.fixturePath) throw new Error('a KDL fixture path is required')
  if (options.sessionCookie && options.magicLink)
    throw new Error('use either --session-cookie or --magic-link, not both')
  return options
}

export function parseBatchSize(value) {
  const batchSize = Number(value)
  if (!Number.isSafeInteger(batchSize) || batchSize < 1)
    throw new Error('batch size must be a positive integer')
  return batchSize
}

export function normaliseSessionCookie(value) {
  const cookie = value.trim()
  const match = cookie.match(/(?:^|;\s*)sid=([^;]+)/)
  if (match) return `sid=${match[1]}`
  if (cookie && !cookie.includes('=')) return `sid=${cookie}`
  throw new Error('session cookie must contain an sid value')
}

export function eventsToDrafts(events) {
  return events.map(({ type, subject, payload }) => ({ type, subject, payload }))
}

async function loadFixture(fixturePath) {
  const text = await readFile(fixturePath, 'utf8')
  const vite = await createServer({
    root: repositoryRoot,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    resolve: { alias: { '@': resolve(repositoryRoot, 'src/app') } },
    server: { middlewareMode: true, hmr: false },
  })
  try {
    const [{ loadKdl }, { activeProfile }, { assertAppendableWorld, derive }] = await Promise.all([
      vite.ssrLoadModule('/src/events/kdl.ts'),
      vite.ssrLoadModule('/src/config/index.ts'),
      vite.ssrLoadModule('/src/events/fold.ts'),
    ])
    const events = loadKdl(text, activeProfile.validation_view)
    assertAppendableWorld(derive(events, activeProfile.validation_view))
    return events
  } finally {
    await vite.close()
  }
}

function extractSessionCookie(response) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean)
  const sid = setCookies.map((cookie) => cookie.match(/(?:^|;\s*)sid=([^;]+)/)?.[1]).find(Boolean)
  if (!sid) throw new Error('magic-link response did not set a session cookie')
  return `sid=${sid}`
}

async function cookieFromMagicLink(magicLink) {
  const response = await fetch(magicLink, { redirect: 'manual' })
  if (response.status < 300 || response.status >= 400)
    throw new Error(`magic-link redemption failed with HTTP ${response.status}`)
  return extractSessionCookie(response)
}

function apiUrl(baseUrl, path) {
  return new URL(path, `${baseUrl.replace(/\/$/, '')}/`).toString()
}

async function apiRequest(baseUrl, path, cookie, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  headers.set('cookie', cookie)
  if (init.body) headers.set('content-type', 'application/json')
  return fetch(apiUrl(baseUrl, path), { ...init, headers })
}

async function responseJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function authenticatedLog(baseUrl, cookie) {
  const response = await apiRequest(baseUrl, '/api/organiser/log', cookie)
  const body = await responseJson(response)
  if (response.status === 401 || response.status === 403)
    throw new Error(
      'authentication failed; provide a valid organiser --session-cookie or --magic-link',
    )
  if (!response.ok) throw new Error(`could not read the event log (HTTP ${response.status})`)
  if (!body || !Array.isArray(body.events) || !Number.isSafeInteger(body.head_seq))
    throw new Error('event-log response was malformed')
  if (body.head_seq !== body.events.length)
    throw new Error('event-log head does not match its event count')
  return body
}

async function upload(baseUrl, cookie, events, batchSize, initialHead) {
  let head = initialHead
  for (let offset = 0; offset < events.length; offset += batchSize) {
    const batch = events.slice(offset, offset + batchSize)
    const response = await apiRequest(baseUrl, '/api/events', cookie, {
      method: 'POST',
      body: JSON.stringify({ expected_head: head, events: batch }),
    })
    const body = await responseJson(response)
    if (response.status === 401 || response.status === 403)
      throw new Error('authentication failed while uploading; provide a valid organiser credential')
    if (response.status === 409)
      throw new Error('event log changed during upload; no automatic retry was attempted')
    if (!response.ok || !body || !Number.isSafeInteger(body.head))
      throw new Error(`event upload failed at event ${offset + 1} (HTTP ${response.status})`)
    head = body.head
    console.log(
      `Uploaded ${Math.min(offset + batch.length, events.length)}/${events.length} events (head ${head})`,
    )
  }
  return head
}

export async function run(options) {
  const events = await loadFixture(options.fixturePath)
  if (events.length === 0) throw new Error('fixture contains no events')
  const drafts = eventsToDrafts(events)
  const cookie = options.sessionCookie
    ? normaliseSessionCookie(options.sessionCookie)
    : options.magicLink
      ? await cookieFromMagicLink(options.magicLink)
      : null
  if (!cookie)
    throw new Error('authentication is required; provide --session-cookie or --magic-link')

  const log = await authenticatedLog(options.baseUrl, cookie)
  if (!options.allowNonEmpty && log.events.length > 0)
    throw new Error(
      `refusing to append to non-empty event log (${log.events.length} events); use --allow-non-empty to override`,
    )

  const finalHead = await upload(options.baseUrl, cookie, drafts, options.batchSize, log.head_seq)
  console.log(`Imported ${events.length} events into ${options.baseUrl} (head ${finalHead})`)
  return finalHead
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null
if (import.meta.url === entryPoint) {
  try {
    const options = parseArgs(process.argv.slice(2))
    if (options.help) console.log(usage())
    else await run(options)
  } catch (error) {
    console.error(
      `Fixture import failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 1
  }
}
