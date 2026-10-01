// Illustrative specification example, not loaded or typechecked by the application.
// The imported profile builders and modules are outstanding implementation work.
// Keep this example linted; move working profile code to profiles/ when implemented.
//
// Occasion profile for DGHK Familienfreizeit 2027.
//
// The rationale for these values is in spec/profiles/familienfreizeit-2027.md. The profile
// contract is in spec/profiles/contract.md and every active module parameter is specified
// in its module document, spec/modules/<module-id>.md. Naming follows D18: snake_case fields,
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
} from '../../src/config/define'
import { familyPreferences } from '../../src/modules/family-preferences'
import { roomAssignment } from '../../src/modules/room-assignment'
import { roomInventory } from '../../src/modules/room-inventory'
import { officialWorkshops } from '../../src/modules/official-workshops'
import { workshopAssignment } from '../../src/modules/workshop-assignment'
import { workshopRankings } from '../../src/modules/workshop-rankings'
import { workshopScheduling } from '../../src/modules/workshop-scheduling'
import { workshopSpace } from '../../src/modules/workshop-space'

export default defineOccasionProfile({
  meta: {
    id: 'familienfreizeit-2027',
    name: { de: 'DGHK Familienfreizeit 2027', en: 'DGHK family weekend 2027' },
    starts_on: '2027-04-30',
    ends_on: '2027-05-02',
    timezone: 'Europe/Berlin',
    deadlines: {
      accommodation: '2027-03-31T21:59:59Z',
      workshops: '2027-04-15T21:59:59Z',
    },
    locale: 'de',
    fallback_locale: 'en',
    description: {
      de: 'Ein gemeinsames Wochenende für Familien, mit Workshops für Kinder und Erwachsene.',
      en: 'A shared weekend for families, with workshops for children and adults.',
    },
  },

  traits: {
    // ── People ────────────────────────────────────────────────────────────────

    'role': property({
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

    'does-not-need-a-bed': property({
      title: { de: 'Braucht kein eigenes Bett', en: 'Does not need a bed' },
      scopes: ['person'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
      valid_for: (person) =>
        person.label('role') !== 'adult' || { de: 'Nur für Kinder und Babys', en: 'Children and infants only' },
      family_facing: {
        control: 'toggle',
        title: { de: 'Schläft bei den Eltern', en: 'Sleeps with the parents' },
        help: null,
        scope: 'person',
        strengths: null,
        invert: false,
      },
    }),

    // ── Room properties ───────────────────────────────────────────────────────

    'sanitary': property({
      title: { de: 'Sanitär', en: 'Sanitary facilities' },
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
      title: { de: 'Barrierefrei', en: 'Accessible' },
      scopes: ['room'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
    }),

    'room-status': property({
      title: { de: 'Raumstatus', en: 'Room status' },
      scopes: ['room'],
      value: enumOf(['active', 'blocked']),
      cardinality: 'zero-or-one',
      default: 'active',
      copy: {
        active: { de: 'Aktiv', en: 'Active' },
        blocked: { de: 'Gesperrt', en: 'Blocked' },
      },
    }),

    'price-per-bed-eur': property({
      title: { de: 'Preis pro Bett (beide Tage)', en: 'Price per bed (both days)' },
      scopes: ['room'],
      value: decimal({ scale: 2 }),
      cardinality: 'exactly-one',
      organiser_only: true,
    }),

    'sleeping-rooms': property({
      title: { de: 'Schlafräume', en: 'Sleeping rooms' },
      scopes: ['room'],
      value: integer({ min: 1 }),
      cardinality: 'zero-or-one',
      default: 1,
    }),

    'beds-per-sleeping-room': property({
      title: { de: 'Betten pro Schlafraum', en: 'Beds per sleeping room' },
      scopes: ['room'],
      value: integer({ min: 1 }),
      cardinality: 'zero-or-one',
    }),

    'has-common-room': property({
      title: { de: 'Mit Aufenthaltsraum', en: 'Has a common room' },
      scopes: ['room'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
    }),

    'suitable-for-two-families': property({
      title: { de: 'Für zwei befreundete Familien geeignet', en: 'Suitable for two friendly families' },
      help: { de: 'Beschreibende Angabe; keine Regel für die Einteilung.', en: 'Descriptive only; not a placement rule.' },
      scopes: ['room'],
      value: bool(),
      cardinality: 'zero-or-one',
      default: false,
    }),

    // ── Room capabilities ─────────────────────────────────────────────────────

    'private-sanitary': capability({
      title: { de: 'Eigenes Bad', en: 'Private bathroom' },
      scopes: ['room'],
      derive: (room) => room.label('sanitary') === 'private',
    }),

    'ground-floor': capability({
      title: { de: 'Erdgeschoss', en: 'Ground floor' },
      scopes: ['room'],
      derive: (room) => room.label('floor') === 'ground',
    }),

    'accessible': capability({
      title: { de: 'Barrierefrei', en: 'Accessible' },
      scopes: ['room'],
      derive: (room) => room.label('is-accessible') === true,
    }),

    'multi-room-unit': capability({
      title: { de: 'Wohneinheit mit mehreren Schlafräumen', en: 'Unit with several sleeping rooms' },
      scopes: ['room'],
      derive: (room) => (room.label('sleeping-rooms') ?? 1) > 1,
    }),

    // ── Room requirements ─────────────────────────────────────────────────────

    'needs-private-sanitary': requirement({
      title: { de: 'Eigenes Bad', en: 'Private bathroom' },
      scopes: ['family'],
      satisfied_by: 'private-sanitary',
      strengths: ['required', 'preferred'],
      weight: 6,
      family_facing: {
        control: 'tri-state',
        title: { de: 'Eigenes Bad', en: 'Private bathroom' },
        help: { de: 'Zimmer mit Sanitär kosten 103,00 € statt 88,50 € pro Bett.', en: 'Rooms with a private bathroom cost €103.00 instead of €88.50 per bed.' },
        scope: 'family',
        strengths: ['required', 'preferred'],
        invert: false,
      },
    }),

    'needs-accessible': requirement({
      title: { de: 'Barrierefreies Zimmer', en: 'Accessible room' },
      scopes: ['family', 'person'],
      satisfied_by: 'accessible',
      strengths: ['required', 'preferred'],
      weight: 8,
      family_facing: {
        control: 'tri-state',
        title: { de: 'Barrierefreies Zimmer', en: 'Accessible room' },
        help: null,
        scope: 'family',
        strengths: ['required', 'preferred'],
        invert: false,
      },
    }),

    'needs-ground-floor': requirement({
      title: { de: 'Erdgeschoss', en: 'Ground floor' },
      scopes: ['family', 'person'],
      satisfied_by: 'ground-floor',
      strengths: ['required', 'preferred'],
      weight: 4,
      organiser_only: true,
    }),

    'needs-apartment': requirement({
      title: { de: 'Wohneinheit mit mehreren Schlafräumen', en: 'Unit with several sleeping rooms' },
      scopes: ['family'],
      satisfied_by: 'multi-room-unit',
      strengths: ['preferred'],
      weight: 4,
      organiser_only: true,
    }),

    'sole-occupancy': requirement({
      title: { de: 'Zimmer nicht teilen', en: 'Do not share the room' },
      scopes: ['family'],
      structural: 'no-other-families',
      strengths: ['required', 'preferred'],
      penalty: -12,
      family_facing: {
        control: 'tri-state',
        title: { de: 'Zimmer teilen', en: 'Share a room' },
        help: null,
        scope: 'family',
        strengths: ['required', 'preferred'],
        invert: true,
      },
    }),

    // ── Room relations ────────────────────────────────────────────────────────

    'apart-from': relation({
      title: { de: 'Getrennt von', en: 'Keep apart from' },
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
      title: { de: 'Zielgruppe', en: 'Audience' },
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
      title: { de: 'Leitet Workshop', en: 'Leads workshop' },
      scopes: ['person'],
      value: ref('workshop'),
      cardinality: 'zero-or-more',
      organiser_only: true,
    }),

    'prefers-workshop': orderedChoice({
      title: { de: 'Workshop-Wünsche', en: 'Workshop choices' },
      scopes: ['person'],
      per: 'occasion',
      choice: 'workshop',
      family_facing: {
        control: 'ranking',
        title: { de: 'Workshop-Wünsche', en: 'Workshop choices' },
        help: {
          de: 'Bis zu drei Workshop-Wünsche, der wichtigste zuerst.',
          en: 'Up to three workshop choices, most important first.',
        },
        scope: 'person',
        strengths: null,
        invert: false,
      },
    }),

    'workshop-with': relation({
      title: { de: 'Workshop zusammen mit', en: 'Workshop together with' },
      scopes: ['person'],
      target: ['person'],
      operator: 'groups-with',
      symmetry: 'mutual-required',
      strengths: ['required'],
      cardinality: 'zero-or-more',
      family_facing: {
        control: 'person-picker',
        title: { de: 'Workshops gemeinsam mit', en: 'Workshops together with' },
        help: null,
        scope: 'person',
        strengths: ['required'],
        invert: false,
      },
    }),

    // ── Notes ─────────────────────────────────────────────────────────────────

    'family-note': property({
      title: { de: 'Hinweis der Familie', en: 'Family note' },
      scopes: ['family'],
      value: text({ max_length: 2000 }),
      cardinality: 'zero-or-one',
      family_facing: {
        control: 'free-text',
        title: { de: 'Sonst noch etwas?', en: 'Anything else?' },
        help: { de: 'Freitext — das Organisationsteam liest mit.', en: 'Free text — the organisers read it.' },
        scope: 'family',
        strengths: null,
        invert: false,
      },
    }),

    'organiser-note': note({
      title: { de: 'Notiz des Organisationsteams', en: 'Organiser note' },
      scopes: ['family', 'person', 'room', 'workshop', 'workshop-space'],
      value: text({ max_length: 4000 }),
      organiser_only: true,
      sensitivity: 'restricted',
    }),
  },

  modules: [
    roomInventory({
      floors: ['ground', 'first', 'second'],
      room_types: ['standard', 'apartment', 'bungalow', 'schlaffass'],
      bed_types: ['single', 'double'],
      copy: {
        floors: {
          'ground': { de: 'Erdgeschoss', en: 'Ground floor' },
          'first': { de: '1. Stock', en: '1st floor' },
          'second': { de: '2. Stock', en: '2nd floor' },
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
      },
    }),

    roomAssignment({
      weights: { exact_fit: 10, near_fit: 4, orphan_bed: -8 },
      keep_apart_trait: 'apart-from',
      no_bed_trait: 'does-not-need-a-bed',
      priority_trait: 'needs-accessible',
      scarce_capabilities: { 'accessible': -3 },
      max_repair_passes: 5,
    }),

    workshopSpace(),

    officialWorkshops({
      audience_trait: 'workshop-audience',
      leader_trait: 'leads-workshop',
      leaders_consume_capacity: false,
      require_leader: false,
      excluded_roles: ['infant'],
      audience_rules: {
        'children': ['child'],
        'adults': ['adult'],
      },
    }),

    workshopScheduling(),

    workshopRankings({
      ranking_trait: 'prefers-workshop',
      max_rank: 3,
      allow_no_preference: true,
    }),

    workshopAssignment({
      objectives: ['min-people-without-top-n', 'min-people-without-any-choice', 'max-rank-weight'],
      top_n: 2,
      rank_weights: [3, 2, 1],
      minimum_workshops: 2,
      fairness_targets: { children: 2, adults: 1 },
      fill_unassigned: true,
    }),

    familyPreferences({
      sections: [
        {
          key: 'people',
          title: { de: 'Wer kommt mit', en: 'Who is coming' },
          intro: null,
          traits: ['does-not-need-a-bed'],
          deadline_scope: null,
        },
        {
          key: 'room-wishes',
          title: { de: 'Zimmerwünsche', en: 'Room wishes' },
          intro: null,
          traits: ['needs-private-sanitary', 'needs-accessible', 'sole-occupancy', 'family-note'],
          deadline_scope: 'accommodation',
        },
        {
          key: 'workshops',
          title: { de: 'Workshops', en: 'Workshops' },
          intro: null,
          traits: ['prefers-workshop', 'workshop-with'],
          deadline_scope: 'workshops',
        },
      ],
      module_controls: [
        {
          key: 'workshop-sign-up', section: 'workshops',
          title: { de: 'Workshop-Anmeldung', en: 'Workshop sign-up' },
          help: { de: 'Du meldest Dich verbindlich an.', en: 'This reserves your place.' },
        },
        {
          key: 'workshop-interest', section: 'workshops',
          title: { de: 'Interesse', en: 'Interest' },
          help: { de: 'Unverbindlich, ohne Platzreservierung.', en: 'Non-binding; no place reserved.' },
        },
      ],
      deadline_contact: {
        accommodation: {
          de: 'Späte Änderungen an Zimmerwünschen bitte mit dem Organisationsteam abstimmen.',
          en: 'Please coordinate late room-preference changes with the organisers.',
        },
        workshops: {
          de: 'Späte Workshop-Änderungen bitte mit dem Organisationsteam abstimmen.',
          en: 'Please coordinate late workshop changes with the organisers.',
        },
      },
    }),

  ],
})
