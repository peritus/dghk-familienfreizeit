import { OrganiserLink } from '../../../../app/components/organiser-link.js'
import { Button } from '../../../../app/components/ui/button.js'
import { FixedBadge, RequirementChip } from './chips.js'
import type { FamilyView } from '../types.js'
import { organiserPaths } from '../../../../organiser/routes.js'

export function FamilyEntry({
  family,
  onFix,
  onUnassign,
}: {
  family: FamilyView
  onFix?: (family: FamilyView) => void
  onUnassign?: (family: FamilyView) => void
}) {
  const unmetWish = family.requirements.some(
    ({ strength, met }) => strength === 'preferred' && met === false,
  )
  return (
    <li className="space-y-2 border-t border-rule py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <OrganiserLink
            className="font-bold underline decoration-black/25 underline-offset-4 hover:decoration-black"
            href={organiserPaths.family_detail(family.id)}
          >
            {family.name}
          </OrganiserLink>
          <span className="text-sm text-muted">
            · {family.people.length} {family.people.length === 1 ? 'Person' : 'Personen'}
          </span>
          {family.fixed ? <FixedBadge /> : null}
        </div>
      </div>
      {family.requirements.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {family.requirements.map((requirement) => (
            <RequirementChip key={requirement.key} requirement={requirement} />
          ))}
        </div>
      ) : null}
      {onUnassign || (onFix && (unmetWish || family.fixed)) ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {family.fixed && onUnassign ? (
            <Button type="button" variant="neutral" size="sm" onClick={() => onUnassign(family)}>
              Zuordnung aufheben
            </Button>
          ) : null}
          {!family.fixed && onFix && (unmetWish || family.status?.label === 'Nicht platziert') ? (
            <Button type="button" variant="neutral" size="sm" onClick={() => onFix(family)}>
              Fest zuordnen
            </Button>
          ) : null}
          {family.fixed && onFix ? (
            <Button type="button" variant="neutral" size="sm" onClick={() => onFix(family)}>
              Anderem Zimmer zuordnen
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
