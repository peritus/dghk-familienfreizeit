import { z } from 'zod'
import { defineModule } from '../define.js'
import type { FamilyPreferencesParams, LocalizedText } from '../../config/define.js'

const localizedText = z.union([z.string().min(1), z.record(z.string().min(1), z.string().min(1))])

const familyPreferencesParams = z.object({
  sections: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z][a-z0-9-]*$/),
        title: localizedText,
        intro: localizedText.nullable(),
        traits: z.array(z.string().min(1)),
        deadline_scope: z.enum(['accommodation', 'workshops']).nullable(),
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
  deadline_contact: z.object({
    accommodation: localizedText,
    workshops: localizedText,
  }),
})

export type { FamilyPreferencesParams, LocalizedText }

/** Profile-driven organiser and family preference sections and controls. */
export const familyPreferences = defineModule<FamilyPreferencesParams>({
  id: 'family-preferences',
  params: familyPreferencesParams,
  contribute: () => ({}),
})
