import { kernelProfile } from './profiles/kernel.js'

/** The deployment selects exactly one statically composed occasion profile. */
export const activeProfile = kernelProfile

export type ActiveProfile = typeof activeProfile
