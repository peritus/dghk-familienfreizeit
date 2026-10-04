import { defineOccasionProfile, enumOf, property } from '../define.js'

/** The first executable profile deliberately selects no domain module. */
export const kernelProfile = defineOccasionProfile({
  meta: {
    id: 'kernel-fixture',
    name: { de: 'Kernel-Testprofil', en: 'Kernel fixture' },
    description: {
      de: 'Ausführbares Profil ohne Fachmodule.',
      en: 'Executable profile without domain modules.',
    },
    public_landing: {
      heading: { de: 'Kernel-Testprofil', en: 'Kernel fixture' },
      intro: {
        de: 'Ausführbares Profil ohne Fachmodule.',
        en: 'Executable profile without domain modules.',
      },
    },
    starts_on: '2027-05-14',
    ends_on: '2027-05-16',
    timezone: 'Europe/Berlin',
    locale: 'de',
    fallback_locale: 'en',
  },
  traits: {
    role: property({
      title: { de: 'Rolle', en: 'Role' },
      scopes: ['person'],
      value: enumOf(['adult', 'child', 'infant']),
      cardinality: 'exactly-one',
      copy: {
        adult: { de: 'Erwachsene(r)', en: 'Adult' },
        child: { de: 'Kind', en: 'Child' },
        infant: { de: 'Baby', en: 'Infant' },
      },
    }),
  },
})
