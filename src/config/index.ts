import { familienfreizeit2027Profile } from './profiles/familienfreizeit-2027.js'
import { familienfreizeit2027Branding } from './profiles/familienfreizeit-2027-branding.js'
import type { ProfilePresentation } from './presentation.js'

/** The deployment selects exactly one statically composed occasion profile. */
export const activeProfile = familienfreizeit2027Profile

export const activeProfilePresentation = {
  meta: activeProfile.meta,
  branding: familienfreizeit2027Branding,
} satisfies ProfilePresentation

export type ActiveProfile = typeof activeProfile
