import type { ScreenDescriptor } from './protocol.js'

/** Kernel-owned host screens. Selected modules append to this registry later. */
export const organiserScreenRegistry: readonly ScreenDescriptor[] = [
  {
    id: 'organiser-dashboard',
    route: '/organiser',
    label: 'Dashboard',
    audience: 'organiser',
    host: 'kernel',
  },
  {
    id: 'organiser-families',
    route: '/organiser/families',
    label: 'Familien',
    audience: 'organiser',
    host: 'kernel',
  },
  {
    id: 'organiser-family-detail',
    route: '/organiser/families/:id',
    label: 'Familie',
    audience: 'organiser',
    host: 'kernel',
  },
]
