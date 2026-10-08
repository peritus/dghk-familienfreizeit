import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import { uiCoverage } from '../../src/app/design/ui-coverage.js'

test('every coverage id is registered once', () => {
  const ids = uiCoverage.map(({ id }) => id)
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([])
})

test('every coverage entry names an existing renderable rather than its story', () => {
  for (const { id, source } of uiCoverage) {
    expect(existsSync(resolve(process.cwd(), source)), `${id}: ${source}`).toBe(true)
    expect(source, id).not.toMatch(/\.stories\.tsx$/)
  }
})

test('an entry without a snapshot states why', () => {
  for (const entry of uiCoverage) {
    if (entry.snapshot === false) expect(entry.snapshot_exemption.trim(), entry.id).not.toBe('')
  }
})
