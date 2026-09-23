export const organiserBasePath = '/organiser'

export const organiserRoutePaths = {
  dashboard: '/',
  families: '/families',
  family_detail: '/families/:id',
} as const

export const organiserRouteDefinitions = [
  {
    id: 'organiser-dashboard',
    relative_path: organiserRoutePaths.dashboard,
    absolute_path: organiserBasePath,
    test_path: organiserBasePath,
    label: 'Dashboard',
  },
  {
    id: 'organiser-families',
    relative_path: organiserRoutePaths.families,
    absolute_path: `${organiserBasePath}${organiserRoutePaths.families}`,
    test_path: `${organiserBasePath}${organiserRoutePaths.families}`,
    label: 'Familien',
  },
  {
    id: 'organiser-family-detail',
    relative_path: organiserRoutePaths.family_detail,
    absolute_path: `${organiserBasePath}${organiserRoutePaths.family_detail}`,
    test_path: `${organiserBasePath}${organiserRoutePaths.families}/6b4b44137d724c1e`,
    label: 'Familie',
  },
] as const

const familyRouteIdPattern = /^[a-zA-Z0-9_-]+$/

/**
 * Family identities stay durable domain values (`fam_<opaque-id>`), while the
 * browser route carries only the opaque part. Email addresses and other
 * mutable labels must never become part of a family URL.
 */
export function familyRouteSegment(familyId: string): string {
  if (!familyId.startsWith('fam_')) throw new Error('family id must use the fam_ prefix')
  const routeId = familyId.slice('fam_'.length)
  if (!routeId || !familyRouteIdPattern.test(routeId))
    throw new Error('family id contains characters that cannot be used in a route')
  return encodeURIComponent(routeId)
}

export function familyIdFromRouteSegment(segment: string): string {
  const routeId = decodeURIComponent(segment)
  if (!routeId || !familyRouteIdPattern.test(routeId))
    throw new Error('family route segment is invalid')
  return `fam_${routeId}`
}

export const organiserPaths = {
  dashboard: (): string => organiserRoutePaths.dashboard,
  families: (): string => organiserRoutePaths.families,
  family_detail: (familyId: string): string =>
    `${organiserRoutePaths.families}/${familyRouteSegment(familyId)}`,
} as const

export const organiserUrls = {
  dashboard: (): string => organiserBasePath,
  families: (): string => `${organiserBasePath}${organiserRoutePaths.families}`,
  family_detail: (familyId: string): string =>
    `${organiserBasePath}${organiserPaths.family_detail(familyId)}`,
} as const

export function isKnownOrganiserPath(pathname: string): boolean {
  if (pathname.length > 1 && pathname.endsWith('/')) return false
  const actual = pathname.split('/').filter(Boolean)
  return organiserRouteDefinitions.some(({ absolute_path: absolutePath }) => {
    const expected = absolutePath.split('/').filter(Boolean)
    return (
      actual.length === expected.length &&
      expected.every((segment, index) => segment.startsWith(':') || segment === actual[index])
    )
  })
}
