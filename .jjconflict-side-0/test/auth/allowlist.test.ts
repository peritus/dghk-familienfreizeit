import { describe, expect, test } from 'vitest'
import { organiserAllowlist, parseOrganiserEmails } from '../../src/auth/allowlist.js'

describe('organiser allowlist configuration', () => {
  test('uses no organisers when the optional environment variable is absent', () => {
    expect(organiserAllowlist({})).toEqual(new Set())
  })

  test('parses, canonicalizes, deduplicates, and ignores invalid entries', () => {
    expect(
      parseOrganiserEmails(
        ' Organiser@example.test,ORGANISER@example.test,invalid, second@example.test ',
      ),
    ).toEqual(new Set(['organiser@example.test', 'second@example.test']))
  })
})
