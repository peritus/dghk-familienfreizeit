import type { ProfileMeta } from './define.js'

export type ProfileBranding = {
  logo: string
}

export type ProfilePresentation = {
  meta: Pick<
    ProfileMeta,
    'event' | 'starts_on' | 'ends_on' | 'timezone' | 'locale' | 'fallback_locale'
  >
  branding?: ProfileBranding
}
