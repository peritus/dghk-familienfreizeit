export type FixedDecisionRef = {
  subject_id: string
  target_id: string
}

export type FixedDecisionReviewStatus = 'same' | 'overrides' | 'no-automatic' | 'invalid'

export type FixedDecisionReview = {
  subject_id: string
  fixed_target_id: string
  automatic_target_ids: readonly string[]
  status: FixedDecisionReviewStatus
}

/**
 * Compares event-backed fixed decisions with the result of the same pure
 * calculation with fixed decisions omitted. The helper knows nothing about
 * rooms, workshops, or attendance; callers only adapt their domain identities.
 */
export function compareFixedDecisions(
  fixed: readonly FixedDecisionRef[],
  automatic: readonly FixedDecisionRef[],
  invalid: ReadonlySet<string> = new Set(),
): readonly FixedDecisionReview[] {
  const automaticBySubject = new Map<string, string[]>()
  for (const decision of automatic) {
    const targets = automaticBySubject.get(decision.subject_id) ?? []
    targets.push(decision.target_id)
    automaticBySubject.set(decision.subject_id, targets)
  }
  return Object.freeze(
    fixed
      .slice()
      .sort(
        (left, right) =>
          left.subject_id.localeCompare(right.subject_id) ||
          left.target_id.localeCompare(right.target_id),
      )
      .map((decision) => {
        const automaticTargets = Object.freeze(
          [...new Set(automaticBySubject.get(decision.subject_id) ?? [])].sort((a, b) =>
            a.localeCompare(b),
          ),
        )
        const key = `${decision.subject_id}|${decision.target_id}`
        const status: FixedDecisionReviewStatus = invalid.has(key)
          ? 'invalid'
          : automaticTargets.includes(decision.target_id)
            ? 'same'
            : automaticTargets.length > 0
              ? 'overrides'
              : 'no-automatic'
        return Object.freeze({
          subject_id: decision.subject_id,
          fixed_target_id: decision.target_id,
          automatic_target_ids: automaticTargets,
          status,
        })
      }),
  )
}
