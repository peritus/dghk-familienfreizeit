import { useEffect, useRef, useState } from 'react'
import { BedIcon } from '../../components/shared/icons/bed-icons.js'
import { DestructiveActionDialog } from '../../components/shared/ui/destructive-action-dialog.js'
import { Card, CardContent } from '../../components/shared/ui/card'
import { Button } from '../../components/shared/ui/button'
import { Badge } from '../../components/shared/ui/badge.js'
import { SegmentedControl } from '../../components/shared/ui/segmented-control.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import { StatsStrip } from '../../components/shared/ui/stats-strip.js'
import { Tag } from '../../components/shared/ui/tag.js'
import { OrganiserScreenHeader } from '../components/layout.js'
import { CollectionCreateAction } from '../components/collection-create-action.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { pluralDe } from '../../lib/plural-de.js'
import { useOrganiser } from '../context.js'
import {
  inventoryWorld,
  type InventoryBed,
  type InventoryBuilding,
  type InventoryRoom,
  type RoomInventoryParams,
} from '../../../modules/room-inventory/index.js'
import type { EventDraft } from '../../../events/types.js'
import type { Label } from '../../../events/fold.js'
import { activeProfile } from '../../../config/index.js'
import { accommodationTrack } from '../../../modules/room-assignment/app/accommodation-track.js'
import { SecondaryNavigation } from '../components/navigation.js'
import { organiserPaths } from '../../../organiser/routes.js'
import {
  labelText,
  roomPropertyDefinitions,
  roomTraitDefaults,
  roomTraitLabelChanges,
  roomTraitValuesFromLabels,
  sleepsForBedType,
  traitOptions,
  validateRoomTraitValues,
  type RoomTraitValues,
  type TraitInput,
} from './inventory-events.js'

type NewBedPayload = { label: string; bed_type: string; sleeping_room: number | null }

type BedUpdatePayload = {
  room_id: string
  label: string
  bed_type: string
  sleeps: 1 | 2
  sort_key: number
  sleeping_room: number | null
}

function id(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}${random.replaceAll('-', '').slice(0, 16)}`
}

function draft(actor: string, type: string, payload: EventDraft['payload']): EventDraft {
  return { at: new Date().toISOString(), actor, subject: null, type, payload }
}

// Floors don't apply to a Bungalow or Schlaffass (D39/Q4).
const floorlessRoomTypes = new Set(['bungalow', 'schlaffass'])

export function Inventory() {
  useDocumentTitle('Unterkunft · Familienfreizeit')
  const { world, state, stage, phases } = useOrganiser()
  const config = selectedInventoryConfig()
  const floors = config.floors.map((value) => ({
    value,
    label: config.copy.floors[value] ?? value,
  }))
  const roomTypes = config.room_types.map((value) => ({
    value,
    label: config.copy.room_types[value] ?? value,
  }))
  const bedTypes = config.bed_types.map((value) => ({
    value,
    label: config.copy.bed_types[value] ?? value,
  }))
  const summary = inventoryWorld(world!)
  const [addingBuilding, setAddingBuilding] = useState(false)
  const [openRoomForms, setOpenRoomForms] = useState<Record<string, boolean>>({})
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const handledRoomHash = useRef(false)

  useEffect(() => {
    if (handledRoomHash.current) return
    const match = window.location.hash.match(/^#room=([^&]+)$/)
    if (!match) return
    const roomId = decodeURIComponent(match[1] ?? '')
    if (!summary.rooms.some(({ id: candidateId }) => candidateId === roomId)) return
    handledRoomHash.current = true
    window.setTimeout(() => {
      setOpenRooms({ [roomId]: true })
      window.setTimeout(
        () => document.getElementById(`room-${roomId}`)?.scrollIntoView({ block: 'start' }),
        0,
      )
    }, 0)
  }, [summary.rooms])

  function stageInventoryEvents(events: readonly Pick<EventDraft, 'type' | 'payload'>[]): void {
    if (!state.principal_email) return
    stage(events.map(({ type, payload }) => draft(state.principal_email!, type, payload)))
    setError(null)
  }

  function addBuilding(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return 'Gib dem Gebäude einen Namen.'
    stageInventoryEvents([
      draft(state.principal_email ?? '', 'BuildingAdded', {
        building_id: id('bld_'),
        name: trimmed,
        sort_key: summary.buildings.length + 1,
      }),
    ])
    setAddingBuilding(false)
    return null
  }

  function addRoom(
    buildingId: string,
    payload: {
      number: string
      floor: string | null
      room_type: string
    },
    values: RoomTraitValues,
  ) {
    const number = payload.number.trim()
    if (!number) return 'Gib eine Nummer oder einen Namen ein.'
    const duplicate = summary.rooms.some(
      (room) => room.building_id === buildingId && room.number === number,
    )
    if (duplicate) {
      const buildingName = summary.buildings.find(({ id: bid }) => bid === buildingId)?.name ?? ''
      return `In ${buildingName} gibt es schon ein Zimmer ${number}.`
    }
    const traitError = validateRoomTraitValues(values)
    if (traitError) return traitError
    const roomId = id('rm_')
    stageInventoryEvents([
      draft(state.principal_email ?? '', 'RoomAdded', {
        room_id: roomId,
        building_id: buildingId,
        number,
        floor: payload.floor,
        room_type: payload.room_type,
        sort_key: summary.rooms.length + 1,
      }),
      ...roomTraitLabelChanges(roomId, values),
    ])
    setOpenRoomForms((current) => ({ ...current, [buildingId]: false }))
    setOpenRooms((current) => ({ ...current, [roomId]: true }))
    return null
  }

  function addBed(roomId: string, payload: NewBedPayload) {
    const label = payload.label.trim()
    stageInventoryEvents([
      draft(state.principal_email ?? '', 'BedAdded', {
        bed_id: id('bed_'),
        room_id: roomId,
        label,
        bed_type: payload.bed_type,
        sleeps: sleepsForBedType(payload.bed_type),
        sort_key: summary.beds.filter((bed) => bed.room_id === roomId).length + 1,
        sleeping_room: payload.sleeping_room,
      }),
    ])
  }

  function updateBuilding(buildingId: string, name: string, sortKey: number): void {
    stageInventoryEvents([
      { type: 'BuildingUpdated', payload: { building_id: buildingId, name, sort_key: sortKey } },
    ])
  }

  function removeBuilding(buildingId: string): void {
    stageInventoryEvents([
      { type: 'BuildingRemoved', payload: { building_id: buildingId, reason: null } },
    ])
  }

  function updateRoom(
    roomId: string,
    payload: {
      building_id: string
      number: string
      floor: string | null
      room_type: string
      sort_key: number
    },
    values: RoomTraitValues,
    labels: Parameters<typeof roomTraitLabelChanges>[2],
  ): string | null {
    const traitError = validateRoomTraitValues(values)
    if (traitError) return traitError
    stageInventoryEvents([
      { type: 'RoomUpdated', payload: { room_id: roomId, ...payload } },
      ...roomTraitLabelChanges(roomId, values, labels),
    ])
    return null
  }

  function removeRoom(roomId: string): void {
    stageInventoryEvents([{ type: 'RoomRemoved', payload: { room_id: roomId, reason: null } }])
  }

  function updateBed(bedId: string, payload: BedUpdatePayload): void {
    stageInventoryEvents([{ type: 'BedUpdated', payload: { bed_id: bedId, ...payload } }])
  }

  function removeBed(bedId: string): void {
    stageInventoryEvents([{ type: 'BedRemoved', payload: { bed_id: bedId, reason: null } }])
  }

  const hasBuildings = summary.buildings.length > 0

  return (
    <div className="space-y-8">
      <SecondaryNavigation
        aria_label="Unterbringungsbereiche"
        items={[
          {
            href: organiserPaths.inventory(),
            active_paths: [organiserPaths.inventory()],
            label: 'Unterkunft',
          },
          {
            href: organiserPaths.assignment_board(),
            active_paths: [organiserPaths.assignment_board()],
            label: 'Belegung',
          },
        ]}
      />
      <WorkflowStepper
        aria_label="Ablauf der Unterbringung"
        steps={accommodationTrack({ phases: phases ?? [], meta: activeProfile.meta })}
      />
      <OrganiserScreenHeader
        title="Unterkunft"
        actions={
          <CollectionCreateAction
            label="Gebäude hinzufügen"
            title="Gebäude hinzufügen"
            description="Lege eine Unterkunft an; Zimmer und Betten ergänzt du anschließend darin."
            open={addingBuilding}
            on_open_change={setAddingBuilding}
          >
            <NewBuildingForm
              heading={hasBuildings ? undefined : 'Noch keine Unterkunft angelegt'}
              intro={
                hasBuildings
                  ? undefined
                  : 'Fang mit einem Gebäude an. Zimmer und Betten fügst du danach direkt darin hinzu.'
              }
              onCancel={() => setAddingBuilding(false)}
              onSubmit={addBuilding}
            />
          </CollectionCreateAction>
        }
      />
      <p className="-mt-4 text-muted">Gebäude, Zimmer und Betten für diese Freizeit.</p>

      {error ? (
        <p
          role="alert"
          className="rounded-base border-2 border-border bg-danger text-danger-foreground p-3"
        >
          {error}
        </p>
      ) : null}

      {hasBuildings ? (
        <StatsStrip
          items={[
            { value: summary.buildings.length, label: 'Gebäude' },
            { value: summary.rooms.length, label: 'Zimmer' },
            { value: summary.beds.length, label: 'Betten' },
            { value: summary.capacity, label: 'Schlafplätze' },
            { value: formatEuro(summary.cost_eur, 0), label: 'Kosten pro Nacht' },
          ]}
        />
      ) : null}

      <div className="space-y-10">
        {summary.buildings.map((building) => {
          const rooms = summary.rooms.filter((room) => room.building_id === building.id)
          return (
            <BuildingSection
              key={building.id}
              building={building}
              rooms={rooms}
              beds={summary.beds}
              world={world}
              floors={floors}
              room_types={roomTypes}
              bed_types={bedTypes}
              room_form_open={openRoomForms[building.id] ?? false}
              onToggleRoomForm={() =>
                setOpenRoomForms((current) => ({
                  ...current,
                  [building.id]: !current[building.id],
                }))
              }
              open_rooms={openRooms}
              onToggleRoom={(roomId) =>
                setOpenRooms((current) => ({ ...current, [roomId]: !current[roomId] }))
              }
              onUpdateBuilding={updateBuilding}
              onRemoveBuilding={removeBuilding}
              onAddRoom={addRoom}
              onUpdateRoom={updateRoom}
              onRemoveRoom={removeRoom}
              onAddBed={addBed}
              onUpdateBed={updateBed}
              onRemoveBed={removeBed}
            />
          )
        })}
      </div>
    </div>
  )
}

function selectedInventoryConfig(): RoomInventoryParams {
  const module = activeProfile.modules.find((candidate) => candidate.id === 'room-inventory')
  if (!module?.parameters) throw new Error('room-inventory is not selected in this profile')
  return module.parameters as RoomInventoryParams
}

function NewBuildingForm({
  heading,
  intro,
  onCancel,
  onSubmit,
}: {
  heading?: string
  intro?: string
  onCancel?: () => void
  onSubmit: (name: string) => string | null
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <Card className="bg-secondary-background">
      <CardContent>
        {heading ? <h2 className="text-2xl font-heading">{heading}</h2> : null}
        {intro ? <p className="mt-1 text-muted">{intro}</p> : null}
        <form
          className={heading ? 'mt-4 space-y-3' : 'space-y-3'}
          onSubmit={(event) => {
            event.preventDefault()
            const result = onSubmit(name)
            if (result) return setError(result)
            setName('')
            setError(null)
          }}
        >
          <label className="grid gap-1">
            <span className="font-bold">Name des Gebäudes</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Haupthaus"
              className="min-h-11 rounded-base border-2 border-border px-3"
            />
          </label>
          {error ? (
            <p role="alert" className="font-bold text-danger-foreground">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="neutral" onClick={onCancel}>
                Abbrechen
              </Button>
            ) : null}
            <Button type="submit">Gebäude anlegen</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function BuildingSection({
  building,
  rooms,
  beds,
  world,
  floors,
  room_types: roomTypes,
  bed_types: bedTypes,
  room_form_open: roomFormOpen,
  onToggleRoomForm,
  open_rooms: openRooms,
  onToggleRoom,
  onUpdateBuilding,
  onRemoveBuilding,
  onAddRoom,
  onUpdateRoom,
  onRemoveRoom,
  onAddBed,
  onUpdateBed,
  onRemoveBed,
}: {
  building: InventoryBuilding
  rooms: readonly InventoryRoom[]
  beds: readonly InventoryBed[]
  world: ReturnType<typeof useOrganiser>['world']
  floors: readonly { value: string; label: string }[]
  room_types: readonly { value: string; label: string }[]
  bed_types: readonly { value: string; label: string }[]
  room_form_open: boolean
  onToggleRoomForm: () => void
  open_rooms: Record<string, boolean>
  onToggleRoom: (roomId: string) => void
  onUpdateBuilding: (id: string, name: string, sortKey: number) => void
  onRemoveBuilding: (id: string) => void
  onAddRoom: (
    buildingId: string,
    payload: { number: string; floor: string | null; room_type: string },
    values: RoomTraitValues,
  ) => string | null
  onUpdateRoom: (
    roomId: string,
    payload: {
      building_id: string
      number: string
      floor: string | null
      room_type: string
      sort_key: number
    },
    values: RoomTraitValues,
    labels: readonly Label[],
  ) => string | null
  onRemoveRoom: (id: string) => void
  onAddBed: (roomId: string, payload: NewBedPayload) => void
  onUpdateBed: (id: string, payload: BedUpdatePayload) => void
  onRemoveBed: (id: string) => void
}) {
  const places = rooms.reduce((sum, room) => sum + room.place_count, 0)
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-2xl font-heading">{building.name}</h2>
          <p className="text-muted">
            {rooms.length} {pluralDe(rooms.length, 'Zimmer', 'Zimmer')}, {places}{' '}
            {pluralDe(places, 'Schlafplatz', 'Schlafplätze')}
          </p>
          <BuildingEditor
            building={building}
            onSave={onUpdateBuilding}
            onRemove={onRemoveBuilding}
          />
        </div>
        <CollectionCreateAction
          label="Zimmer hinzufügen"
          title={`Zimmer in ${building.name} hinzufügen`}
          description="Die Schlafplätze ergeben sich aus den Betten, die du danach im Zimmer hinzufügst."
          open={roomFormOpen}
          on_open_change={(open) => {
            if (open !== roomFormOpen) onToggleRoomForm()
          }}
        >
          <RoomForm
            floors={floors}
            room_types={roomTypes}
            submit_label="Zimmer anlegen"
            onCancel={onToggleRoomForm}
            onSubmit={(payload, values) => onAddRoom(building.id, payload, values)}
          />
        </CollectionCreateAction>
      </div>

      {rooms.length === 0 ? (
        <Card className="bg-secondary-background">
          <CardContent>
            <p className="font-bold">Noch keine Zimmer in {building.name}.</p>
            <p className="text-muted">
              Leg das erste Zimmer an. Betten fügst du danach direkt im Zimmer hinzu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-secondary-background p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left max-md:block">
              <caption className="sr-only">Zimmer in {building.name}</caption>
              <thead className="border-b-2 border-border bg-paper max-md:hidden">
                <tr>
                  <th scope="col" className="p-3 font-bold">
                    Zimmer
                  </th>
                  <th scope="col" className="p-3 font-bold">
                    Etage
                  </th>
                  <th scope="col" className="p-3 font-bold">
                    Typ
                  </th>
                  <th scope="col" className="p-3 font-bold">
                    Bad
                  </th>
                  <th scope="col" className="p-3 font-bold">
                    Betten
                  </th>
                  <th scope="col" className="p-3 text-right font-bold">
                    Plätze
                  </th>
                  <th scope="col" className="p-3 text-right font-bold">
                    Preis/Platz
                  </th>
                </tr>
              </thead>
              <tbody className="max-md:block">
                {rooms.map((room) => {
                  const roomBeds = beds.filter((bed) => bed.room_id === room.id)
                  const open = openRooms[room.id] ?? false
                  return (
                    <RoomRow
                      key={room.id}
                      room={room}
                      beds={roomBeds}
                      labels={world?.labels_by_entity[room.id] ?? []}
                      floors={floors}
                      room_types={roomTypes}
                      bed_types={bedTypes}
                      open={open}
                      onToggle={() => onToggleRoom(room.id)}
                      onSave={onUpdateRoom}
                      onRemove={onRemoveRoom}
                      onAddBed={onAddBed}
                      onUpdateBed={onUpdateBed}
                      onRemoveBed={onRemoveBed}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  )
}

function BuildingEditor({
  building,
  onSave,
  onRemove,
}: {
  building: InventoryBuilding
  onSave: (id: string, name: string, sortKey: number) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(building.name)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleRemoveClick() {
    if (building.room_count > 0) {
      setBlockedReason(
        'Ein Gebäude mit Zimmern kann nicht entfernt werden. Entferne zuerst die Zimmer.',
      )
      return
    }
    setBlockedReason(null)
    setConfirmOpen(true)
  }

  return (
    <details
      className="mt-2 text-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-bold underline">Gebäude bearbeiten</summary>
      <div className="mt-2 space-y-3 rounded-base border-2 border-border bg-paper p-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const value = name.trim()
            if (value) onSave(building.id, value, building.sort_key)
          }}
        >
          <label className="grid gap-1">
            <span className="font-bold">Name des Gebäudes</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 rounded-base border-2 border-border px-3"
            />
          </label>
          <Button type="submit" variant="neutral">
            Speichern
          </Button>
        </form>
        <div className="border-t-2 border-border pt-3">
          {blockedReason ? (
            <p role="alert" className="mb-2 text-sm">
              {blockedReason}
            </p>
          ) : null}
          <Button type="button" variant="neutral" onClick={handleRemoveClick}>
            Gebäude entfernen
          </Button>
          <DestructiveActionDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Gebäude ${building.name} entfernen?`}
            description="Das leere Gebäude und seine Einstellungen werden aus der Unterkunft entfernt."
            onConfirm={() => onRemove(building.id)}
          />
        </div>
      </div>
    </details>
  )
}

function RoomRow({
  room,
  beds,
  labels,
  floors,
  room_types: roomTypes,
  bed_types: bedTypes,
  open,
  onToggle,
  onSave,
  onRemove,
  onAddBed,
  onUpdateBed,
  onRemoveBed,
}: {
  room: InventoryRoom
  beds: readonly InventoryBed[]
  labels: readonly Label[]
  floors: readonly { value: string; label: string }[]
  room_types: readonly { value: string; label: string }[]
  bed_types: readonly { value: string; label: string }[]
  open: boolean
  onToggle: () => void
  onSave: (
    id: string,
    payload: {
      building_id: string
      number: string
      floor: string | null
      room_type: string
      sort_key: number
    },
    values: RoomTraitValues,
    labels: readonly Label[],
  ) => string | null
  onRemove: (id: string) => void
  onAddBed: (roomId: string, payload: NewBedPayload) => void
  onUpdateBed: (id: string, payload: BedUpdatePayload) => void
  onRemoveBed: (id: string) => void
}) {
  const detailId = `betten-${room.id}`
  const tags = roomTags(room)
  const floorless = floorlessRoomTypes.has(room.room_type)
  const price = room.traits['price-per-bed-eur']

  return (
    <>
      <tr
        id={`room-${room.id}`}
        className="border-b border-border last:border-b-0 max-md:mb-3 max-md:block max-md:border-2 max-md:p-3"
      >
        <th scope="row" className="p-3 align-top font-normal max-md:block max-md:p-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={onToggle}
            className="flex items-center gap-2 text-left font-bold hover:underline"
          >
            <span aria-hidden="true">{open ? '▾' : '▸'}</span>
            {room.number}
          </button>
          {tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : null}
        </th>
        <td className="p-3 align-top max-md:block max-md:p-0 max-md:pt-2">
          <span className="mr-2 font-bold md:hidden">Etage:</span>
          {floorless ? '–' : (floors.find(({ value }) => value === room.floor)?.label ?? '–')}
        </td>
        <td className="p-3 align-top max-md:block max-md:p-0 max-md:pt-2">
          <span className="mr-2 font-bold md:hidden">Typ:</span>
          {roomTypes.find(({ value }) => value === room.room_type)?.label ?? room.room_type}
        </td>
        <td className="p-3 align-top max-md:block max-md:p-0 max-md:pt-2">
          <span className="mr-2 font-bold md:hidden">Bad:</span>
          {formatTrait('sanitary', room.traits.sanitary)}
        </td>
        <td className="p-3 align-top max-md:block max-md:p-0 max-md:pt-2">
          <span className="mr-2 font-bold md:hidden">Betten:</span>
          {bedSummary(beds, bedTypes)}
        </td>
        <td className="p-3 text-right align-top font-bold tabular-nums max-md:block max-md:p-0 max-md:pt-2 max-md:text-left">
          <span className="mr-2 font-normal md:hidden">Plätze:</span>
          {room.place_count === 0 ? <Badge tone="attention">Keine Betten</Badge> : room.place_count}
        </td>
        <td className="p-3 text-right align-top tabular-nums max-md:block max-md:p-0 max-md:pt-2 max-md:text-left">
          <span className="mr-2 font-bold md:hidden">Preis/Platz:</span>
          {typeof price === 'number' ? formatEuro(price, 2) : '–'}
        </td>
      </tr>
      {open ? (
        <tr
          id={detailId}
          className="border-b-2 border-t-2 border-border bg-paper max-md:mb-3 max-md:block max-md:border-2"
        >
          <td colSpan={7} className="space-y-4 p-5 max-md:pl-5 md:pl-[54px]">
            <RoomDetail
              room={room}
              beds={beds}
              labels={labels}
              floors={floors}
              room_types={roomTypes}
              bed_types={bedTypes}
              onSave={onSave}
              onRemove={onRemove}
              onAddBed={onAddBed}
              onUpdateBed={onUpdateBed}
              onRemoveBed={onRemoveBed}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function roomTags(room: InventoryRoom): readonly string[] {
  const tags: string[] = []
  if (room.traits['is-accessible'] === true) tags.push('Barrierearm')
  if (room.traits['suitable-for-two-families'] === true) tags.push('Für zwei Familien')
  if (room.traits['has-common-room'] === true) tags.push('Gemeinschaftsraum')
  return tags
}

function bedSummary(
  beds: readonly InventoryBed[],
  bedTypes: readonly { value: string; label: string }[],
) {
  if (beds.length === 0) return '–'
  const counts = new Map<string, number>()
  for (const bed of beds) counts.set(bed.bed_type, (counts.get(bed.bed_type) ?? 0) + 1)
  const entries = Array.from(counts.entries())
  const label = entries
    .map(
      ([type, count]) => `${count} ${bedTypes.find(({ value }) => value === type)?.label ?? type}`,
    )
    .join(', ')
  return (
    <span role="img" aria-label={label} className="flex flex-wrap items-center gap-2">
      {entries.map(([type, count]) => {
        return (
          <span key={type} className="inline-flex items-center gap-1">
            <BedIcon bed_type={type} aria-hidden="true" className="h-6 w-8" />
            {count}×
          </span>
        )
      })}
    </span>
  )
}

function RoomDetail({
  room,
  beds,
  labels,
  floors,
  room_types: roomTypes,
  bed_types: bedTypes,
  onSave,
  onRemove,
  onAddBed,
  onUpdateBed,
  onRemoveBed,
}: {
  room: InventoryRoom
  beds: readonly InventoryBed[]
  labels: readonly Label[]
  floors: readonly { value: string; label: string }[]
  room_types: readonly { value: string; label: string }[]
  bed_types: readonly { value: string; label: string }[]
  onSave: (
    id: string,
    payload: {
      building_id: string
      number: string
      floor: string | null
      room_type: string
      sort_key: number
    },
    values: RoomTraitValues,
    labels: readonly Label[],
  ) => string | null
  onRemove: (id: string) => void
  onAddBed: (roomId: string, payload: NewBedPayload) => void
  onUpdateBed: (id: string, payload: BedUpdatePayload) => void
  onRemoveBed: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [addingBed, setAddingBed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)

  function handleRemoveClick() {
    if (beds.length > 0) {
      setBlockedReason(
        `Das Zimmer kann nicht entfernt werden, solange ${beds.length === 1 ? 'ein Bett' : `${beds.length} Betten`} darin vorhanden ${beds.length === 1 ? 'ist' : 'sind'}.`,
      )
      return
    }
    setBlockedReason(null)
    setConfirmOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="neutral" onClick={() => setEditing((value) => !value)}>
          Zimmer bearbeiten
        </Button>
        <Button type="button" variant="neutral" onClick={handleRemoveClick}>
          Zimmer entfernen
        </Button>
        <DestructiveActionDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Zimmer ${room.number} entfernen?`}
          description="Das leere Zimmer und seine Einstellungen werden aus der Unterkunft entfernt."
          onConfirm={() => onRemove(room.id)}
        />
      </div>
      {blockedReason ? (
        <p role="alert" className="text-sm">
          {blockedReason}
        </p>
      ) : null}

      {editing ? (
        <RoomForm
          floors={floors}
          room_types={roomTypes}
          submit_label="Änderungen speichern"
          initial={{
            number: room.number,
            floor: room.floor ?? '',
            room_type: room.room_type,
            values: roomTraitValuesFromLabels(labels),
          }}
          onCancel={() => setEditing(false)}
          onSubmit={(payload, values) => {
            const result = onSave(
              room.id,
              { building_id: room.building_id, sort_key: room.sort_key, ...payload },
              values,
              labels,
            )
            if (!result) setEditing(false)
            return result
          }}
        />
      ) : null}

      <div className="space-y-3">
        {beds.length === 0 ? (
          <p>Noch keine Betten. Füg das erste Bett hinzu, dann hat das Zimmer Schlafplätze.</p>
        ) : (
          bedGroups(beds, room.room_type === 'apartment').map((group) => (
            <div key={group.heading ?? '_'}>
              {group.heading ? (
                <h3 className="mb-1 font-heading text-lg">{group.heading}</h3>
              ) : null}
              <div className="divide-y-2 divide-border rounded-base border-2 border-border bg-secondary-background">
                {group.beds.map((bed) => (
                  <BedRow
                    key={bed.id}
                    bed={bed}
                    bed_types={bedTypes}
                    onSave={onUpdateBed}
                    onRemove={onRemoveBed}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <CollectionCreateAction
          label="Bett hinzufügen"
          title={`Bett in Zimmer ${room.number} hinzufügen`}
          description="Ein Bett ergänzt die abgeleitete Schlafplatzkapazität dieses Zimmers."
          open={addingBed}
          on_open_change={setAddingBed}
        >
          <BedForm
            bed_types={bedTypes}
            is_apartment={room.room_type === 'apartment'}
            existing_schlafraeume={Array.from(
              new Set(
                beds
                  .map((bed) => bed.sleeping_room)
                  .filter((value): value is number => value !== null),
              ),
            ).sort((a, b) => a - b)}
            onSubmit={(payload) => {
              onAddBed(room.id, payload)
              setAddingBed(false)
            }}
          />
        </CollectionCreateAction>
      </div>
    </div>
  )
}

function bedGroups(
  beds: readonly InventoryBed[],
  isApartment: boolean,
): readonly { heading: string | null; beds: readonly InventoryBed[] }[] {
  if (!isApartment) return [{ heading: null, beds }]
  const groups = new Map<number, InventoryBed[]>()
  const ungrouped: InventoryBed[] = []
  for (const bed of beds) {
    if (bed.sleeping_room === null) {
      ungrouped.push(bed)
      continue
    }
    const list = groups.get(bed.sleeping_room) ?? []
    list.push(bed)
    groups.set(bed.sleeping_room, list)
  }
  const result: { heading: string | null; beds: InventoryBed[] }[] = Array.from(groups.keys())
    .sort((a, b) => a - b)
    .map((n) => ({ heading: `Schlafraum ${n}`, beds: groups.get(n)! }))
  if (ungrouped.length > 0) result.push({ heading: null, beds: ungrouped })
  return result
}

function BedRow({
  bed,
  bed_types: bedTypes,
  onSave,
  onRemove,
}: {
  bed: InventoryBed
  bed_types: readonly { value: string; label: string }[]
  onSave: (id: string, payload: BedUpdatePayload) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [label, setLabel] = useState(bed.label)
  const [bedType, setBedType] = useState(bed.bed_type)
  const typeLabel = bedTypes.find(({ value }) => value === bed.bed_type)?.label ?? bed.bed_type

  if (editing)
    return (
      <form
        className="space-y-2 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(bed.id, {
            room_id: bed.room_id,
            label: label.trim(),
            bed_type: bedType,
            sleeps: sleepsForBedType(bedType),
            sort_key: bed.sort_key,
            sleeping_room: bed.sleeping_room,
          })
          setEditing(false)
        }}
      >
        <label className="grid gap-1">
          <span className="font-bold">Bezeichnung</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="min-h-11 rounded-base border-2 border-border px-3"
          />
        </label>
        <SegmentedControl
          label="Bettart"
          value={bedType}
          onChange={setBedType}
          options={bedTypes}
          render_icon={(value) => <BedIcon bed_type={value} className="size-5" />}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="neutral">
            Bett speichern
          </Button>
          <Button type="button" variant="neutral" onClick={() => setEditing(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex items-start gap-3">
        <BedIcon bed_type={bed.bed_type} aria-hidden="true" className="mt-0.5 h-6 w-8 shrink-0" />
        <div>
          <p>
            <span className="font-bold">{typeLabel}</span>
            {bed.label ? <span className="text-muted"> · {bed.label}</span> : null}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {slotLabels(bed).map((slot) => (
              <Tag key={slot}>{slot}</Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="neutral" size="sm" onClick={() => setEditing(true)}>
          Bearbeiten
        </Button>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          aria-label={`${typeLabel}${bed.label ? ` ${bed.label}` : ''} entfernen`}
          onClick={() => setConfirmOpen(true)}
        >
          Entfernen
        </Button>
      </div>
      <DestructiveActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${typeLabel}${bed.label ? ` ${bed.label}` : ''} entfernen?`}
        description="Das Bett und die daraus abgeleiteten Schlafplätze werden aus dem Zimmer entfernt."
        onConfirm={() => onRemove(bed.id)}
      />
    </div>
  )
}

function slotLabels(bed: InventoryBed): readonly string[] {
  if (bed.bed_type === 'bunk') return ['Oben', 'Unten']
  if (bed.sleeps === 2) return ['Platz 1', 'Platz 2']
  return ['1 Platz']
}

function BedForm({
  bed_types: bedTypes,
  is_apartment: isApartment,
  existing_schlafraeume: existingSchlafraeume,
  onSubmit,
}: {
  bed_types: readonly { value: string; label: string }[]
  is_apartment: boolean
  existing_schlafraeume: readonly number[]
  onSubmit: (payload: NewBedPayload) => void
}) {
  const [bedType, setBedType] = useState(bedTypes[0]?.value ?? '')
  const [label, setLabel] = useState('')
  const [schlafraumCount, setSchlafraumCount] = useState(Math.max(1, ...existingSchlafraeume))
  const [sleepingRoom, setSleepingRoom] = useState(existingSchlafraeume[0] ?? 1)
  return (
    <form
      className="space-y-3 border-t-2 border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ label, bed_type: bedType, sleeping_room: isApartment ? sleepingRoom : null })
        setLabel('')
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SegmentedControl
          label="Bettart"
          value={bedType}
          onChange={setBedType}
          options={bedTypes}
          render_icon={(value) => <BedIcon bed_type={value} className="size-5" />}
        />
        <label className="grid gap-1">
          <span className="font-bold">
            Bezeichnung <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="z. B. am Fenster"
            className="min-h-11 rounded-base border-2 border-border px-3"
          />
        </label>
      </div>
      {isApartment ? (
        <SegmentedControl
          label="Schlafraum"
          value={String(sleepingRoom)}
          onChange={(next) => {
            if (next === 'new') {
              const created = schlafraumCount + 1
              setSchlafraumCount(created)
              setSleepingRoom(created)
              return
            }
            setSleepingRoom(Number(next))
          }}
          options={[
            ...Array.from({ length: schlafraumCount }, (_, index) => ({
              value: String(index + 1),
              label: `Schlafraum ${index + 1}`,
            })),
            { value: 'new', label: '+ Neuer Schlafraum' },
          ]}
        />
      ) : null}
      <Button type="submit">Bett hinzufügen</Button>
    </form>
  )
}

function RoomForm({
  heading,
  intro,
  floors,
  room_types: roomTypes,
  submit_label: submitLabel,
  initial,
  onCancel,
  onSubmit,
}: {
  heading?: string
  intro?: string
  floors: readonly { value: string; label: string }[]
  room_types: readonly { value: string; label: string }[]
  submit_label: string
  initial?: { number: string; floor: string; room_type: string; values: RoomTraitValues }
  onCancel: () => void
  onSubmit: (
    payload: { number: string; floor: string | null; room_type: string },
    values: RoomTraitValues,
  ) => string | null
}) {
  const [number, setNumber] = useState(initial?.number ?? '')
  const [floor, setFloor] = useState(initial?.floor ?? '')
  const [roomType, setRoomType] = useState(initial?.room_type ?? roomTypes[0]?.value ?? '')
  const [values, setValues] = useState<RoomTraitValues>(
    () => initial?.values ?? roomTraitDefaults(),
  )
  const [error, setError] = useState<string | null>(null)
  const floorless = floorlessRoomTypes.has(roomType)

  return (
    <Card className="border-t-2 bg-paper">
      <CardContent>
        {heading ? <h3 className="text-xl font-heading">{heading}</h3> : null}
        {intro ? <p className="mt-1 text-sm text-muted">{intro}</p> : null}
        <form
          className={heading ? 'mt-4 space-y-3' : 'space-y-3'}
          onSubmit={(event) => {
            event.preventDefault()
            const result = onSubmit(
              { number, floor: floorless ? null : floor || null, room_type: roomType },
              values,
            )
            if (result) return setError(result)
            setError(null)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-bold">Nummer oder Name</span>
              <input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="z. B. 203 oder Eichhörnchen"
                className="min-h-11 rounded-base border-2 border-border px-3"
              />
            </label>
            {floorless ? null : (
              <Select label="Etage" value={floor} onChange={setFloor} options={floors} />
            )}
            <Select label="Zimmertyp" value={roomType} onChange={setRoomType} options={roomTypes} />
          </div>
          <TraitFields
            values={values}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
          />
          {error ? (
            <p role="alert" className="font-bold">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="neutral" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function TraitFields({
  values,
  onChange,
}: {
  values: RoomTraitValues
  onChange: (key: string, value: TraitInput) => void
}) {
  return (
    <fieldset className="space-y-3 border-t-2 border-border pt-3">
      <legend className="font-heading text-lg">Merkmale</legend>
      {roomPropertyDefinitions.map(({ key, trait }) => {
        const options = traitOptions(trait)
        const value = values[key]
        if (trait.value.kind === 'bool')
          return (
            <label key={key} className="flex min-h-11 items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => onChange(key, event.target.checked)}
                className="size-5 accent-main-deep"
              />
              {labelText(trait.title)}
            </label>
          )
        if (options)
          return (
            <Select
              key={key}
              label={labelText(trait.title)}
              value={typeof value === 'string' ? value : ''}
              onChange={(next) => onChange(key, next)}
              options={[{ value: '', label: 'Bitte wählen' }, ...options]}
            />
          )
        return (
          <label key={key} className="grid gap-1">
            <span className="font-bold">{labelText(trait.title)}</span>
            <input
              type={trait.value.kind === 'text' ? 'text' : 'number'}
              step={trait.value.kind === 'decimal' ? '0.01' : '1'}
              value={value === null || value === undefined ? '' : String(value)}
              onChange={(event) => onChange(key, event.target.value)}
              className="min-h-11 rounded-base border-2 border-border px-3"
            />
          </label>
        )
      })}
    </fieldset>
  )
}

function formatTrait(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'
  if (value === null || value === undefined) return '–'
  const definition = roomPropertyDefinitions.find((candidate) => candidate.key === key)
  if (definition && typeof value === 'string') {
    const options = traitOptions(definition.trait)
    const match = options?.find((option) => option.value === value)
    if (match) return match.label
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  return (
    <label className="grid gap-1">
      <span className="font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-base border-2 border-border bg-secondary-background px-3"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function formatEuro(value: number, decimals: 0 | 2): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
