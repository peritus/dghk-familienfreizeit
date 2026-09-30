import { BedIcon } from '../../../../app/components/shared/icons/bed-icons.js'
import { Card } from '../../../../app/components/shared/ui/card.js'
import { RoomSummary } from '../room-summary.js'
import { Tag } from '../../../../app/components/shared/ui/tag.js'
import { organiserPathWithHash, organiserPaths } from '../../../../organiser/routes.js'
import type { FamilyView, RoomView } from '../../screens/assignment-board/types.js'
import { FamilyEntry } from './family-entry.js'

export function RoomCard({
  room,
  onFix,
  onUnassign,
}: {
  room: RoomView
  onFix?: (family: FamilyView) => void
  onUnassign?: (family: FamilyView) => void
}) {
  const empty = room.occupied === 0
  return (
    <Card className={empty ? 'border-dashed bg-transparent p-0' : 'bg-white p-0'}>
      <div className="space-y-3 p-5">
        <RoomSummary
          name={room.name}
          building={room.building}
          floor={room.floor}
          href={organiserPathWithHash(organiserPaths.inventory(), `#room=${room.id}`)}
          capacity={room.capacity}
          free={room.free}
        />
        <div className="flex flex-wrap gap-1.5 text-sm text-muted">
          {room.features.map((feature) => (
            <Tag key={feature}>{feature}</Tag>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-3" aria-label="Betten">
            {room.beds.map((bed) => (
              <span key={bed.bed_type} className="inline-flex items-center gap-1">
                <BedIcon bed_type={bed.bed_type} aria-hidden="true" className="h-6 w-8" />
                {bed.count}×
              </span>
            ))}
          </div>
        </div>
      </div>
      {room.occupants.length > 0 ? (
        <ul className="border-t-2 border-black px-5">
          {room.occupants.map((family) => (
            <FamilyEntry key={family.id} family={family} onFix={onFix} onUnassign={onUnassign} />
          ))}
        </ul>
      ) : (
        <p className="border-t-2 border-dashed border-muted px-5 py-3 text-muted">
          Noch keine Familie zugeordnet.
        </p>
      )}
    </Card>
  )
}
