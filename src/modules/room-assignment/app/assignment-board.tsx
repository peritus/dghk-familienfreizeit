import { useState } from 'react'
import { StatsStrip } from '../../../app/components/ui/stats-strip.js'
import { OrganiserSectionHeader } from '../../../app/organiser/components/layout.js'
import { useOrganiser } from '../../../app/organiser/context.js'
import type { EventDraft } from '../../../events/types.js'
import { deriveAssignmentReview } from './review.js'
import type { AssignmentPrintView, BoardView, FamilyView, RoomView } from './types.js'
import { BuildingSection } from './assignment-board/building-section.js'
import { FixedAssignmentDialog } from './assignment-board/fixed-dialog.js'
import {
  FamilyOverviewRow,
  OverviewList,
  OverviewSuccess,
  RoomOverviewRow,
} from './assignment-board/overview.js'
import { AssignmentPrintLayout } from './assignment-board/print-layout.js'
import { ScreenFrame } from './components.js'

function event(type: string, payload: EventDraft['payload']): EventDraft {
  return {
    at: new Date().toISOString(),
    actor: 'organiser@example.test',
    subject: null,
    type,
    payload,
  }
}

function FamilyList(props: {
  families: readonly FamilyView[]
  onFix: (family: FamilyView) => void
  empty_message: string
}) {
  const { families, onFix, empty_message: emptyMessage } = props
  if (families.length === 0) return <OverviewSuccess>{emptyMessage}</OverviewSuccess>
  return (
    <OverviewList empty={null}>
      <ul className="divide-y-2 divide-black">
        {families.map((family) => (
          <FamilyOverviewRow
            key={family.id}
            family={family}
            onFix={
              family.requirements.some(
                ({ strength, met }) => strength === 'preferred' && met === false,
              )
                ? onFix
                : undefined
            }
          />
        ))}
      </ul>
    </OverviewList>
  )
}

function RoomList(props: { rooms: readonly RoomView[]; empty_message: string }) {
  const { rooms, empty_message: emptyMessage } = props
  if (rooms.length === 0) return <OverviewSuccess>{emptyMessage}</OverviewSuccess>
  return (
    <OverviewList empty={null}>
      <ul className="divide-y-2 divide-black">
        {rooms.map((room) => (
          <RoomOverviewRow key={room.id} room={room} />
        ))}
      </ul>
    </OverviewList>
  )
}

export function AssignmentBoard({ view, print }: { view: BoardView; print: AssignmentPrintView }) {
  const { stage } = useOrganiser()
  const [dialogFamily, setDialogFamily] = useState<FamilyView | null>(null)
  const allRooms = view.buildings.flatMap(({ rooms }) => rooms)
  const clearAssignment = (family: FamilyView) => {
    if (!family.room_id) return
    const token = `${family.id}_room`
    stage([
      event('LabelCleared', { entity_id: family.id, key: 'needs', value: token }),
      event('LabelCleared', { entity_id: family.room_id, key: 'provides', value: token }),
    ])
  }
  const fixAssignment = (family: FamilyView, room: RoomView) => {
    const token = `${family.id}_room`
    stage([
      event('LabelSet', {
        entity_id: family.id,
        key: 'needs',
        value: token,
        strength: 'required',
        note: null,
      }),
      event('LabelSet', {
        entity_id: room.id,
        key: 'provides',
        value: token,
        strength: null,
        note: null,
      }),
    ])
    setDialogFamily(null)
  }
  const withoutMatchIds = new Set(view.without_match.map(({ id }) => id))
  const withoutRoom = view.unplaced.filter(({ id }) => !withoutMatchIds.has(id))
  return (
    <>
      <div className="assignment-board-screen">
        <ScreenFrame title="Wer schläft wo?">
          <StatsStrip
            items={[
              { value: view.stats.families, label: 'Familien' },
              ...(view.stats.without_room > 0
                ? [
                    {
                      value: view.stats.without_room,
                      label: 'Ohne Zimmer',
                      tone: 'attention' as const,
                    },
                  ]
                : []),
              ...(view.stats.without_match > 0
                ? [
                    {
                      value: view.stats.without_match,
                      label: 'Ohne passendes Zimmer',
                      tone: 'attention' as const,
                    },
                  ]
                : []),
              ...(view.stats.fixed > 0
                ? [{ value: view.stats.fixed, label: 'Fest zugeordnet' }]
                : []),
              { value: view.stats.free_places, label: 'Freie Schlafplätze' },
            ]}
          />
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <section className="space-y-3">
                <OrganiserSectionHeader title="Ohne Zimmer" />
                <FamilyList
                  families={withoutRoom}
                  onFix={setDialogFamily}
                  empty_message={
                    view.stats.without_room === 0
                      ? 'Alle Familien haben ein Zimmer'
                      : 'Keine Familien in diesem Bereich'
                  }
                />
              </section>
              {view.without_match.length > 0 ? (
                <section className="space-y-3">
                  <OrganiserSectionHeader title="Ohne passendes Zimmer" />
                  <FamilyList
                    families={view.without_match}
                    onFix={setDialogFamily}
                    empty_message="Keine Familien in diesem Bereich"
                  />
                </section>
              ) : null}
            </div>
            <div className="space-y-8">
              <section className="space-y-3">
                <OrganiserSectionHeader title="Freie Zimmer" />
                <RoomList rooms={view.free_rooms} empty_message="Alle Zimmer sind belegt" />
              </section>
              <section className="space-y-3">
                <OrganiserSectionHeader title="Teilweise freie Zimmer" />
                <RoomList
                  rooms={view.partial_rooms}
                  empty_message="Alle belegten Zimmer sind voll"
                />
              </section>
            </div>
          </div>
          <div className="space-y-12">
            {view.buildings.map((building) => (
              <BuildingSection
                key={building.id}
                building={building}
                initially_expanded={building.requirement_issues + building.wish_issues > 0}
                onFix={setDialogFamily}
                onUnassign={clearAssignment}
              />
            ))}
          </div>
        </ScreenFrame>
      </div>
      <AssignmentPrintLayout buildings={view.buildings} print={print} />
      <FixedAssignmentDialog
        family={dialogFamily}
        rooms={allRooms}
        open={dialogFamily !== null}
        onOpenChange={(open) => {
          if (!open) setDialogFamily(null)
        }}
        onAssign={fixAssignment}
      />
    </>
  )
}

export function AssignmentBoardScreen() {
  const { world, previous_plan: previousPlan } = useOrganiser()
  if (!world) return null
  const review = deriveAssignmentReview(world, previousPlan ?? null)
  return <AssignmentBoard view={review.board} print={review.print} />
}
