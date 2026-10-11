/** Stable names shared by the bench, operational metrics, and trace exports. */
export const performanceCatalogue = {
  'events.derive': 'derive',
  'events.fold': 'foldEventLog / normalizeEvents',
  'events.resolve': 'resolveFoldedWorld / worldFromState / resolve',
  'events.complete': 'completeDerivedWorld / world summaries and checks',
  'events.prepare': 'prepareEventBatch / admitProfileProposal',
  'events.authorize': 'authorizeEventBatch',
  'events.read': 'readEvents',
  'events.append': 'appendCanonicalEvents',
  'events.parse': 'parseEvent / payload validation',
  'auth.principal': 'currentPrincipal',
  'solver.input': 'buildSolverInput',
  'solver.solve': 'solve',
  'solver.preflight': 'all registered preflight checks',
  'attention.evaluate': 'profileAttention / composeAttention',
  'closing.fill': 'fillClosingPayloads',
  'projection.shared': 'projectSharedWorld',
  'projection.family': 'projectFamilyWorld',
  'organiser.edit': 'prospective derive, solver input, solve, and attention',
} as const

export type PerformanceOperation = keyof typeof performanceCatalogue
