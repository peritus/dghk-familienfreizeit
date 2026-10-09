import { useContext, useMemo } from 'react'
import { OrganiserContext } from '../../../../../app/organiser/context.js'
import { activeProfile } from '../../../../../config/index.js'
import { buildRoomAssignmentInput, roomFeasibility, type RoomAssignmentParams, type RoomAssignmentSection } from '../../../index.js'
import { attentionReason } from '../../../../../attention/reasons.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../../app/components/shared/ui/dialog.js'
import { AvailabilityBadge } from '../availability-badge.js'
import { Button } from '../../../../../app/components/shared/ui/button.js'
import { OrganiserLink } from '../../../../../app/components/application/organiser-link.js'
import { organiserPathWithHash, organiserPaths } from '../../../../../organiser/routes.js'
import type { FamilyView, RoomView } from '../../screens/assignment-board/types.js'
import { RequirementChip } from './chips.js'

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
  const context=useContext(OrganiserContext)
  const feasibility=useMemo(()=>{
    const module=activeProfile.modules.find(m=>m.id==='room-assignment')
    if(!context?.world||!module||!family)return []
    const params=module.parameters as RoomAssignmentParams
    const input=buildRoomAssignmentInput(context.world,params)
    const assignments=(context.current_plan?.sections['room-assignment'] as RoomAssignmentSection|undefined)?.assignments??[]
    return roomFeasibility(input,params,assignments,family.id)
  },[context?.world,context?.current_plan,family])
  if (!family) return null
  const candidates=feasibility.flatMap(candidate=>{const room=rooms.find(r=>r.id===candidate.room_id);return room&&room.id!==family.room_id?[{room,requirements:family.requirements,reasons:candidate.reasons,unmet_required:candidate.reasons.length,unmet_wishes:0}]:[]})
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
        <div className="mt-5 divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border">
          {candidates.map(({ room, requirements, reasons, unmet_required: unmetRequired }) => (
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
                <AvailabilityBadge free={room.free} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {requirements.map((requirement) => (
                  <RequirementChip key={requirement.key} requirement={requirement} />
                ))}
              </div>
              <ul className="text-sm">{reasons.map(reason=><li key={reason}>{attentionReason(reason)}</li>)}</ul>
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
