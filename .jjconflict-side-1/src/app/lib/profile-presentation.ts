import type { LocalizedText } from '../../config/define.js'
import type { ProfilePresentation } from '../../config/presentation.js'

export function localizedProfileText(
  profile: ProfilePresentation | undefined,
  value: LocalizedText | null | undefined,
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (!profile) return Object.values(value)[0] ?? ''
  return (
    value[profile.meta.locale] ??
    value[profile.meta.fallback_locale] ??
    Object.values(value)[0] ??
    ''
  )
}

export function profileEventTitle(profile: ProfilePresentation | undefined): string {
  return localizedProfileText(profile, profile?.meta.event?.title) || 'Familienfreizeit'
}

export function profileEventSubheading(profile: ProfilePresentation | undefined): string {
  return (
    localizedProfileText(profile, profile?.meta.event?.subheading) ||
    'Willkommen zur Familienfreizeit'
  )
}

export function profileEventDetails(
  profile: ProfilePresentation | undefined,
): { place: string; date: string } | undefined {
  const event = profile?.meta.event
  if (!profile || !event) return undefined

  const dateTimeZoneOption = 'timeZone'
  const dateFormat = new Intl.DateTimeFormat(profile.meta.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    [dateTimeZoneOption]: profile.meta.timezone,
  })
  const date = `${dateFormat.format(new Date(`${profile.meta.starts_on}T12:00:00Z`))} – ${dateFormat.format(new Date(`${profile.meta.ends_on}T12:00:00Z`))}`
  return { place: localizedProfileText(profile, event.place), date }
}
