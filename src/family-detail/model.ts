export type DetailValue =
  | string
  | number
  | boolean
  | null
  | readonly DetailValue[]
  | { readonly [key: string]: DetailValue }

export type PreferenceAnswer = {
  values: readonly { value: DetailValue; strength: 'required' | 'preferred' | null }[]
  answered: boolean
}

export type PersonInput = {
  given_name: string
  family_name: string
  role: string
  age: number | null
}

export type DetailPerson = PersonInput & { id: string }

export type DetailWorkshop = {
  id: string
  title: string
  description: string
  mode: 'assigned' | 'sign-up' | 'interest'
  audience: string
  age_min: number
  age_max: number
  capacity: number
  signed_up_count: number
  eligibility: Readonly<Record<string, string | null>>
}

export type PreferenceControl = {
  key: string
  section_key: string
  target_id: string
  title: string
  help: string | null
  kind:
    | 'tri-state'
    | 'toggle'
    | 'free-text'
    | 'choice'
    | 'family-picker'
    | 'select'
    | 'ranking'
    | 'workshop-sign-up'
    | 'workshop-interest'
  invert: boolean
  strengths: readonly string[]
  options: readonly { value: DetailValue; label: string }[]
  answer: PreferenceAnswer
  disabled: boolean
  disabled_reason: string | null
}

export type DetailSection = {
  key: string
  title: string
  intro: string | null
  notice: string | null
  visible: boolean
  writable: boolean
}

export type FamilyDetailData = {
  family: { id: string; display_name: string; email: string }
  people: readonly DetailPerson[]
  sections: readonly DetailSection[]
  preferences: Readonly<Record<string, Readonly<Record<string, PreferenceControl>>>>
  workshops: readonly DetailWorkshop[]
  max_rank: number
  rankings: Readonly<Record<string, readonly string[]>>
  signups: Readonly<Record<string, readonly string[]>>
  interests: Readonly<Record<string, readonly string[]>>
  can_edit_email: boolean
  can_remove_person: boolean
}

export type FamilyTopic = 'zimmer' | 'personen' | 'essen' | 'workshops'

export const familyTopics: readonly FamilyTopic[] = ['zimmer', 'personen', 'essen', 'workshops']

export const familyTopicLabels: Record<FamilyTopic, string> = {
  zimmer: 'Zimmer',
  personen: 'Personen',
  essen: 'Essen',
  workshops: 'Workshops',
}

export function personName(person: Pick<PersonInput, 'given_name' | 'family_name'>): string {
  return `${person.given_name} ${person.family_name}`.trim()
}

export type FamilyChange =
  | { type: 'family'; display_name: string; email?: string }
  | { type: 'person-create'; person: PersonInput }
  | { type: 'person-update'; person_id: string; person: PersonInput }
  | { type: 'person-remove'; person_id: string }
  | { type: 'preference'; target_id: string; key: string; answer: PreferenceAnswer }
  | { type: 'ranking'; person_id: string; workshop_ids: readonly string[] }
  | { type: 'signup' | 'interest'; person_id: string; workshop_id: string; selected: boolean }

export type FamilyDetailActions = { change: (change: FamilyChange) => Promise<void> }

/** REST envelope; the shared widgets consume only data. */
export type FamilyRepresentation = {
  data: FamilyDetailData
  resource_etags: Readonly<Record<string, string>>
}
