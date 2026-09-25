import {
  bool,
  capability,
  decimal,
  defineOccasionProfile,
  enumOf,
  integer,
  property,
} from '../define.js'
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
      title: { de: 'Sanitär', en: 'Sanitary arrangement' },
      scopes: ['room'],
      value: enumOf(['private', 'shared-floor', 'remote-shared']),
      cardinality: 'exactly-one',
      organiser_only: true,
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
    'sleeping-rooms': property({
      title: { de: 'Schlafräume', en: 'Sleeping rooms' },
      scopes: ['room'],
      value: integer({ min: 1 }),
      default: 1,
      organiser_only: true,
    }),
    'beds-per-sleeping-room': property({
      title: { de: 'Schlafplätze pro Schlafraum', en: 'Beds per sleeping room' },
      scopes: ['room'],
      value: integer({ min: 1 }),
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
    'multi-room-unit': capability({
      title: { de: 'Mehrere Schlafräume', en: 'Multi-room unit' },
      scopes: ['room'],
      value: enumOf(['yes']),
      derive: (entity) => {
        const value = entity.label('sleeping-rooms')
        return typeof value === 'number' && value > 1
      },
    }),
  },
  modules: [
    roomInventory({
      floors: ['ground', 'first', 'second'],
      room_types: ['standard', 'apartment', 'bungalow', 'schlaffass'],
      bed_types: ['single', 'double'],
      copy: {
        floors: { ground: 'Erdgeschoss', first: '1. Etage', second: '2. Etage' },
        room_types: {
          standard: 'Standard',
          apartment: 'Apartment',
          bungalow: 'Bungalow',
          schlaffass: 'Schlaffass',
        },
        bed_types: { single: 'Einzelbett', double: 'Doppelbett' },
      },
    }),
  ],
})
