import { expect, test } from 'vitest'
import {
  familyIdFromRouteSegment,
  familyRouteSegment,
  organiserPaths,
  organiserRouteDefinitions,
  organiserUrls,
} from '../../src/organiser/routes.js'

test('organiser route definitions have unique relative and absolute paths', () => {
  expect(new Set(organiserRouteDefinitions.map(({ relativePath }) => relativePath)).size).toBe(
    organiserRouteDefinitions.length,
  )
  expect(new Set(organiserRouteDefinitions.map(({ absolutePath }) => absolutePath)).size).toBe(
    organiserRouteDefinitions.length,
  )
  expect(organiserRouteDefinitions.map(({ absolutePath }) => absolutePath)).toEqual([
    '/organiser',
    '/organiser/families',
    '/organiser/families/:id',
  ])
})

test('nested organiser paths and public URLs are kept distinct', () => {
  expect(organiserPaths.dashboard()).toBe('/')
  expect(organiserPaths.families()).toBe('/families')
  expect(organiserUrls.dashboard()).toBe('/organiser')
  expect(organiserUrls.families()).toBe('/organiser/families')
})

test('family route IDs are opaque, URL-safe, and reversible', () => {
  const familyId = 'fam_6b4b44137d724c1e'
  const segment = familyRouteSegment(familyId)

  expect(segment).toBe('6b4b44137d724c1e')
  expect(organiserPaths.familyDetail(familyId)).toBe('/organiser/families/6b4b44137d724c1e')
  expect(organiserUrls.familyDetail(familyId)).toBe('/organiser/families/6b4b44137d724c1e')
  expect(familyIdFromRouteSegment(segment)).toBe(familyId)
  expect(segment).not.toContain('@')
})

test('invalid family IDs cannot leak labels into route URLs', () => {
  expect(() => familyRouteSegment('fam_6b4b44137d724c1e-foo@example.com')).toThrow(
    'family id contains characters that cannot be used in a route',
  )
  expect(() => familyIdFromRouteSegment('6b4b44137d724c1e-foo%40example.com')).toThrow(
    'family route segment is invalid',
  )
})
