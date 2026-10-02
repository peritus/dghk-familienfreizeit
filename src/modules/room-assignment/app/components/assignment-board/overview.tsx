import { OrganiserLink } from '../../../../../app/components/application/organiser-link.js'
import type { ReactNode } from 'react'
import { RoomSummary } from '../room-summary.js'
import { SuccessState } from '../../../../../app/components/shared/ui/success-state.js'
import { organiserPathWithHash, organiserPaths } from '../../../../../organiser/routes.js'
import type { FamilyView, RoomView } from '../../screens/assignment-board/types.js'
import { RequirementChip } from './chips.js'

export function FamilyOverviewRow({
  family,
  onFix,
}: {
  family: FamilyView
  onFix?: (family: FamilyView) => void
}) {
  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OrganiserLink
          className="font-bold underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
          href={organiserPaths.family_detail(family.id)}
        >
          {family.name}
        </OrganiserLink>
        {onFix ? (
          <button
            type="button"
            className="text-sm font-bold underline underline-offset-4"
            onClick={() => onFix(family)}
          >
            Fest zuordnen
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {family.requirements.map((requirement) => (
          <RequirementChip key={requirement.key} requirement={requirement} />
        ))}
      </div>
    </li>
  )
}

export function RoomOverviewRow({ room }: { room: RoomView }) {
  return (
    <li className="space-y-2 p-4">
      <RoomSummary
        name={room.name}
        building={room.building}
        floor={room.floor}
        href={organiserPathWithHash(organiserPaths.inventory(), `#room=${room.id}`)}
        capacity={room.capacity}
        free={room.free}
      />
      <FitHints room={room} />
    </li>
  )
}

export function FitHints({ room }: { room: RoomView }) {
  return (
    <div className="space-y-1 text-sm">
      {room.fit_hints.length > 0 ? (
        <ul className="space-y-1">
          {room.fit_hints.map((family) => (
            <li key={family.id} className="flex flex-wrap items-center gap-1.5">
              <OrganiserLink
                className="underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
                href={organiserPaths.family_detail(family.id)}
              >
                {family.name}
              </OrganiserLink>
              {family.requirements.filter(
                ({ strength, met }) => strength === 'required' && met !== true,
              ).length === 0 ? (
                <span className="text-muted">✓ Passt</span>
              ) : (
                family.requirements
                  .filter(({ strength, met }) => strength === 'required' && met !== true)
                  .map((requirement) => (
                    <RequirementChip key={requirement.key} requirement={requirement} />
                  ))
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-muted">Keine passende Familie</span>
      )}
    </div>
  )
}

export function OverviewList({ children, empty }: { children: ReactNode; empty: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-base border-2 border-border bg-secondary-background">
      {children || empty}
    </div>
  )
}

export function OverviewSuccess({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-base border border-border bg-secondary-background p-4">
      <SuccessState>{children}</SuccessState>
    </div>
  )
}
