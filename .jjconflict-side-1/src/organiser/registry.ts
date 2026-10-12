import type { ScreenDescriptor } from './protocol.js'
import { activeProfile } from '../config/index.js'
import { kernelOrganiserRouteDefinitions } from './routes.js'

/** Kernel-owned host screens. Selected modules append to this registry later. */
const kernelScreens: readonly ScreenDescriptor[] = kernelOrganiserRouteDefinitions.map(
  ({ id, absolute_path: route, label }) => ({
    id,
    route,
    label,
    audience: 'organiser',
    host: 'kernel',
  }),
)

const moduleScreens: readonly ScreenDescriptor[] = activeProfile.modules.flatMap((module) =>
  (module.contributions.screens ?? []).map((screen) => ({
    ...screen,
    host: 'module' as const,
  })),
)

const screenIds = new Set<string>()
const screenRoutes = new Set<string>()
for (const screen of [...kernelScreens, ...moduleScreens]) {
  if (screenIds.has(screen.id)) throw new Error(`duplicate organiser screen id: ${screen.id}`)
  if (screenRoutes.has(screen.route))
    throw new Error(`duplicate organiser screen route: ${screen.route}`)
  screenIds.add(screen.id)
  screenRoutes.add(screen.route)
}

export const organiserScreenRegistry: readonly ScreenDescriptor[] = [
  ...kernelScreens,
  ...moduleScreens,
]
