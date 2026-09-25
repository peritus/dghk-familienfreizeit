import type { ScreenDescriptor } from './protocol.js'
import { activeProfile } from '../config/index.js'
import { organiserRouteDefinitions } from './routes.js'

/** Kernel-owned host screens. Selected modules append to this registry later. */
const kernelScreens: readonly ScreenDescriptor[] = organiserRouteDefinitions.map(
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

export const organiserScreenRegistry: readonly ScreenDescriptor[] = [
  ...kernelScreens,
  ...moduleScreens,
]
