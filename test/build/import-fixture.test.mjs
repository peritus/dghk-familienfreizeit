import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import {
  eventsToDrafts,
  matchingPrefixLength,
  normaliseSessionCookie,
  parseArgs,
} from '../../scripts/import-fixture.mjs'

test('fixture importer parses target and upload options', () => {
  assert.deepEqual(
    parseArgs([
      '--base-url',
      'https://preview.example.test',
      '--session-cookie',
      'sid=secret; other=ignored',
      '--resume',
      'test/fixtures/room-inventory/familienfreizeit-2027.kdl',
    ]),
    {
      baseUrl: 'https://preview.example.test',
      sessionCookie: 'sid=secret; other=ignored',
      magicLink: null,
      resume: true,
      fixturePath: resolve('test/fixtures/room-inventory/familienfreizeit-2027.kdl'),
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
