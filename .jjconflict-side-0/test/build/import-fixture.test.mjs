import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import {
  eventsToDrafts,
  normaliseSessionCookie,
  parseArgs,
  parseBatchSize,
} from '../../scripts/import-fixture.mjs'

test('fixture importer parses target and upload options', () => {
  assert.deepEqual(
    parseArgs([
      '--base-url',
      'https://preview.example.test',
      '--session-cookie',
      'sid=secret; other=ignored',
      '--batch-size=3',
      '--allow-non-empty',
      'test/fixtures/room-inventory/familienfreizeit-2027.kdl',
    ]),
    {
      baseUrl: 'https://preview.example.test',
      sessionCookie: 'sid=secret; other=ignored',
      magicLink: null,
      batchSize: 3,
      allowNonEmpty: true,
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

test('fixture importer requires positive batch sizes', () => {
  assert.equal(parseBatchSize('25'), 25)
  assert.throws(() => parseBatchSize('0'), /positive integer/)
  assert.throws(() => parseBatchSize('not-a-number'), /positive integer/)
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
