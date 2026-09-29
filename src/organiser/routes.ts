import type { ProfileModule } from '../config/define.js'
import { activeProfile } from '../config/index.js'

export const organiserBasePath = '/organiser'

declare const organiserPathBrand: unique symbol

declare const organiserUrlBrand: unique symbol

export type OrganiserPath = string & { readonly [organiserPathBrand]: true }

export type OrganiserUrl = string & { readonly [organiserUrlBrand]: true }

export const organiserRoutePaths = {
  dashboard: '/',
  families: '/families',
  family_detail: '/families/:id',
  inventory: '/inventory',
  assignment_board: '/board',
} as const

export const kernelOrganiserRouteDefinitions = [
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

type OrganiserRouteDefinition = {
  id: string
  relative_path: string
  absolute_path: string
  test_path: string
  label: string
}

export function composeOrganiserRouteDefinitions(
  modules: readonly ProfileModule[],
): readonly OrganiserRouteDefinition[] {
  const moduleRoutes = modules.flatMap((module) =>
    (module.contributions.screens ?? []).map((screen) => ({
      id: screen.id,
      relative_path: organiserNestedPath(screen.route),
      absolute_path: screen.route,
      test_path: screen.route,
      label: screen.label,
    })),
  )
  const routes = [...kernelOrganiserRouteDefinitions, ...moduleRoutes]
  const ids = new Set<string>()
  const paths = new Set<string>()
  for (const route of routes) {
    if (ids.has(route.id)) throw new Error(`duplicate organiser screen id: ${route.id}`)
    if (paths.has(route.absolute_path))
      throw new Error(`duplicate organiser screen route: ${route.absolute_path}`)
    ids.add(route.id)
    paths.add(route.absolute_path)
  }
  return routes
}

/** The route catalog for the statically selected occasion profile. */
export const organiserRouteDefinitions = composeOrganiserRouteDefinitions(activeProfile.modules)

function nestedPath(path: string): OrganiserPath {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path === organiserBasePath ||
    path.startsWith(`${organiserBasePath}/`)
  ) {
    throw new Error(`invalid nested organiser path: ${path}`)
  }
  return path as OrganiserPath
}

function publicUrl(path: string): OrganiserUrl {
  if (path !== organiserBasePath && !path.startsWith(`${organiserBasePath}/`)) {
    throw new Error(`invalid public organiser URL: ${path}`)
  }
  return path as OrganiserUrl
}

/** Convert a registered public organiser URL to the path expected by nested wouter links. */
export function organiserNestedPath(publicPath: string): OrganiserPath {
  if (publicPath === organiserBasePath) return nestedPath('/')
  if (!publicPath.startsWith(`${organiserBasePath}/`)) {
    throw new Error(`organiser route must start with ${organiserBasePath}: ${publicPath}`)
  }
  return nestedPath(publicPath.slice(organiserBasePath.length))
}

/** Add a fragment to a nested organiser path without losing its route type. */
export function organiserPathWithHash(path: OrganiserPath, hash: string): OrganiserPath {
  if (!hash.startsWith('#') || hash.includes('/organiser')) {
    throw new Error(`invalid organiser path fragment: ${hash}`)
  }
  return nestedPath(`${path}${hash}`)
}

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
  dashboard: (): OrganiserPath => nestedPath(organiserRoutePaths.dashboard),
  families: (): OrganiserPath => nestedPath(organiserRoutePaths.families),
  family_detail: (familyId: string): OrganiserPath =>
    nestedPath(`${organiserRoutePaths.families}/${familyRouteSegment(familyId)}`),
  inventory: (): OrganiserPath => nestedPath(organiserRoutePaths.inventory),
  assignment_board: (): OrganiserPath => nestedPath(organiserRoutePaths.assignment_board),
} as const

export const organiserUrls = {
  dashboard: (): OrganiserUrl => publicUrl(organiserBasePath),
  families: (): OrganiserUrl => publicUrl(`${organiserBasePath}${organiserRoutePaths.families}`),
  family_detail: (familyId: string): OrganiserUrl =>
    publicUrl(`${organiserBasePath}${organiserPaths.family_detail(familyId)}`),
  inventory: (): OrganiserUrl => publicUrl(`${organiserBasePath}${organiserPaths.inventory()}`),
  assignment_board: (): OrganiserUrl =>
    publicUrl(`${organiserBasePath}${organiserPaths.assignment_board()}`),
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
