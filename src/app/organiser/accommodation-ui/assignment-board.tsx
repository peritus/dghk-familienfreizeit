import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/button.js'
import { Tabs } from '../../components/ui/tabs.js'
import { accommodationBoardFixture } from './fixtures.js'
import {
  FamilyCard,
  MetricsStrip,
  MoveRoomDialog,
  RoomCard,
  ScreenFrame,
  SectionHeading,
  TracePanel,
} from './components.js'
import type { BoardView, FamilyView, RoomView } from './types.js'

export function AssignmentBoard({
  view = accommodationBoardFixture,
  onMove,
}: {
  view?: BoardView
  onMove?: (family: FamilyView, room: RoomView) => void
}) {
  const [buildingId, setBuildingId] = useState(view.buildings[0]?.id ?? '')
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [selectedFamily, setSelectedFamily] = useState<FamilyView | null>(null)
  const building = view.buildings.find((item) => item.id === buildingId) ?? view.buildings[0]
  const floors = useMemo(
    () => [...new Set((building?.rooms ?? []).map((room) => room.floor))],
    [building],
  )

  return (
    <ScreenFrame
      eyebrow="Unterkunft · Belegungsboard"
      title="Wer schläft wo?"
      description="Prüfe den aktuellen Vorschlag, löse offene Platzierungen und sieh bei jeder Entscheidung, warum sie getroffen wurde."
      actions={<Button variant="neutral">Plan neu berechnen</Button>}
    >
      <MetricsStrip
        items={[
          { value: 5, label: 'Familien' },
          { value: 3, label: 'Platziert' },
          { value: 2, label: 'Offen', tone: 'attention' },
        ]}
      />

      <Tabs
        label="Gebäude"
        value={building?.id ?? ''}
        onChange={setBuildingId}
        options={view.buildings.map((item) => ({
          value: item.id,
          label: item.name,
          count: item.rooms.length,
        }))}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,2fr)]">
        <aside className="space-y-4" aria-labelledby="unplaced-title">
          <SectionHeading title="Nicht platziert" detail={`${view.unplaced.length} Familien`} />
          <div className="grid gap-3">
            {view.unplaced.map((family) => (
              <FamilyCard
                key={family.id}
                family={family}
                reason={view.unplaced_reasons[family.id]}
                action="Raum wählen"
                onAction={() => setSelectedFamily(family)}
              />
            ))}
          </div>
        </aside>

        <section className="space-y-8" aria-labelledby="rooms-title">
          <SectionHeading
            title={building?.name ?? 'Gebäude'}
            detail={`${floors.length} Ebenen · Räume und Belegung`}
          />
          {floors.map((floor) => (
            <div key={floor} className="space-y-4">
              <h3 className="border-b-2 border-black pb-2 text-lg">{floor}</h3>
              <div className="grid gap-4 xl:grid-cols-2">
                {(building?.rooms ?? [])
                  .filter((room) => room.floor === floor)
                  .map((room) => (
                    <div key={room.id}>
                      <RoomCard
                        room={room}
                        expanded={expandedRoom === room.id}
                        onToggle={() =>
                          setExpandedRoom((current) => (current === room.id ? null : room.id))
                        }
                        onMove={() => setSelectedFamily(view.unplaced[0] ?? null)}
                      />
                      {expandedRoom === room.id ? (
                        <TracePanel
                          traces={
                            view.traces[room.occupants[0]?.id ?? ''] ??
                            view.traces['family-braun'] ??
                            []
                          }
                        />
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {selectedFamily ? (
        <MoveRoomDialog
          family={selectedFamily}
          rooms={view.buildings.flatMap((item) => item.rooms)}
          onClose={() => setSelectedFamily(null)}
          onConfirm={(room) => {
            onMove?.(selectedFamily, room)
            setSelectedFamily(null)
          }}
        />
      ) : null}
    </ScreenFrame>
  )
}
