import { luebben2027Meta } from '../config/profiles/luebben-2027/meta.js'
import { luebben2027Branding } from '../config/profiles/luebben-2027/branding.js'
import type { ProfilePresentation } from '../config/presentation.js'

export const activeProfilePresentation = {
  meta: luebben2027Meta,
  branding: luebben2027Branding,
} satisfies ProfilePresentation
