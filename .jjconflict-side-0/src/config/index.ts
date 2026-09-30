import { familienfreizeit2027Profile } from './profiles/familienfreizeit-2027.js'

/** The deployment selects exactly one statically composed occasion profile. */
export const activeProfile = familienfreizeit2027Profile

export type ActiveProfile = typeof activeProfile
