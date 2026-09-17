// Occasion profile for DGHK Familienfreizeit 2027.
//
// The rationale for these values is in profiles/familienfreizeit-2027.md. The profile
// contract is in 16-occasion-profiles.md and every module parameter is specified in its
// module document, 20.N-<module-id>.md. Naming follows D18: snake_case fields,
// camelCase code, kebab-case vocabulary.

import {
  bool,
  capability,
  decimal,
  defineOccasionProfile,
  enumOf,
  integer,
  note,
  orderedChoice,
  property,
  ref,
  relation,
  requirement,
  text,
} from '../src/config/define'
import { changeNotifications } from '../src/modules/change-notifications'
import { familyPreferences } from '../src/modules/family-preferences'
import { foodPreferences } from '../src/modules/food-preferences'
import { materials } from '../src/modules/materials'
import { roomAssignment } from '../src/modules/room-assignment'
import { roomInventory } from '../src/modules/room-inventory'
import { sleepingParties } from '../src/modules/sleeping-parties'
import { workshopAssignment } from '../src/modules/workshop-assignment'
import { workshopRankings } from '../src/modules/workshop-rankings'
import { workshops } from '../src/modules/workshops'

export default defineOccasionProfile({
  meta: {
    id: 'familienfreizeit-2027',
    name: { de: 'DGHK Familienfreizeit 2027', en: 'DGHK family weekend 2027' },
    starts_on: '2027-04-30',
    ends_on: '2027-05-02',
    preference_deadline: '2027-03-31T21:59:59Z',
    locale: 'de',
    fallback_locale: 'en',
    description: {
      de: 'Ein gemeinsames Wochenende für Familien, mit Workshops für Kinder und Erwachsene.',
      en: 'A shared weekend for families, with workshops for children and adults.',
    },
  },

  tags: {
    // ── People ────────────────────────────────────────────────────────────────

    'role': property({
      label: { de: 'Rolle', en: 'Role' },
      scopes: ['person'],
      value: enumOf(['adult', 'child', 'infant']),
      cardinality: 'exactly-one',
      copy: {
        adult: { de: 'Erwachsene(r)', en: 'Adult' },
        child: { de: 'Kind', en: 'Child' },
        infant: { de: 'Baby', en: 'Infant' },
      },
    }),

    'does-not-need-a-bed': property({
      label: { de: 'Braucht kein eigenes Bett', en: 'Does not need a bed' },
      scopes: ['person'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
      valid_for: (person) =>
        person.label('role') !== 'adult' || { de: 'Nur für Kinder und Babys', en: 'Children and infants only' },
      family_facing: {
        control: 'toggle',
        label: { de: 'Schläft bei den Eltern', en: 'Sleeps with the parents' },
        help: null,
        scope: 'person',
        strengths: null,
        invert: false,
      },
    }),

    // ── Room properties ───────────────────────────────────────────────────────

    'sanitary': property({
      label: { de: 'Sanitär', en: 'Sanitary facilities' },
      scopes: ['room'],
      value: enumOf(['private', 'shared-floor', 'remote-shared']),
      cardinality: 'exactly-one',
      copy: {
        'private': { de: 'mit Sanitär', en: 'private' },
        'shared-floor': { de: 'Etagendusche', en: 'shared on the floor' },
        'remote-shared': { de: 'Sanitär im Nebengebäude', en: 'in a neighbouring building' },
      },
    }),

    'is-accessible': property({
      label: { de: 'Barrierefrei', en: 'Accessible' },
      scopes: ['room'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
    }),

    'price-per-bed-eur': property({
      label: { de: 'Preis pro Bett (beide Tage)', en: 'Price per bed (both days)' },
      scopes: ['room'],
      value: decimal({ scale: 2 }),
      cardinality: 'exactly-one',
      organiser_only: true,
    }),

    'sleeping-rooms': property({
      label: { de: 'Schlafräume', en: 'Sleeping rooms' },
      scopes: ['room'],
      value: integer({ min: 1 }),
      cardinality: 'zero-or-one',
      default: 1,
    }),

    'beds-per-sleeping-room': property({
      label: { de: 'Betten pro Schlafraum', en: 'Beds per sleeping room' },
      scopes: ['room'],
      value: integer({ min: 1 }),
      cardinality: 'zero-or-one',
    }),

    'has-common-room': property({
      label: { de: 'Mit Aufenthaltsraum', en: 'Has a common room' },
      scopes: ['room'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
    }),

    'suitable-for-two-families': property({
      label: { de: 'Für zwei befreundete Familien geeignet', en: 'Suitable for two friendly families' },
      help: { de: 'Beschreibende Angabe; keine Regel für die Einteilung.', en: 'Descriptive only; not a placement rule.' },
      scopes: ['room'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
    }),

    // ── Room capabilities ─────────────────────────────────────────────────────

    'private-sanitary': capability({
      label: { de: 'Eigenes Bad', en: 'Private bathroom' },
      scopes: ['room'],
      derive: (room) => room.label('sanitary') === 'private',
    }),

    'ground-floor': capability({
      label: { de: 'Erdgeschoss', en: 'Ground floor' },
      scopes: ['room'],
      derive: (room) => room.label('floor') === 'ground',
    }),

    'accessible': capability({
      label: { de: 'Barrierefrei', en: 'Accessible' },
      scopes: ['room'],
      derive: (room) => room.label('is-accessible') === true,
    }),

    'multi-room-unit': capability({
      label: { de: 'Wohneinheit mit mehreren Schlafräumen', en: 'Unit with several sleeping rooms' },
      scopes: ['room'],
      derive: (room) => (room.label('sleeping-rooms') ?? 1) > 1,
    }),

    // ── Room requirements ─────────────────────────────────────────────────────

    'needs-private-sanitary': requirement({
      label: { de: 'Eigenes Bad', en: 'Private bathroom' },
      scopes: ['family'],
      satisfied_by: 'private-sanitary',
      strengths: ['required', 'preferred'],
      weight: 6,
      family_facing: {
        control: 'tri-state',
        label: { de: 'Eigenes Bad', en: 'Private bathroom' },
        help: { de: 'Zimmer mit Sanitär kosten 103,00 € statt 88,50 € pro Bett.', en: 'Rooms with a private bathroom cost €103.00 instead of €88.50 per bed.' },
        scope: 'family',
        strengths: ['required', 'preferred'],
        invert: false,
      },
    }),

    'needs-accessible': requirement({
      label: { de: 'Barrierefreies Zimmer', en: 'Accessible room' },
      scopes: ['family', 'person'],
      satisfied_by: 'accessible',
      strengths: ['required', 'preferred'],
      weight: 8,
      family_facing: {
        control: 'tri-state',
        label: { de: 'Barrierefreies Zimmer', en: 'Accessible room' },
        help: null,
        scope: 'family',
        strengths: ['required', 'preferred'],
        invert: false,
      },
    }),

    'needs-ground-floor': requirement({
      label: { de: 'Erdgeschoss', en: 'Ground floor' },
      scopes: ['family', 'person'],
      satisfied_by: 'ground-floor',
      strengths: ['required', 'preferred'],
      weight: 4,
      organiser_only: true,
    }),

    'needs-apartment': requirement({
      label: { de: 'Wohneinheit mit mehreren Schlafräumen', en: 'Unit with several sleeping rooms' },
      scopes: ['family'],
      satisfied_by: 'multi-room-unit',
      strengths: ['preferred'],
      weight: 4,
      organiser_only: true,
    }),

    'sole-occupancy': requirement({
      label: { de: 'Zimmer nicht teilen', en: 'Do not share the room' },
      scopes: ['family'],
      structural: 'no-other-parties',
      strengths: ['required', 'preferred'],
      penalty: -12,
      family_facing: {
        control: 'tri-state',
        label: { de: 'Zimmer teilen', en: 'Share a room' },
        help: null,
        scope: 'family',
        strengths: ['required', 'preferred'],
        invert: true,
      },
    }),

    // ── Room relations ────────────────────────────────────────────────────────

    'room-with': relation({
      label: { de: 'Zusammen mit', en: 'Room with' },
      scopes: ['family'],
      target: ['family'],
      operator: 'groups-with',
      symmetry: 'mutual-required',
      strengths: ['required', 'preferred'],
      cardinality: 'zero-or-more',
      one_sided_weight: 6,
      family_facing: {
        control: 'family-picker',
        label: { de: 'Mit wem möchtest Du zusammen?', en: 'Who would you like to share with?' },
        help: {
          de: 'Du siehst nur, ob eine Familie Dich ebenfalls gewählt hat.',
          en: 'You only see whether a family has chosen you too.',
        },
        scope: 'family',
        strengths: ['required'],
        invert: false,
      },
    }),

    'apart-from': relation({
      label: { de: 'Getrennt von', en: 'Keep apart from' },
      scopes: ['family', 'person'],
      target: ['family', 'person'],
      operator: 'separates-from',
      symmetry: 'implied-mutual',
      strengths: ['required', 'preferred'],
      cardinality: 'zero-or-more',
      penalty: -20,
      organiser_only: true,
      sensitivity: 'restricted',
    }),

    // ── Workshops ─────────────────────────────────────────────────────────────

    'workshop-audience': property({
      label: { de: 'Zielgruppe', en: 'Audience' },
      scopes: ['workshop'],
      value: enumOf(['children', 'adults']),
      cardinality: 'exactly-one',
      organiser_only: true,
      copy: {
        children: { de: 'Kinder', en: 'Children' },
        adults: { de: 'Erwachsene', en: 'Adults' },
      },
    }),

    'leads-workshop': property({
      label: { de: 'Leitet Workshop', en: 'Leads workshop' },
      scopes: ['person'],
      value: ref('workshop'),
      cardinality: 'zero-or-more',
      organiser_only: true,
    }),

    'prefers-workshop': orderedChoice({
      label: { de: 'Workshop-Wünsche', en: 'Workshop choices' },
      scopes: ['person'],
      per: 'slot',
      choice: 'workshop',
      family_facing: {
        control: 'ranking',
        label: { de: 'Workshop-Wünsche', en: 'Workshop choices' },
        help: {
          de: 'Bis zu drei Wünsche pro Zeitfenster, der wichtigste zuerst.',
          en: 'Up to three choices per time slot, most important first.',
        },
        scope: 'person',
        strengths: null,
        invert: false,
      },
    }),

    'workshop-with': relation({
      label: { de: 'Workshop zusammen mit', en: 'Workshop together with' },
      scopes: ['person'],
      target: ['person'],
      operator: 'groups-with',
      symmetry: 'mutual-required',
      strengths: ['required'],
      cardinality: 'zero-or-more',
      family_facing: {
        control: 'person-picker',
        label: { de: 'Workshops gemeinsam mit', en: 'Workshops together with' },
        help: null,
        scope: 'person',
        strengths: ['required'],
        invert: false,
      },
    }),

    // ── Food ──────────────────────────────────────────────────────────────────

    'diet': property({
      label: { de: 'Ernährung', en: 'Diet' },
      scopes: ['person'],
      value: enumOf(['vegetarian', 'vegan', 'carnivore', 'pesco-vegetarian']),
      cardinality: 'exactly-one',
      copy: {
        'vegetarian': { de: 'vegetarisch', en: 'vegetarian' },
        'vegan': { de: 'vegan', en: 'vegan' },
        'carnivore': { de: 'mit Fleisch', en: 'with meat' },
        'pesco-vegetarian': { de: 'pescetarisch', en: 'pescatarian' },
      },
      family_facing: {
        control: 'choice',
        label: { de: 'Ernährung', en: 'Diet' },
        help: null,
        scope: 'person',
        strengths: null,
        invert: false,
      },
    }),

    'allergies-text': property({
      label: { de: 'Allergien und Unverträglichkeiten', en: 'Allergies and intolerances' },
      scopes: ['person'],
      value: text({ max_length: 2000 }),
      cardinality: 'zero-or-one',
      sensitivity: 'restricted',
      family_facing: {
        control: 'free-text',
        label: { de: 'Allergien und Unverträglichkeiten', en: 'Allergies and intolerances' },
        help: {
          de: 'Bitte so genau wie möglich, zum Beispiel „2x Beifuß (sehr starke Allergie)“.',
          en: 'As precisely as possible, for example “mugwort (severe allergy)”.',
        },
        scope: 'person',
        strengths: null,
        invert: false,
      },
    }),

    // ── Notes ─────────────────────────────────────────────────────────────────

    'family-note': property({
      label: { de: 'Hinweis der Familie', en: 'Family note' },
      scopes: ['family'],
      value: text({ max_length: 2000 }),
      cardinality: 'zero-or-one',
      family_facing: {
        control: 'free-text',
        label: { de: 'Sonst noch etwas?', en: 'Anything else?' },
        help: { de: 'Freitext — das Organisationsteam liest mit.', en: 'Free text — the organisers read it.' },
        scope: 'family',
        strengths: null,
        invert: false,
      },
    }),

    'organiser-note': note({
      label: { de: 'Notiz des Organisationsteams', en: 'Organiser note' },
      scopes: ['family', 'person', 'room', 'workshop'],
      value: text({ max_length: 4000 }),
      organiser_only: true,
      sensitivity: 'restricted',
    }),
  },

  modules: [
    roomInventory({
      floors: ['ground', '1', '2'],
      room_types: ['standard', 'apartment', 'bungalow', 'schlaffass'],
      bed_types: ['single', 'double'],
      designations: ['general', 'staff', 'blocked'],
      copy: {
        floors: {
          'ground': { de: 'Erdgeschoss', en: 'Ground floor' },
          '1': { de: '1. Stock', en: '1st floor' },
          '2': { de: '2. Stock', en: '2nd floor' },
        },
        room_types: {
          'standard': { de: 'Zimmer', en: 'Room' },
          'apartment': { de: 'Wohnung', en: 'Apartment' },
          'bungalow': { de: 'Bungalow', en: 'Bungalow' },
          'schlaffass': { de: 'Schlaffass', en: 'Sleeping barrel' },
        },
        bed_types: {
          'single': { de: 'Einzelbett', en: 'Single bed' },
          'double': { de: 'Doppelbett', en: 'Double bed' },
        },
        designations: {
          'general': { de: 'Familienzimmer', en: 'General' },
          'staff': { de: 'Organisationsteam', en: 'Staff' },
          'blocked': { de: 'Gesperrt', en: 'Blocked' },
        },
      },
    }),

    sleepingParties({
      co_room_tag: 'room-with',
      no_bed_tag: 'does-not-need-a-bed',
      size_one_warning_threshold: 5,
    }),

    roomAssignment({
      weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
      keep_apart_tag: 'apart-from',
      priority_tag: 'needs-accessible',
      scarce_capabilities: { 'accessible': -3 },
      max_repair_passes: 5,
    }),

    workshops({
      audience_tag: 'workshop-audience',
      leader_tag: 'leads-workshop',
      leaders_consume_capacity: false,
      require_leader: false,
    }),

    workshopRankings({
      ranking_tag: 'prefers-workshop',
      max_rank: 3,
      allow_no_preference: true,
    }),

    workshopAssignment({
      objectives: ['min-people-without-top-n', 'min-people-without-any-choice', 'max-rank-weight'],
      top_n: 2,
      rank_weights: [3, 2, 1],
      excluded_roles: ['infant'],
      audience_rules: {
        'children': ['child'],
        'adults': ['adult'],
      },
      co_assignment_tag: 'workshop-with',
      cancel_under_subscribed: true,
      fill_unassigned: true,
    }),

    foodPreferences({
      diet_tag: 'diet',
      allergies_tag: 'allergies-text',
      count_by_day: true,
    }),

    materials({
      categories: ['snacks', 'games', 'material'],
      requester_kinds: ['family', 'person', 'workshop'],
      contributor_kinds: ['family', 'person'],
      workshop_links: true,
      person_links: true,
      commitment_fulfills_many: false,
      copy: {
        categories: {
          'snacks': { de: 'Snacks und Getränke', en: 'Snacks and drinks' },
          'games': { de: 'Spiele', en: 'Games' },
          'material': { de: 'Material', en: 'Equipment and supplies' },
        },
      },
    }),

    familyPreferences({
      sections: [
        {
          key: 'people',
          title: { de: 'Wer kommt mit', en: 'Who is coming' },
          intro: null,
          tags: ['does-not-need-a-bed'],
        },
        {
          key: 'room-wishes',
          title: { de: 'Zimmerwünsche', en: 'Room wishes' },
          intro: null,
          tags: ['needs-private-sanitary', 'needs-accessible', 'sole-occupancy', 'family-note'],
        },
        {
          key: 'room-with',
          title: { de: 'Mit wem möchtest Du zusammen?', en: 'Who would you like to share with?' },
          intro: null,
          tags: ['room-with'],
        },
        {
          key: 'workshops',
          title: { de: 'Workshops', en: 'Workshops' },
          intro: null,
          tags: ['prefers-workshop', 'workshop-with'],
        },
        {
          key: 'food',
          title: { de: 'Essen', en: 'Food' },
          intro: null,
          tags: ['diet', 'allergies-text'],
        },
      ],
      after_deadline: 'read-only',
      deadline_contact: {
        de: 'Änderungen bitte an das Organisationsteam.',
        en: 'Please send changes to the organisers.',
      },
    }),

    changeNotifications({
      change_kinds: [
        'room-changed',
        'place-changed',
        'workshop-assignment-changed',
        'workshop-auto-cancelled',
        'workshop-cancelled',
      ],
      include_assignment_in_body: true,
      copy: {
        publication_subject: { de: 'Deine Zimmer und Workshops', en: 'Your rooms and workshops' },
        change_subject: { de: 'Deine Einteilung hat sich geändert', en: 'Your assignment has changed' },
      },
    }),
  ],
})
