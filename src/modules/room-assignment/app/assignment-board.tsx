import { useState } from 'react'
import { FamilyCard, MetricsStrip, ScreenFrame, SectionHeading } from './components.js'
import { useOrganiser } from '../../../app/organiser/context.js'
import { deriveAssignmentReview } from './review.js'
import { RoomCard } from './room-card.js'
import type { BoardView } from './types.js'

export function AssignmentBoard({ view }: { view: BoardView }) {
  const [expandedFamilies, setExpandedFamilies] = useState<ReadonlySet<string>>(new Set())

  const toggleFamily = (familyId: string) => {
    setExpandedFamilies((current) => {
      const next = new Set(current)
      if (next.has(familyId)) next.delete(familyId)
      else next.add(familyId)
      return next
    })
  }

  return (
    <ScreenFrame
      eyebrow="Unterkunft · Belegungsboard"
      title="Wer schläft wo?"
      description="Prüfe die vom Resolver erzeugte Belegung und erkenne auf einen Blick, wer wo untergebracht ist."
    >
      <MetricsStrip
        items={[
          {
            value:
              view.buildings.flatMap(({ rooms }) => rooms.flatMap(({ occupants }) => occupants))
                .length + view.unplaced.length,
            label: 'Familien',
          },
          {
            value: view.buildings.flatMap(({ rooms }) =>
              rooms.flatMap(({ occupants }) => occupants),
            ).length,
            label: 'Platziert',
          },
          { value: view.unplaced.length, label: 'Offen', tone: 'attention' },
        ]}
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
                expanded={expandedFamilies.has(family.id)}
                onToggle={() => toggleFamily(family.id)}
              />
            ))}
          </div>
        </aside>

        <section className="space-y-8" aria-label="Gebäude und Räume">
          {view.buildings.map((building) => {
            const floors = [...new Set(building.rooms.map((room) => room.floor))]
            return (
              <section key={building.id} className="space-y-6" aria-label={building.name}>
                <SectionHeading
                  title={building.name}
                  detail={`${floors.length} ${floors.length === 1 ? 'Ebene' : 'Ebenen'} · ${building.rooms.length} Räume`}
                />
                {floors.map((floor) => (
                  <div key={floor ?? 'no-floor'} className="space-y-4">
                    <h3 className="border-b-2 border-black pb-2 text-lg">
                      {floor ?? 'Ohne Etage'}
                    </h3>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {building.rooms
                        .filter((room) => room.floor === floor)
                        .map((room) => (
                          <div key={room.id}>
                            <RoomCard
                              room={room}
                              expanded_family_ids={expandedFamilies}
                              onToggleFamily={toggleFamily}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </section>
            )
          })}
        </section>
      </div>
    </ScreenFrame>
  )
}

export function AssignmentBoardScreen() {
  const { world } = useOrganiser()
  if (!world) return null
  return <AssignmentBoard view={deriveAssignmentReview(world).board} />
}
