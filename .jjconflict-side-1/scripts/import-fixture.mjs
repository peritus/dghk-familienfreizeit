import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'

const defaultBaseUrl = 'http://127.0.0.1:5173'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function usage() {
  return `Usage: pnpm run db:import-fixture -- [options] <fixture.kdl> [fixture.kdl ...]

Options:
  --base-url URL             Worker URL (default: ${defaultBaseUrl})
  --session-cookie COOKIE    Existing organiser sid cookie or Cookie header
  --magic-link URL           Single-use organiser magic-link URL
  --resume                   Resume only when the server log is a fixture prefix
  --help                     Show this help

The fixtures are parsed in the supplied order and validated as one combined
event stream before any HTTP request appends events. The importer plans batches
of at most the Worker limit, with every batch ending at an appendable fixture
prefix. Each batch is appended atomically. Use --resume to continue an import
that stopped after one or more batches. Use either --session-cookie or
--magic-link.
`
}

export function parseArgs(argv) {
  const options = {
    baseUrl: defaultBaseUrl,
    sessionCookie: null,
    magicLink: null,
    resume: false,
    fixturePaths: [],
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    if (argument === '--resume') {
      options.resume = true
      continue
    }
    if (
      argument === '--base-url' ||
      argument === '--session-cookie' ||
      argument === '--cookie' ||
      argument === '--magic-link'
    ) {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`)
      if (argument === '--base-url') options.baseUrl = value
      else if (argument === '--session-cookie' || argument === '--cookie')
        options.sessionCookie = value
      else if (argument === '--magic-link') options.magicLink = value
      continue
    }
    if (argument.startsWith('--base-url=')) options.baseUrl = argument.slice('--base-url='.length)
    else if (argument.startsWith('--session-cookie=') || argument.startsWith('--cookie='))
      options.sessionCookie = argument.slice(argument.indexOf('=') + 1)
    else if (argument.startsWith('--magic-link='))
      options.magicLink = argument.slice('--magic-link='.length)
    else if (argument.startsWith('-')) throw new Error(`unknown option ${argument}`)
    else options.fixturePaths.push(resolve(argument))
  }

  if (!options.help && options.fixturePaths.length === 0)
    throw new Error('at least one KDL fixture path is required')
  if (options.sessionCookie && options.magicLink)
    throw new Error('use either --session-cookie or --magic-link, not both')
  return options
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

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    )
  return value
}

function sameEvent(left, right) {
  return (
    left.type === right.type &&
    (left.subject ?? null) === (right.subject ?? null) &&
    JSON.stringify(stableValue(left.payload)) === JSON.stringify(stableValue(right.payload))
  )
}

export function matchingPrefixLength(existing, fixture) {
  if (existing.length > fixture.length) return -1
  for (let index = 0; index < existing.length; index += 1) {
    if (!sameEvent(existing[index], fixture[index])) return -1
  }
  return existing.length
}

/**
 * Plan the largest appendable fixture prefixes that fit within each batch.
 *
 * @template T
 * @param {T[]} events
 * @param {number} startIndex
 * @param {number} maxEventsPerBatch
 * @param {(endIndex: number) => boolean} isAppendablePrefix
 * @returns {{ startIndex: number, endIndex: number, events: T[] }[]}
 */
export function planAppendableBatches(events, startIndex, maxEventsPerBatch, isAppendablePrefix) {
  if (!Number.isSafeInteger(startIndex) || startIndex < 0 || startIndex > events.length)
    throw new Error('batch start index must be within the fixture event range')
  if (!Number.isSafeInteger(maxEventsPerBatch) || maxEventsPerBatch < 1)
    throw new Error('maximum events per batch must be a positive integer')
  if (typeof isAppendablePrefix !== 'function')
    throw new Error('appendable-prefix validator must be a function')

  const batches = []
  let batchStart = startIndex
  while (batchStart < events.length) {
    let batchEnd = Math.min(events.length, batchStart + maxEventsPerBatch)
    while (batchEnd > batchStart && !isAppendablePrefix(batchEnd)) batchEnd -= 1
    if (batchEnd === batchStart) {
      throw new Error(
        `no appendable batch of at most ${maxEventsPerBatch} events can be found after event ${batchStart}`,
      )
    }
    batches.push({
      startIndex: batchStart,
      endIndex: batchEnd,
      events: events.slice(batchStart, batchEnd),
    })
    batchStart = batchEnd
  }
  return batches
}

async function loadFixture(fixturePaths) {
  const vite = await createServer({
    root: repositoryRoot,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    resolve: { alias: { '@': resolve(repositoryRoot, 'src/app') } },
    server: { middlewareMode: true, hmr: false },
  })
  try {
    const [
      { loadKdl },
      { activeProfile },
      { assertAppendableWorld, derive },
      { maxEventsPerBatch },
    ] = await Promise.all([
      vite.ssrLoadModule('/src/events/kdl.ts'),
      vite.ssrLoadModule('/src/config/index.ts'),
      vite.ssrLoadModule('/src/events/fold.ts'),
      vite.ssrLoadModule('/src/worker/request-limits.ts'),
    ])
    const events = []
    for (const fixturePath of fixturePaths) {
      const text = await readFile(fixturePath, 'utf8')
      events.push(...loadKdl(text, activeProfile.validation_view))
    }
    const combined = events.map((event, index) => ({ ...event, seq: index + 1 }))
    assertAppendableWorld(derive(combined, activeProfile.validation_view))
    return {
      events: combined,
      maxEventsPerBatch,
      isAppendablePrefix(endIndex) {
        try {
          assertAppendableWorld(derive(combined.slice(0, endIndex), activeProfile.validation_view))
          return true
        } catch {
          return false
        }
      },
    }
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
  const response = await fetch(magicLink, {
    headers: new Headers({ origin: new URL(magicLink).origin }),
    redirect: 'manual',
  })
  if (response.status < 300 || response.status >= 400)
    throw new Error(`magic-link redemption failed with HTTP ${response.status}`)
  return extractSessionCookie(response)
}

function apiUrl(baseUrl, path) {
  return new URL(path, `${baseUrl.replace(/\/$/, '')}/`).toString()
}

export function apiRequestHeaders(baseUrl, cookie, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  headers.set('cookie', cookie)
  headers.set('origin', new URL(baseUrl).origin)
  if (init.body) headers.set('content-type', 'application/json')
  return headers
}

async function apiRequest(baseUrl, path, cookie, init = {}) {
  const headers = apiRequestHeaders(baseUrl, cookie, init)
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

function apiFailure(response, body, fallback) {
  const details = [body?.error, body?.message].filter(Boolean).join(': ')
  return `${fallback} (HTTP ${response.status}${details ? `, ${details}` : ''})`
}

async function authenticatedLog(baseUrl, cookie) {
  const response = await apiRequest(baseUrl, '/api/organiser/log', cookie)
  const body = await responseJson(response)
  if (response.status === 401 || response.status === 403)
    throw new Error(
      'authentication failed; provide a valid organiser --session-cookie or --magic-link',
    )
  if (!response.ok) throw new Error(apiFailure(response, body, 'could not read the event log'))
  if (!body || !Array.isArray(body.events) || !Number.isSafeInteger(body.head_seq))
    throw new Error('event-log response was malformed')
  if (body.head_seq !== body.events.length)
    throw new Error('event-log head does not match its event count')
  return body
}

async function upload(baseUrl, cookie, batches, initialHead, totalEvents) {
  let head = initialHead
  for (const batch of batches) {
    const firstEvent = batch.startIndex + 1
    const lastEvent = batch.endIndex
    const response = await apiRequest(baseUrl, '/api/events', cookie, {
      method: 'POST',
      body: JSON.stringify({ expected_head: head, events: batch.events }),
    })
    const body = await responseJson(response)
    if (response.status === 401)
      throw new Error('authentication failed while uploading; provide a valid organiser credential')
    if (response.status === 403)
      throw new Error(
        apiFailure(response, body, `event upload rejected for events ${firstEvent}-${lastEvent}`),
      )
    if (response.status === 409)
      throw new Error(
        `event log changed during upload at events ${firstEvent}-${lastEvent}; no automatic retry was attempted. Rerun with --resume if the server contains a fixture prefix`,
      )
    if (!response.ok || !body || !Number.isSafeInteger(body.head))
      throw new Error(
        apiFailure(response, body, `event upload failed for events ${firstEvent}-${lastEvent}`),
      )
    const expectedHead = head + batch.events.length
    if (body.head !== expectedHead)
      throw new Error(
        `event upload returned head ${body.head} for events ${firstEvent}-${lastEvent}; expected ${expectedHead}`,
      )
    head = body.head
    console.log(`Uploaded ${batch.endIndex}/${totalEvents} events (head ${head})`)
  }
  return head
}

export async function run(options) {
  const fixture = await loadFixture(options.fixturePaths)
  const { events, maxEventsPerBatch, isAppendablePrefix } = fixture
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
  let imported = 0
  if (log.events.length > 0) {
    if (!options.resume)
      throw new Error(
        `refusing to use non-empty event log (${log.events.length} events); use --resume only when it contains a prefix of this fixture`,
      )
    imported = matchingPrefixLength(log.events, drafts)
    if (imported < 0)
      throw new Error('cannot resume: the server event log is not a prefix of this fixture')
  }
  if (imported === drafts.length) {
    console.log(`Fixture already imported into ${options.baseUrl} (head ${log.head_seq})`)
    return log.head_seq
  }

  const batches = planAppendableBatches(drafts, imported, maxEventsPerBatch, isAppendablePrefix)
  const finalHead = await upload(options.baseUrl, cookie, batches, log.head_seq, drafts.length)
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
