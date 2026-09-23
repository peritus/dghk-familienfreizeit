export const organiserBasePath = '/organiser'

export const organiserRoutePaths = {
  dashboard: '/',
  families: '/families',
  familyDetail: '/families/:id',
} as const

export const organiserRouteDefinitions = [
  {
    id: 'organiser-dashboard',
    relativePath: organiserRoutePaths.dashboard,
    absolutePath: organiserBasePath,
    label: 'Dashboard',
  },
  {
    id: 'organiser-families',
    relativePath: organiserRoutePaths.families,
    absolutePath: `${organiserBasePath}${organiserRoutePaths.families}`,
    label: 'Familien',
  },
  {
    id: 'organiser-family-detail',
    relativePath: organiserRoutePaths.familyDetail,
    absolutePath: `${organiserBasePath}${organiserRoutePaths.familyDetail}`,
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
  familyDetail: (familyId: string): string =>
    `${organiserBasePath}${organiserRoutePaths.families}/${familyRouteSegment(familyId)}`,
} as const

export const organiserUrls = {
  dashboard: (): string => organiserBasePath,
  families: (): string => `${organiserBasePath}${organiserRoutePaths.families}`,
  familyDetail: (familyId: string): string => organiserPaths.familyDetail(familyId),
} as const
