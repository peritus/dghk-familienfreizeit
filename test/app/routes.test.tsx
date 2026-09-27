import { expect, test } from 'vitest'
import {
  composeOrganiserRouteDefinitions,
  familyIdFromRouteSegment,
  familyRouteSegment,
  isKnownOrganiserPath,
  organiserPaths,
  organiserRouteDefinitions,
  organiserUrls,
} from '../../src/organiser/routes.js'
import { organiserScreenRegistry } from '../../src/organiser/registry.js'

test('organiser route definitions have unique relative and absolute paths', () => {
  expect(new Set(organiserRouteDefinitions.map(({ relative_path }) => relative_path)).size).toBe(
    organiserRouteDefinitions.length,
  )
  expect(new Set(organiserRouteDefinitions.map(({ absolute_path }) => absolute_path)).size).toBe(
    organiserRouteDefinitions.length,
  )
  expect(organiserRouteDefinitions.map(({ absolute_path }) => absolute_path)).toEqual([
    '/organiser',
    '/organiser/families',
    '/organiser/families/:id',
    '/organiser/inventory',
    '/organiser/board',
    '/organiser/reports',
  ])
})

test('module screens are composed only when their module is selected', () => {
  expect(composeOrganiserRouteDefinitions([]).map(({ id }) => id)).toEqual([
    'organiser-dashboard',
    'organiser-families',
    'organiser-family-detail',
  ])
  expect(organiserRouteDefinitions.some(({ id }) => id === 'organiser-inventory')).toBe(true)
  expect(organiserScreenRegistry.filter(({ id }) => id === 'organiser-inventory')).toEqual([
    expect.objectContaining({ host: 'module', route: '/organiser/inventory' }),
  ])
  expect(organiserScreenRegistry).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'organiser-assignment-board', route: '/organiser/board' }),
      expect.objectContaining({ id: 'organiser-assignment-report', route: '/organiser/reports' }),
    ]),
  )
  expect(new Set(organiserScreenRegistry.map(({ id }) => id)).size).toBe(
    organiserScreenRegistry.length,
  )
  expect(new Set(organiserScreenRegistry.map(({ route }) => route)).size).toBe(
    organiserScreenRegistry.length,
  )
})

test('nested organiser paths and public URLs are kept distinct', () => {
  expect(organiserPaths.dashboard()).toBe('/')
  expect(organiserPaths.families()).toBe('/families')
  expect(organiserPaths.inventory()).toBe('/inventory')
  expect(organiserUrls.dashboard()).toBe('/organiser')
  expect(organiserUrls.families()).toBe('/organiser/families')
  expect(organiserUrls.inventory()).toBe('/organiser/inventory')
  expect(organiserPaths.assignment_board()).toBe('/board')
  expect(organiserUrls.assignment_board()).toBe('/organiser/board')
  expect(organiserPaths.assignment_report()).toBe('/reports')
  expect(organiserUrls.assignment_report()).toBe('/organiser/reports')
})

test('family route IDs are opaque, URL-safe, and reversible', () => {
  const familyId = 'fam_6b4b44137d724c1e'
  const segment = familyRouteSegment(familyId)

  expect(segment).toBe('6b4b44137d724c1e')
  expect(organiserPaths.family_detail(familyId)).toBe('/families/6b4b44137d724c1e')
  expect(organiserUrls.family_detail(familyId)).toBe('/organiser/families/6b4b44137d724c1e')
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

test('known organiser path matching is driven by the route catalog', () => {
  expect(isKnownOrganiserPath('/organiser')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/families')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/families/6b4b44137d724c1e')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/inventory')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/organiser/families')).toBe(false)
  expect(isKnownOrganiserPath('/organiser/families/')).toBe(false)
})
