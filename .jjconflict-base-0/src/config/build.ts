declare const buildRevisionValue: string
declare const compatibilityRevisionValue: number

/** Deployment identity injected once into both Worker and browser bundles. */
export const buildRevision = buildRevisionValue

export const compatibilityRevision = compatibilityRevisionValue
