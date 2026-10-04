import type { ProfileMeta } from '../../define.js'

export const luebben2027Meta = {
  id: 'familienfreizeit-2027',
  name: { de: 'Familienfreizeit 2027', en: 'Family retreat 2027' },
  description: {
    de: 'Ausführbares Unterkunfts- und Workshopprofil für die Familienfreizeit 2027.',
    en: 'Executable accommodation and workshop profile for the 2027 family retreat.',
  },
  event: {
    title: { de: 'Familienfreizeit 2027', en: 'Family retreat 2027' },
    subheading: {
      de: 'Willkommen zur Familienfreizeit',
      en: 'Welcome to the family retreat',
    },
    place: { de: 'Wird noch bekannt gegeben', en: 'To be announced' },
  },
  starts_on: '2027-04-30',
  ends_on: '2027-05-02',
  timezone: 'Europe/Berlin',
  deadlines: {
    accommodation: '2027-03-31T21:59:59Z',
    workshops: '2027-04-15T21:59:59Z',
  },
  locale: 'de',
  fallback_locale: 'en',
} satisfies ProfileMeta
