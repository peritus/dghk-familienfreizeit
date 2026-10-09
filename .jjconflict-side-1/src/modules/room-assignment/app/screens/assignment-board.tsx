import { useAttention, AttentionNotices } from '../../../../app/organiser/attention.js'
import { CollectionList } from '../../../../app/components/shared/ui/collection-list.js'
import { SuccessState } from '../../../../app/components/shared/ui/success-state.js'
import { useState } from 'react'
import { ClosedAreaDifferences } from '../../../../app/organiser/components/area-closing.js'
import { StatsStrip } from '../../../../app/components/shared/ui/stats-strip.js'
import {
  ScreenLayout,
  ScreenHeader,
  SectionHeader,
} from '../../../../app/components/shared/ui/screen-layout.js'
import { useOrganiser } from '../../../../app/organiser/context.js'
import type { EventDraft } from '../../../../events/types.js'
import { deriveAssignmentReview } from './assignment-board/review.js'
import type {
  AssignmentPrintView,
  BoardView,
  FamilyView,
  RoomView,
} from './assignment-board/types.js'
import { BuildingSection } from '../components/assignment-board/building-section.js'
import { FixedAssignmentDialog } from '../components/assignment-board/fixed-dialog.js'
import { FamilyOverviewRow, RoomOverviewRow } from '../components/assignment-board/overview.js'
import { AssignmentPrintLayout } from '../components/assignment-board/print-layout.js'
import { AccommodationNavigation } from '../../../../app/organiser/components/accommodation-navigation.js'
import { AccommodationWorkflow } from '../../../../app/organiser/components/accommodation-workflow.js'
import { ActionableNotices, ActionableNotice } from '../../../../app/components/shared/ui/notice.js'
import { Button } from '../../../../app/components/shared/ui/button.js'

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
  if (families.length === 0) return <SuccessState>{emptyMessage}</SuccessState>
  return (
    <CollectionList>
      <ul className="divide-y-2 divide-border">
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
    </CollectionList>
  )
}

function RoomList(props: { rooms: readonly RoomView[]; empty_message: string }) {
  const { rooms, empty_message: emptyMessage } = props
  if (rooms.length === 0) return <SuccessState>{emptyMessage}</SuccessState>
  return (
    <CollectionList>
      <ul className="divide-y-2 divide-border">
        {rooms.map((room) => (
          <RoomOverviewRow key={room.id} room={room} />
        ))}
      </ul>
    </CollectionList>
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
        <ScreenLayout
          secondary_navigation={<AccommodationNavigation />}
          header={<ScreenHeader title="Wer schläft wo?" />}
          notices={
            <ActionableNotices>
          <AttentionNotices area="accommodation" scope="accommodation" />
              {view.stats.without_room > 0 ? (
                <ActionableNotice
                  title={`${view.stats.without_room} Familien ohne Zimmer`}
                  action={
                    <Button
                      variant="neutral"
                      onClick={() => {
                        const target = document.getElementById('unplaced-families')
                        target?.scrollIntoView({ block: 'start' })
                        target?.focus()
                      }}
                    >
                      Familien prüfen
                    </Button>
                  }
                >
                  Prüfe die Schlafplätze und die Anforderungen der betroffenen Familien.
                </ActionableNotice>
              ) : null}
              <ClosedAreaDifferences area="accommodation" />
            </ActionableNotices>
          }
          workflow={<AccommodationWorkflow />}
          summary={
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
          }
        >
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              <section className="space-y-3">
                <SectionHeader title="Ohne Zimmer" />
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
                  <SectionHeader title="Ohne passendes Zimmer" />
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
                <SectionHeader title="Freie Zimmer" />
                <RoomList rooms={view.free_rooms} empty_message="Alle Zimmer sind belegt" />
              </section>
              <section className="space-y-3">
                <SectionHeader title="Teilweise freie Zimmer" />
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
        </ScreenLayout>
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
  const { world,current_plan:plan } = useOrganiser()
  const attention=useAttention()
  if (!world||!plan) return null
  const review = deriveAssignmentReview(world,plan,attention)
  return <AssignmentBoard view={review.board} print={review.print} />
}
