import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import {
  apiRequestHeaders,
  eventsToDrafts,
  matchingPrefixLength,
  normaliseSessionCookie,
  parseArgs,
  planAppendableBatches,
} from '../../scripts/import-fixture.mjs'

test('fixture importer parses target and upload options', () => {
  assert.deepEqual(
    parseArgs([
      '--base-url',
      'https://preview.example.test',
      '--session-cookie',
      'sid=secret; other=ignored',
      '--resume',
      'test/fixtures/room-inventory/djh-luebben.kdl',
      'test/fixtures/families/49_families.kdl',
    ]),
    {
      baseUrl: 'https://preview.example.test',
      sessionCookie: 'sid=secret; other=ignored',
      magicLink: null,
      resume: true,
      fixturePaths: [
        resolve('test/fixtures/room-inventory/djh-luebben.kdl'),
        resolve('test/fixtures/families/49_families.kdl'),
      ],
      help: false,
    },
  )
})

test('fixture importer normalises raw or full session cookies', () => {
  assert.equal(normaliseSessionCookie('secret'), 'sid=secret')
  assert.equal(normaliseSessionCookie('sid=secret; other=value'), 'sid=secret')
  assert.throws(() => normaliseSessionCookie('other=value'), /sid value/)
})

test('fixture importer strips fixture envelope metadata before upload', () => {
  assert.deepEqual(
    eventsToDrafts([
      {
        seq: 7,
        at: '2026-01-01T00:00:00.000Z',
        actor: 'fixture',
        subject: 'family-1',
        type: 'LabelSet',
        payload: { entity_id: 'family-1', key: 'name', value: 'Test' },
      },
    ]),
    [
      {
        type: 'LabelSet',
        subject: 'family-1',
        payload: { entity_id: 'family-1', key: 'name', value: 'Test' },
      },
    ],
  )
})

test('fixture importer recognises an exact event prefix for resume', () => {
  const fixture = [
    { type: 'One', subject: null, payload: { b: 2, a: 1 } },
    { type: 'Two', subject: 'two', payload: { value: ['x', 'y'] } },
  ]
  assert.equal(matchingPrefixLength(fixture.slice(0, 1), fixture), 1)
  assert.equal(matchingPrefixLength(fixture, fixture), 2)
  assert.equal(matchingPrefixLength([{ ...fixture[0], payload: { a: 9, b: 2 } }], fixture), -1)
  assert.equal(matchingPrefixLength([...fixture, fixture[0]], fixture), -1)
})

test('fixture importer sends same-origin request headers', () => {
  const headers = apiRequestHeaders('https://preview.example.test/app/', 'sid=secret', {
    method: 'POST',
    body: '{}',
    headers: { 'x-importer': 'fixture' },
  })

  assert.equal(headers.get('origin'), 'https://preview.example.test')
  assert.equal(headers.get('cookie'), 'sid=secret')
  assert.equal(headers.get('content-type'), 'application/json')
  assert.equal(headers.get('x-importer'), 'fixture')
})

test('fixture importer chooses the largest appendable prefix within each batch limit', () => {
  const events = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }))
  const appendableEnds = new Set([3, 6, 8, 12])
  const batches = planAppendableBatches(events, 0, 5, (endIndex) => appendableEnds.has(endIndex))

  assert.deepEqual(
    batches.map(({ startIndex, endIndex }) => [startIndex, endIndex]),
    [
      [0, 3],
      [3, 8],
      [8, 12],
    ],
  )
  assert.equal(
    batches.every(({ events: batch }) => batch.length <= 5),
    true,
  )
})

test('fixture importer plans from an exact resume offset and fails before uploading without a safe batch', () => {
  const events = Array.from({ length: 8 }, (_, index) => ({ id: index + 1 }))
  const appendableEnds = new Set([3, 6, 8])

  assert.deepEqual(
    planAppendableBatches(events, 3, 3, (endIndex) => appendableEnds.has(endIndex)).map(
      ({ startIndex, endIndex }) => [startIndex, endIndex],
    ),
    [
      [3, 6],
      [6, 8],
    ],
  )
  assert.throws(
    () => planAppendableBatches(events, 0, 2, () => false),
    /no appendable batch of at most 2 events/,
  )
})
