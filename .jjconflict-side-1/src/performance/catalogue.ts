/** Stable names shared by the bench, operational metrics, and trace exports. */
/* eslint-disable @typescript-eslint/naming-convention -- Stable telemetry operation keys. */
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
  'attention.closed': 'closedAttentionContext',
  'phase.status': 'derivePhaseStatus',
  'closing.fill': 'fillClosingPayloads',
  'projection.shared': 'projectSharedWorld',
  'projection.family': 'projectFamilyWorld',
  'organiser.edit': 'prospective derive, solver input, solve, and attention',
  'request.organiser-log': 'GET organiser log (authentication, read, response)',
  'request.me:organiser': 'GET principal (organiser authentication)',
  'request.me:family': 'GET principal (family authentication and replay)',
  'request.organiser-apply': 'POST organiser batch (prepare, authorize, append, response)',
  'request.family-read': 'GET family resource (authentication, one replay, allowlisted response)',
  'request.family-write':
    'Family REST mutation (authentication, prepare, authorize, append, response)',
  'request.events:family': 'Historical family event append measurement',
} as const

export type PerformanceOperation = keyof typeof performanceCatalogue
