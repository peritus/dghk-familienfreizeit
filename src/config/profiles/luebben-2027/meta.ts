import type { ProfileMeta } from '../../define.js'

export const luebben2027Meta = {
  id: 'familienfreizeit-2027',
  name: {
    de: 'DGHK Berlin-Brandenburg Familienfreizeit Lübben 2027',
    en: 'DGHK Berlin-Brandenburg family retreat Lübben 2027',
  },
  description: {
    de: 'Ausführbares Unterkunfts- und Workshopprofil für die DGHK Berlin-Brandenburg Familienfreizeit Lübben 2027.',
    en: 'Executable accommodation and workshop profile for the DGHK Berlin-Brandenburg family retreat in Lübben 2027.',
  },
  public_landing: {
    heading: { de: 'Lübben 2027', en: 'Lübben 2027' },
    intro: {
      de: 'Planungswerkzeug für die Familienfreizeit.',
      en: 'Planning tool for the family retreat.',
    },
  },
  event: {
    title: {
      de: 'DGHK Berlin-Brandenburg Familienfreizeit Lübben 2027',
      en: 'DGHK Berlin-Brandenburg family retreat Lübben 2027',
    },
    subheading: {
      de: 'Willkommen zur Familienfreizeit',
      en: 'Welcome to the family retreat',
    },
    place: { de: 'Wird noch bekannt gegeben', en: 'To be announced' },
  },
  starts_on: '2027-04-30',
  ends_on: '2027-05-02',
  timezone: 'Europe/Berlin',
  phase_dates: [
    { phase: 'family-preferences.accommodation-preferences', target_at: '2027-03-31T21:59:59Z' },
    { phase: 'workshop-rankings.choice', target_at: '2027-04-15T21:59:59Z' },
  ],
  locale: 'de',
  fallback_locale: 'en',
} satisfies ProfileMeta
