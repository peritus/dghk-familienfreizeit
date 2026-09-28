import { Badge } from '../../../app/components/ui/badge.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../../app/components/ui/card.js'
import { cn } from '../../../app/lib/utils.js'
import { ExpandableFamilyMemberList } from './expandable-family-member-list.js'
import type { RoomView } from './types.js'

export function RoomCard({
  room,
  expanded_family_ids: expandedFamilyIds,
  onToggleFamily,
}: {
  room: RoomView
  expanded_family_ids: ReadonlySet<string>
  onToggleFamily: (familyId: string) => void
}) {
  const free = room.capacity - room.occupied
  const isFull = free === 0
  return (
    <Card className={cn('p-0', isFull ? 'bg-secondary-background' : 'bg-white')}>
      <CardHeader className="p-5">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{room.name}</CardTitle>
          <Badge tone={isFull ? 'attention' : 'success'}>{isFull ? 'Voll' : `${free} frei`}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="flex flex-wrap gap-2">
          {room.features.map((feature) => (
            <Badge key={feature}>{feature}</Badge>
          ))}
        </div>
        {room.occupants.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-muted">Belegung</p>
            {room.occupants.map((family) => (
              <ExpandableFamilyMemberList
                key={family.id}
                family={family}
                expanded={expandedFamilyIds.has(family.id)}
                onToggle={() => onToggleFamily(family.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted">Noch keine Familie zugeordnet.</p>
        )}
      </CardContent>
    </Card>
  )
}
