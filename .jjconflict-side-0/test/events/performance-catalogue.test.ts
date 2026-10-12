import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { performanceOperations } from '../../src/performance/operations.js'
import { luebben2027Profile } from '../../src/config/profiles/luebben-2027/index.js'

test('documented operation list follows the selected profile automatically', () => {
  const operations = [...performanceOperations(luebben2027Profile)].sort()
  const path = new URL('../../docs/engineering/performance-operations.json', import.meta.url)
  if (process.env.DGHK_PERF_WRITE_CATALOGUE === '1')
    writeFileSync(path, JSON.stringify(operations, null, 2) + '\n')
  expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(operations)
  expect(
    operations.every((operation) => operation.length <= 96 && /^[a-z0-9_.:-]+$/.test(operation)),
  ).toBe(true)
})
