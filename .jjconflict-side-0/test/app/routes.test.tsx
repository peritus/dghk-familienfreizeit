import { expect, test } from 'vitest'
import {
  composeOrganiserRouteDefinitions,
  familyIdFromRouteSegment,
  familyRouteSegment,
  personIdFromRouteSegment,
  personRouteSegment,
  isKnownOrganiserPath,
  isOrganiserPathActive,
  organiserNestedPath,
  organiserPathWithHash,
  organiserPaths,
  organiserRouteDefinitions,
  organiserUrls,
} from '../../src/organiser/routes.js'
import { organiserScreenRegistry } from '../../src/organiser/registry.js'
import { OrganiserLink } from '../../src/app/components/application/organiser-link.js'

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
    '/organiser/families/:id/:topic',
    '/organiser/families/:id/:topic/:person_id',
    '/organiser/accommodation/inventory',
    '/organiser/accommodation/assignment',
    '/organiser/workshops/spaces',
    '/organiser/workshops',
    '/organiser/workshops/leitungen',
    '/organiser/workshops/externe',
    '/organiser/workshops/programme',
    '/organiser/workshops/programme/unplaced',
    '/organiser/workshops/programme/overlaps',
    '/organiser/workshops/slots',
    '/organiser/workshops/allocation',
    '/organiser/workshops/allocation/demand',
    '/organiser/workshops/allocation/trace',
    '/organiser/workshops/lists',
    '/organiser/workshops/lists/workshops',
    '/organiser/workshops/lists/persons',
    '/organiser/workshops/lists/families',
    '/organiser/workshops/lists/rooms',
  ])
})

test('module screens are composed only when their module is selected', () => {
  expect(composeOrganiserRouteDefinitions([]).map(({ id }) => id)).toEqual([
    'organiser-dashboard',
    'organiser-families',
    'organiser-family-detail',
    'organiser-family-detail-topic',
    'organiser-family-detail-person-topic',
  ])
  expect(organiserRouteDefinitions.some(({ id }) => id === 'organiser-inventory')).toBe(true)
  expect(organiserScreenRegistry.filter(({ id }) => id === 'organiser-inventory')).toEqual([
    expect.objectContaining({ host: 'module', route: '/organiser/accommodation/inventory' }),
  ])
  expect(organiserScreenRegistry).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'organiser-assignment-board',
        route: '/organiser/accommodation/assignment',
      }),
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
  expect(organiserPaths.accommodation()).toBe('/accommodation')
  expect(organiserPaths.inventory()).toBe('/accommodation/inventory')
  expect(organiserUrls.dashboard()).toBe('/organiser')
  expect(organiserUrls.families()).toBe('/organiser/families')
  expect(organiserUrls.accommodation()).toBe('/organiser/accommodation')
  expect(organiserUrls.inventory()).toBe('/organiser/accommodation/inventory')
  expect(organiserPaths.assignment_board()).toBe('/accommodation/assignment')
  expect(organiserUrls.assignment_board()).toBe('/organiser/accommodation/assignment')
  expect(organiserPaths.workshop_allocation()).toBe('/workshops/allocation')
  expect(organiserPaths.workshop_allocation_demand()).toBe('/workshops/allocation/demand')
  expect(organiserPaths.workshop_allocation_trace()).toBe('/workshops/allocation/trace')
  expect(organiserUrls.workshop_allocation()).toBe('/organiser/workshops/allocation')
})

test('organiser route boundaries reject duplicate bases and preserve nested path types', () => {
  expect(organiserNestedPath('/organiser')).toBe('/')
  expect(organiserPathWithHash(organiserPaths.inventory(), '#room=room_1')).toBe(
    '/accommodation/inventory#room=room_1',
  )
  expect(() => organiserNestedPath('/organiser/organiser/accommodation/assignment')).toThrow()
  expect(() => organiserPathWithHash(organiserPaths.inventory(), '/organiser')).toThrow()

  const nestedLink = (
    <OrganiserLink href={organiserPaths.assignment_board()}>Belegung</OrganiserLink>
  )
  expect(nestedLink.props.href).toBe('/accommodation/assignment')
  expect(() =>
    OrganiserLink({
      href: organiserUrls.assignment_board() as never,
      children: <span>Belegung</span>,
    }),
  ).toThrow('organiser links must use nested paths')
})

test('family route IDs are opaque, URL-safe, and reversible', () => {
  const familyId = 'fam_6b4b44137d724c1e'
  const segment = familyRouteSegment(familyId)

  expect(segment).toBe('6b4b44137d724c1e')
  expect(organiserPaths.family_detail(familyId)).toBe('/families/6b4b44137d724c1e')
  expect(organiserUrls.family_detail(familyId)).toBe('/organiser/families/6b4b44137d724c1e')
  expect(familyIdFromRouteSegment(segment)).toBe(familyId)
  expect(segment).not.toContain('@')

  const personId = 'per_7b4b44137d724c1e'
  const personSegment = personRouteSegment(personId)
  expect(personSegment).toBe('7b4b44137d724c1e')
  expect(personIdFromRouteSegment(personSegment)).toBe(personId)
  expect(organiserPaths.family_topic(familyId, 'zimmer')).toBe('/families/6b4b44137d724c1e/zimmer')
  expect(organiserPaths.family_person_topic(familyId, 'essen', personId)).toBe(
    '/families/6b4b44137d724c1e/essen/7b4b44137d724c1e',
  )
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
  expect(isKnownOrganiserPath('/organiser/families/6b4b44137d724c1e/zimmer')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/families/6b4b44137d724c1e/essen/7b4b44137d724c1e')).toBe(
    true,
  )
  expect(isKnownOrganiserPath('/organiser/accommodation')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/accommodation/inventory')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/spaces')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/slots')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/programme/unplaced')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/programme/overlaps')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/allocation')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/allocation/demand')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/workshops/allocation/trace')).toBe(true)
  expect(isKnownOrganiserPath('/organiser/inventory')).toBe(false)
  expect(isKnownOrganiserPath('/organiser/organiser/families')).toBe(false)
  expect(isKnownOrganiserPath('/organiser/families/')).toBe(false)
})

test('primary and secondary navigation use segment-aware active matching', () => {
  expect(isOrganiserPathActive('/accommodation/inventory', '/accommodation', true)).toBe(true)
  expect(isOrganiserPathActive('/accommodation/assignment', '/accommodation', true)).toBe(true)
  expect(isOrganiserPathActive('/workshops/spaces', '/workshops', true)).toBe(true)
  expect(isOrganiserPathActive('/workshops/spaces', '/workshops/programme', true)).toBe(false)
  expect(isOrganiserPathActive('/workshops/spaces', '/workshops/spaces')).toBe(true)
  expect(isOrganiserPathActive('/workshops/spaces-extra', '/workshops/spaces', true)).toBe(false)
  expect(isOrganiserPathActive('/workshops/allocation/trace', '/workshops/allocation', true)).toBe(
    true,
  )
  expect(isOrganiserPathActive('/', '/', false)).toBe(true)
  expect(isOrganiserPathActive('/families/abc', '/', true)).toBe(false)
})
