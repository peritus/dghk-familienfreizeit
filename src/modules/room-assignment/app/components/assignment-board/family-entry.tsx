import { useState } from 'react'
import { OrganiserLink } from '../../../../app/components/application/organiser-link.js'
import { Button } from '../../../../app/components/shared/ui/button.js'
import { DestructiveActionDialog } from '../../../../app/components/shared/ui/destructive-action-dialog.js'
import { FixedBadge, RequirementChip } from './chips.js'
import type { FamilyView } from '../../screens/assignment-board/types.js'
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
  const [confirmUnassign, setConfirmUnassign] = useState(false)
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
            <>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => setConfirmUnassign(true)}
              >
                Zuordnung aufheben
              </Button>
              <DestructiveActionDialog
                open={confirmUnassign}
                onOpenChange={setConfirmUnassign}
                title={`${family.name} aus dem Zimmer entfernen?`}
                description="Die feste Zimmerzuordnung wird aufgehoben. Die Familie bleibt erhalten und kann neu zugeordnet werden."
                confirm_label="Zuordnung aufheben"
                onConfirm={() => onUnassign(family)}
              />
            </>
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
