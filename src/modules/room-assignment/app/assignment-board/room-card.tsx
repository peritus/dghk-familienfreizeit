import { OrganiserLink } from '../../../../app/components/organiser-link.js'
import { BedIcon } from '../../../../app/components/bed-icons.js'
import { Card } from '../../../../app/components/ui/card.js'
import { RoomCapacitySummary } from '../../../../app/components/ui/room-capacity-summary.js'
import { Tag } from '../../../../app/components/ui/tag.js'
import { organiserPathWithHash, organiserPaths } from '../../../../organiser/routes.js'
import type { FamilyView, RoomView } from '../types.js'
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <OrganiserLink
              className="text-xl font-heading underline decoration-black/25 underline-offset-4 hover:decoration-black"
              href={organiserPathWithHash(organiserPaths.inventory(), `#room=${room.id}`)}
            >
              {room.name}
            </OrganiserLink>
            <p className="text-sm text-muted">{room.floor}</p>
          </div>
        </div>
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
          <RoomCapacitySummary capacity={room.capacity} free={room.free} />
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
