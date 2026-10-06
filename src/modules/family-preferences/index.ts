import { z } from 'zod'
import { defineModule } from '../define.js'
import { declaredFeatures } from '../../config/features.js'
import type {
  FamilyControlDefinition,
  FamilyPreferencesParams,
  LocalizedText,
  OccasionProfile,
} from '../../config/define.js'

const localizedText = z.union([z.string().min(1), z.record(z.string().min(1), z.string().min(1))])

const familyPreferencesParams = z.object({
  sections: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z][a-z0-9-]*$/),
        title: localizedText,
        intro: localizedText.nullable(),
        traits: z.array(z.string().min(1)),
        features: z.array(z.string().min(1)).default([]),
        phase: z.string().min(1).nullable(),
        late_contact: localizedText.nullable(),
      }),
    )
    .min(1),
  module_controls: z.array(
    z.object({
      key: z.string().regex(/^[a-z][a-z0-9-]*$/),
      section: z.string().regex(/^[a-z][a-z0-9-]*$/),
      title: localizedText,
      help: localizedText.nullable(),
    }),
  ),
})

export type { FamilyPreferencesParams, LocalizedText }

/** Profile-driven organiser and family preference sections and controls. */
export const familyPreferences = defineModule<FamilyPreferencesParams>({
  id: 'family-preferences',
  params: familyPreferencesParams,
  contribute: () => ({
    phases: [
      {
        id: 'family-preferences.accommodation-preferences',
        area: 'accommodation',
        opens: { kind: 'always' },
        target: true,
        closed_by_area: true,
      },
    ],
    features: [
      {
        id: 'family-preferences.family-room-wishes',
        audience: 'family',
        subject_kind: 'family',
        requires_features: [],
        requires_phases: [],
        activation_mode: 'all',
        organiser_counterpart: 'family-preferences.organiser-room-wishes',
      },
      {
        id: 'family-preferences.organiser-room-wishes',
        audience: 'organiser',
        subject_kind: 'family',
        requires_features: [],
        requires_phases: [],
        activation_mode: 'all',
      },
    ],
  }),
})

export function familyPreferencesConfig(
  profile: Pick<OccasionProfile, 'modules'>,
): FamilyPreferencesParams {
  const module = profile.modules.find(({ id }) => id === 'family-preferences')
  if (!module) throw new Error('family-preferences is not selected in this profile')
  return module.parameters as FamilyPreferencesParams
}

export function familyControlDefinitions(
  profile: Pick<OccasionProfile, 'modules'>,
): readonly FamilyControlDefinition[] {
  return profile.modules.flatMap((module) => module.contributions.family_controls ?? [])
}

/** The label key a family control writes. */
export function familyControlLabelKey(control: FamilyControlDefinition): string {
  if (control.control === 'workshop-sign-up') return 'signed-up-for'
  if (control.control === 'workshop-interest') return 'interested-in'
  return control.key
}

/**
 * Maps every label key written by a control in a family-governed section to the family feature
 * governing it (spec/architecture/features.md §4). Keys absent from the map are ungoverned.
 */
export function familyGovernedLabelKeys(
  profile: Pick<OccasionProfile, 'modules'>,
): ReadonlyMap<string, string> {
  const module = profile.modules.find(({ id }) => id === 'family-preferences')
  if (!module) return new Map()
  const params = module.parameters as FamilyPreferencesParams
  const features = declaredFeatures(profile.modules)
  const controls = new Map(
    familyControlDefinitions(profile).map((control) => [control.key, control]),
  )
  const governed = new Map<string, string>()
  for (const section of params.sections) {
    const feature = section.features.find((id) => features.get(id)?.audience === 'family')
    if (!feature) continue
    for (const trait of section.traits) governed.set(trait, feature)
    for (const control of params.module_controls.filter(
      ({ section: key }) => key === section.key,
    )) {
      const definition = controls.get(control.key)
      if (definition) governed.set(familyControlLabelKey(definition), feature)
    }
  }
  return governed
}
