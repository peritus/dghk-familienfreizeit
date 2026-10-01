import { Badge } from '../../../../../app/components/shared/ui/badge.js'
import type { RequirementView } from '../../screens/assignment-board/types.js'

export function RequirementChip({ requirement }: { requirement: RequirementView }) {
  const suffix = requirement.strength === 'required' ? ' (erforderlich)' : ' (Wunsch)'
  if (requirement.met === true)
    return (
      <span className="inline-flex min-h-7 items-center rounded-base border border-muted px-2 py-0.5 text-xs text-muted">
        ✓ {requirement.label}
        {requirement.strength === 'preferred' ? ' (Wunsch)' : ''}
      </span>
    )
  if (requirement.met === false)
    return (
      <span
        className={
          requirement.strength === 'required'
            ? 'inline-flex min-h-7 items-center rounded-base border-2 border-black bg-danger px-2 py-0.5 text-xs font-bold'
            : 'inline-flex min-h-7 items-center rounded-base border border-dashed border-muted px-2 py-0.5 text-xs text-muted'
        }
      >
        {requirement.label} fehlt{requirement.strength === 'preferred' ? ' (Wunsch)' : ''}
      </span>
    )
  return (
    <Badge variant={requirement.strength === 'preferred' ? 'free' : 'default'}>
      {requirement.label}
      {suffix}
    </Badge>
  )
}

export function FixedBadge() {
  return <Badge variant="pinned">Fest zugeordnet</Badge>
}
