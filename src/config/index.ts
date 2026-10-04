import { luebben2027Profile } from './profiles/luebben-2027/index.js'

/** The deployment selects exactly one statically composed occasion profile. */
export const activeProfile = luebben2027Profile

export type ActiveProfile = typeof activeProfile
