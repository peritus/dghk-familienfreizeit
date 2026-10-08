import { afterEach, expect, test, vi } from 'vitest'
import { randomIdPart } from '../../src/app/organiser/ids.js'

afterEach(() => vi.unstubAllGlobals())

test('ids are sixteen hex characters even without crypto.randomUUID', () => {
  const { getRandomValues } = globalThis.crypto
  vi.stubGlobal('crypto', { getRandomValues: getRandomValues.bind(globalThis.crypto) })
  expect(globalThis.crypto.randomUUID).toBeUndefined()
  const ids = Array.from({ length: 50 }, randomIdPart)
  for (const id of ids) expect(`wks_${id}`).toMatch(/^wks_[0-9a-f]{16}$/)
  expect(new Set(ids).size).toBe(ids.length)
})
