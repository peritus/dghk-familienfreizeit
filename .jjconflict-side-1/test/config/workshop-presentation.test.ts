import { expect, test } from 'vitest'
import {
  workshopNotes,
  workshopAgeWarning,
  workshopAdvisoryFingerprint,
} from '../../src/modules/official-workshops/checks.js'
import type { WorkshopRecord } from '../../src/modules/official-workshops/index.js'

const workshop: WorkshopRecord = {
  id: 'wks_a',
  title: 'Titel',
  description: '',
  audience: 'adults',
  age_min: 12,
  age_max: 99,
  capacity: 1,
  mode: 'assigned',
  leader_ids: ['per_known'],
  needs: [],
  cancelled: false,
  cancellation_reason: null,
  sort_key: 1,
}

test('age inconsistencies are advisories while all-audience workshops stay unrestricted', () => {
  expect(workshopAgeWarning(workshop)).toContain('unter 16')
  expect(workshopAgeWarning({ ...workshop, audience: 'children' })).toContain('über 17')
  expect(workshopAgeWarning({ ...workshop, audience: 'all' })).toBeNull()
})

test('demand above capacity is information and does not enter the acknowledgement token', () => {
  const known = new Set(['per_known'])
  const notes = workshopNotes([workshop], known, { wks_a: 3 })
  expect(notes.map(({ kind }) => kind)).toEqual(['advisory', 'information'])
  expect(workshopAdvisoryFingerprint(notes)).toBe(
    workshopAdvisoryFingerprint(workshopNotes([workshop], known)),
  )
  expect(workshopAdvisoryFingerprint(notes)).not.toBe(workshopAdvisoryFingerprint([]))
  expect(workshopNotes([{ ...workshop, age_min: 18 }], new Set())[0]?.message).toContain(
    'nicht mehr verfügbar',
  )
})
