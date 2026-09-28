import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../app/components/ui/dialog.js'
import { Button } from '../../../../app/components/ui/button.js'
import { Badge } from '../../../../app/components/ui/badge.js'
import { OrganiserLink } from '../../../../app/components/organiser-link.js'
import { organiserPathWithHash, organiserPaths } from '../../../../organiser/routes.js'
import type { FamilyView, RequirementView, RoomView } from '../types.js'
import { RequirementChip } from './chips.js'

function evaluatedRequirements(family: FamilyView, room: RoomView): RequirementView[] {
  const occupants = room.occupants.map(({ id }) => id)
  return family.requirements.map((requirement) => ({
    ...requirement,
    met:
      requirement.kind === 'structural' && requirement.structural === 'no-other-families'
        ? occupants.every((id) => id === family.id)
        : requirement.capability_key
          ? room.feature_keys.includes(requirement.capability_key)
          : true,
  }))
}

export function FixedAssignmentDialog({
  family,
  rooms,
  open,
  onOpenChange,
  onAssign,
}: {
  family: FamilyView | null
  rooms: readonly RoomView[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (family: FamilyView, room: RoomView) => void
}) {
  if (!family) return null
  const candidates = rooms
    .filter((room) => room.id !== family.room_id && room.free >= family.bed_demand)
    .map((room) => {
      const requirements = evaluatedRequirements(family, room)
      return {
        room,
        requirements,
        unmet_required: requirements.filter(
          ({ strength, met }) => strength === 'required' && met === false,
        ).length,
        unmet_wishes: requirements.filter(
          ({ strength, met }) => strength === 'preferred' && met === false,
        ).length,
      }
    })
    .sort(
      (left, right) =>
        left.unmet_required - right.unmet_required ||
        left.unmet_wishes - right.unmet_wishes ||
        left.room.free - right.room.free,
    )
  const hasRequirementMatch = candidates.some(
    ({ unmet_required: unmetRequired }) => unmetRequired === 0,
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{family.name} fest zuordnen</DialogTitle>
          <DialogDescription>
            Eine feste Zuordnung hat Vorrang vor der automatischen Verteilung. Nur als letzten
            Ausweg nutzen.
          </DialogDescription>
          {!hasRequirementMatch && candidates.length > 0 ? (
            <p className="border-l-4 border-danger pl-3 font-bold">
              Kein Zimmer erfüllt alle Anforderungen der Familie.
            </p>
          ) : null}
          {candidates.length === 0 ? (
            <p className="border-l-4 border-danger pl-3 font-bold">
              Kein Zimmer hat {family.bed_demand} {family.bed_demand === 1 ? 'Platz' : 'Plätze'}{' '}
              frei.
            </p>
          ) : null}
        </DialogHeader>
        <div className="mt-5 divide-y-2 divide-black overflow-hidden rounded-base border-2 border-black">
          {candidates.map(({ room, requirements, unmet_required: unmetRequired }) => (
            <div key={room.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <OrganiserLink
                    className="font-bold underline underline-offset-4"
                    href={organiserPathWithHash(organiserPaths.inventory(), `#room=${room.id}`)}
                  >
                    {room.name}
                  </OrganiserLink>
                  <p className="text-sm text-muted">
                    {room.building} · {room.floor}
                  </p>
                  {room.occupants.length > 0 ? (
                    <p className="text-sm text-muted">
                      Belegt von {room.occupants.map(({ name }) => name).join(', ')}
                    </p>
                  ) : null}
                </div>
                <Badge variant="free">{room.free} frei</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {requirements.map((requirement) => (
                  <RequirementChip key={requirement.key} requirement={requirement} />
                ))}
              </div>
              <Button type="button" onClick={() => onAssign(family, room)}>
                {unmetRequired > 0 ? 'Trotzdem zuordnen' : 'Zuordnen'}
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="neutral">
                Abbrechen
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
