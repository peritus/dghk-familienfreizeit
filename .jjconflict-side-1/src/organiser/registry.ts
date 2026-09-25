import type { ScreenDescriptor } from './protocol.js'
import { organiserRouteDefinitions } from './routes.js'

/** Kernel-owned host screens. Selected modules append to this registry later. */
export const organiserScreenRegistry: readonly ScreenDescriptor[] = organiserRouteDefinitions.map(
  ({ id, absolute_path: route, label }) => ({
    id,
    route,
    label,
    audience: 'organiser',
    host: 'kernel',
  }),
)
