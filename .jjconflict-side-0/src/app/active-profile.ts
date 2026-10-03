import { familienfreizeit2027Meta } from '../config/profiles/luebben-2027/meta.js'
import { familienfreizeit2027Branding } from '../config/profiles/familienfreizeit-2027-branding.js'
import type { ProfilePresentation } from '../config/presentation.js'

export const activeProfilePresentation = {
  meta: familienfreizeit2027Meta,
  branding: familienfreizeit2027Branding,
} satisfies ProfilePresentation
