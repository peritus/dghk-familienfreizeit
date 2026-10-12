import { composeAttention } from './engine.js'
import { check, fact } from './helpers.js'
const declarations = [
  ['family-name', 'Bitte gib einen Familiennamen ein.', 'Please enter a family name.'],
  ['email', 'Bitte gib eine gültige E-Mail-Adresse ein.', 'Please enter a valid email address.'],
  [
    'email-used',
    'Diese E-Mail ist schon bei einer anderen Familie eingetragen.',
    'This email address belongs to another family.',
  ],
  ['person-name', 'Bitte gib Vor- und Nachnamen ein.', 'Please enter given and family names.'],
  [
    'child-age',
    'Bitte gib für Kinder ein Alter zwischen 1 und 17 Jahren ein.',
    'Please enter a child age from 1 to 17.',
  ],
  ['name', 'Gib einen Namen an.', 'Enter a name.'],
  [
    'leader-slots',
    'Wähle mindestens einen verfügbaren Slot.',
    'Select at least one available slot.',
  ],
  ['workshop-title', 'Gib dem Workshop einen Titel.', 'Enter a workshop title.'],
  [
    'age-range',
    'Der Altersbereich muss zwischen 0 und 120 Jahren liegen und aufsteigend sein.',
    'Enter an increasing age range from 0 to 120.',
  ],
  [
    'capacity',
    'Die Platzanzahl muss eine ganze Zahl ab 0 sein.',
    'Capacity must be a non-negative integer.',
  ],
  ['slot-time', 'Beginn und Dauer müssen gültig sein.', 'Start and duration must be valid.'],
  [
    'slot-overlap',
    'Dieser Zeitraum überschneidet sich mit einem bestehenden Slot.',
    'This time overlaps an existing slot.',
  ],
  ['building-name', 'Gib dem Gebäude einen Namen.', 'Enter a building name.'],
  ['room-number', 'Gib eine Nummer oder einen Namen ein.', 'Enter a room number or name.'],
] as const
export type FieldFeedbackCode = (typeof declarations)[number][0]

export const fieldAttentionChecks = declarations.map(([code, de, en]) =>
  check(
    `input.${code}`,
    'core',
    ['Angabe prüfen', 'Review field'],
    (c) =>
      (c.operations ?? [])
        .filter((o) => o.code === 'invalid-field' && o.validation_code === code)
        .map((o) =>
          fact(
            c,
            [o.id, o.group_id ?? null, code],
            [],
            { field: code },
            {
              sources: [{ kind: 'field', field: code, group_id: o.group_id ?? null }],
              actions: o.group_id ? [{ kind: 'review-group', group_id: o.group_id }] : [],
            },
          ),
        ),
    {
      requires: [],
      areas: ['operations'],
      scopes: ['operation'],
      severity: 'error',
      detail: () => ({ de, en }),
    },
  ),
)
const evaluate = composeAttention(fieldAttentionChecks)
export function fieldFeedback(code: FieldFeedbackCode, locale = 'de') {
  return evaluate({
    domain: 'invalid-proposal',
    world: null,
    plan: null,
    profile: {
      meta: { locale, fallback_locale: 'en' },
      modules: [],
      traits: {},
      validation_view: {},
    },
    build_revision: 'input',
    locale,
    now: '1970-01-01T00:00:00.000Z',
    audience: 'organiser',
    operations: [{ id: 'authoring', code: 'invalid-field', validation_code: code }],
  }).items[0]!.wording.detail
}
