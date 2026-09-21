import type { Entity, Label } from './fold.js'

export type ResolvedConstraint = {
  key: string
  holder_id: string
  value: string
  strength: 'required' | 'preferred' | null
  set_seq: number
}

export type Diagnostic = {
  id: string
  severity: 'error' | 'warning'
  subject_id: string
  message: string
}

/** Normalizes fixed resolver inputs; modules consume this result instead of event payloads. */
export function resolve(labels: readonly Label[], entities: readonly Entity[]) {
  const known = new Set(entities.map(({ id }) => id))
  const constraints: ResolvedConstraint[] = []
  const diagnostics: Diagnostic[] = []
  for (const label of labels) {
    if (['needs', 'provides', 'excludes', 'groups-with', 'separates-from'].includes(label.key)) {
      if (typeof label.value !== 'string' || label.value.length === 0)
        diagnostics.push({
          id: 'kernel.invalid-resolver-value',
          severity: 'error',
          subject_id: label.entity_id,
          message: 'resolver value must be a non-empty string',
        })
      else {
        constraints.push({
          key: label.key,
          holder_id: label.entity_id,
          value: label.value,
          strength: label.strength,
          set_seq: label.set_seq,
        })
        if (
          label.key !== 'needs' &&
          label.key !== 'provides' &&
          label.value.includes('_') &&
          !known.has(label.value)
        )
          diagnostics.push({
            id: 'kernel.dangling-reference',
            severity: 'error',
            subject_id: label.entity_id,
            message: `unknown entity: ${label.value}`,
          })
      }
    }
  }
  return {
    constraints: constraints.sort(
      (a, b) => a.set_seq - b.set_seq || a.holder_id.localeCompare(b.holder_id),
    ),
    diagnostics: diagnostics.sort(
      (a, b) => a.id.localeCompare(b.id) || a.subject_id.localeCompare(b.subject_id),
    ),
  }
}
