import { bool, capability, decimal, defineOccasionProfile, enumOf, property } from '../define.js'
import { roomInventory } from '../../modules/room-inventory/index.js'

export const familienfreizeit2027Profile = defineOccasionProfile({
  meta: {
    id: 'familienfreizeit-2027',
    name: { de: 'Familienfreizeit 2027', en: 'Family retreat 2027' },
    description: {
      de: 'Ausführbares Unterkunftsprofil für die Familienfreizeit 2027.',
      en: 'Executable accommodation profile for the 2027 family retreat.',
    },
    starts_on: '2027-04-30',
    ends_on: '2027-05-02',
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
    sanitary: property({
      title: { de: 'Bad', en: 'Bathroom' },
      scopes: ['room'],
      value: enumOf(['private', 'shared-floor', 'remote-shared']),
      cardinality: 'exactly-one',
      organiser_only: true,
      copy: {
        private: { de: 'Eigenes Bad', en: 'Private bathroom' },
        'shared-floor': { de: 'Bad auf der Etage', en: 'Shared bathroom on the floor' },
        'remote-shared': { de: 'Bad außerhalb', en: 'Shared bathroom elsewhere' },
      },
    }),
    'is-accessible': property({
      title: { de: 'Barrierearm', en: 'Accessible' },
      scopes: ['room'],
      value: bool(),
      default: false,
      organiser_only: true,
    }),
    'price-per-bed-eur': property({
      title: { de: 'Preis pro Schlafplatz', en: 'Price per sleeping place' },
      scopes: ['room'],
      value: decimal({ scale: 2 }),
      cardinality: 'exactly-one',
      organiser_only: true,
    }),
    'has-common-room': property({
      title: { de: 'Gemeinschaftsraum', en: 'Common room' },
      scopes: ['room'],
      value: bool(),
      default: false,
      organiser_only: true,
    }),
    'suitable-for-two-families': property({
      title: { de: 'Für zwei Familien geeignet', en: 'Suitable for two families' },
      scopes: ['room'],
      value: bool(),
      default: false,
      organiser_only: true,
    }),
    'private-sanitary': capability({
      title: { de: 'Eigenes Bad', en: 'Private sanitary facilities' },
      scopes: ['room'],
      value: enumOf(['yes']),
      derive: (entity) => entity.label('sanitary') === 'private',
    }),
    'ground-floor': capability({
      title: { de: 'Erdgeschoss', en: 'Ground floor' },
      scopes: ['room'],
      value: enumOf(['yes']),
      derive: (entity) => entity.label('floor') === 'ground',
    }),
    accessible: capability({
      title: { de: 'Barrierearm', en: 'Accessible' },
      scopes: ['room'],
      value: enumOf(['yes']),
      derive: (entity) => entity.label('is-accessible') === true,
    }),
  },
  modules: [
    roomInventory({
      floors: ['ground', 'first', 'second', 'attic'],
      room_types: ['standard', 'apartment', 'bungalow', 'schlaffass'],
      bed_types: ['single', 'double', 'bunk'],
      price_trait: 'price-per-bed-eur',
      copy: {
        floors: {
          ground: 'Erdgeschoss',
          first: '1. Obergeschoss',
          second: '2. Obergeschoss',
          attic: 'Dachgeschoss',
        },
        room_types: {
          standard: 'Standardzimmer',
          apartment: 'Apartment',
          bungalow: 'Bungalow',
          schlaffass: 'Schlaffass',
        },
        bed_types: { single: 'Einzelbett', double: 'Doppelbett', bunk: 'Etagenbett' },
      },
    }),
  ],
})
