import { useId, useState } from 'react'
import { Badge } from '../../../../app/components/ui/badge.js'
import { Button } from '../../../../app/components/ui/button.js'
import { SuccessState } from '../../../../app/components/ui/success-state.js'
import type { BuildingView, FamilyView } from '../types.js'
import { RoomCard } from './room-card.js'

export function BuildingSection(props: {
  building: BuildingView
  initially_expanded: boolean
  onFix?: (family: FamilyView) => void
  onUnassign?: (family: FamilyView) => void
}) {
  const { building, initially_expanded: initiallyExpanded, onFix, onUnassign } = props
  const [expanded, setExpanded] = useState(initiallyExpanded)
  const roomsId = useId()
  const issueCount = building.requirement_issues + building.wish_issues
  const places = building.rooms.reduce((total, room) => total + room.capacity, 0)
  const occupied = building.rooms.reduce((total, room) => total + room.occupied, 0)
  return (
    <section className="space-y-4" aria-labelledby={`${roomsId}-heading`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div>
          <h2 id={`${roomsId}-heading`} className="text-2xl font-heading">
            {building.name}
          </h2>
          <p className="text-sm text-muted">
            {building.rooms.length} Zimmer, {building.family_count}{' '}
            {building.family_count === 1 ? 'Familie' : 'Familien'}, {occupied} von {places} Plätzen
            belegt
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {building.requirement_issues > 0 ? (
            <Badge tone="danger">
              {building.requirement_issues}{' '}
              {building.requirement_issues === 1
                ? 'Anforderung nicht erfüllt'
                : 'Anforderungen nicht erfüllt'}
            </Badge>
          ) : null}
          {building.wish_issues > 0 ? (
            <Badge tone="attention">
              {building.wish_issues}{' '}
              {building.wish_issues === 1 ? 'Wunsch nicht erfüllt' : 'Wünsche nicht erfüllt'}
            </Badge>
          ) : null}
          {issueCount === 0 ? <SuccessState>Alles in Ordnung</SuccessState> : null}
          <Button
            type="button"
            variant="neutral"
            size="sm"
            aria-expanded={expanded}
            aria-controls={roomsId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Zimmer ausblenden' : 'Zimmer anzeigen'}
          </Button>
        </div>
      </div>
      {expanded ? (
        <div id={roomsId} className="space-y-5">
          {[...new Set(building.rooms.map((room) => room.floor))].map((floor) => (
            <div key={floor} className="space-y-3">
              <h3 className="border-b border-rule pb-1 text-lg font-heading">{floor}</h3>
              <div className="grid gap-4 xl:grid-cols-2">
                {building.rooms
                  .filter((room) => room.floor === floor)
                  .map((room) => (
                    <RoomCard key={room.id} room={room} onFix={onFix} onUnassign={onUnassign} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
