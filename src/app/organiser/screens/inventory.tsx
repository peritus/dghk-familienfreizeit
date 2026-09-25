import { useState } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useDocumentTitle } from '../../lib/use-document-title.js'
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

function id(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}${random.replaceAll('-', '').slice(0, 16)}`
}

function draft(actor: string, type: string, payload: EventDraft['payload']): EventDraft {
  return { at: new Date().toISOString(), actor, subject: null, type, payload }
}

// Floors don't apply to a Bungalow or Schlaffass (D39/Q4).
const FLOORLESS_ROOM_TYPES = new Set(['bungalow', 'schlaffass'])

export function Inventory() {
  useDocumentTitle('Unterkunft · Familienfreizeit')
  const { world, state, stage } = useOrganiser()
  const config = selectedInventoryConfig()
  const floors = config.floors.map((value) => ({ value, label: config.copy.floors[value] ?? value }))
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

  function addBed(
    roomId: string,
    payload: { label: string; bed_type: string },
  ) {
    const label = payload.label.trim()
    stageInventoryEvents([
      draft(state.principal_email ?? '', 'BedAdded', {
        bed_id: id('bed_'),
        room_id: roomId,
        label,
        bed_type: payload.bed_type,
        sleeps: sleepsForBedType(payload.bed_type),
        sort_key: summary.beds.filter((bed) => bed.room_id === roomId).length + 1,
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

  function updateBed(
    bedId: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ): void {
    stageInventoryEvents([{ type: 'BedUpdated', payload: { bed_id: bedId, ...payload } }])
  }

  function removeBed(bedId: string): void {
    stageInventoryEvents([{ type: 'BedRemoved', payload: { bed_id: bedId, reason: null } }])
  }

  const hasBuildings = summary.buildings.length > 0

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading sm:text-4xl">Unterkunft</h1>
          <p className="mt-2 text-muted">Gebäude, Zimmer und Betten für diese Freizeit.</p>
        </div>
        {hasBuildings ? (
          <Button variant="neutral" onClick={() => setAddingBuilding((open) => !open)}>
            + Gebäude hinzufügen
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
          {error}
        </p>
      ) : null}

      {hasBuildings ? (
        <Stats
          buildings={summary.buildings.length}
          rooms={summary.rooms.length}
          beds={summary.beds.length}
          places={summary.capacity}
          costPerNight={summary.cost_eur}
        />
      ) : null}

      {addingBuilding || !hasBuildings ? (
        <NewBuildingForm
          heading={hasBuildings ? undefined : 'Noch keine Unterkunft angelegt'}
          intro={
            hasBuildings
              ? undefined
              : 'Fang mit einem Gebäude an. Zimmer und Betten fügst du danach direkt darin hinzu.'
          }
          onCancel={hasBuildings ? () => setAddingBuilding(false) : undefined}
          onSubmit={addBuilding}
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
              roomTypes={roomTypes}
              bedTypes={bedTypes}
              roomFormOpen={openRoomForms[building.id] ?? false}
              onToggleRoomForm={() =>
                setOpenRoomForms((current) => ({
                  ...current,
                  [building.id]: !current[building.id],
                }))
              }
              openRooms={openRooms}
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

function Stats({
  buildings,
  rooms,
  beds,
  places,
  costPerNight,
}: {
  buildings: number
  rooms: number
  beds: number
  places: number
  costPerNight: number
}) {
  const cells = [
    { value: buildings, label: 'Gebäude' },
    { value: rooms, label: 'Zimmer' },
    { value: beds, label: 'Betten' },
    { value: places, label: 'Schlafplätze' },
  ]
  return (
    <Card className="bg-white p-0">
      <div className="grid grid-cols-2 divide-y-2 divide-black sm:grid-cols-5 sm:divide-x-2 sm:divide-y-0">
        {cells.map((cell) => (
          <div key={cell.label} className="p-4 text-center">
            <p className="text-4xl font-heading leading-none">{cell.value}</p>
            <p className="mt-1 font-bold">{cell.label}</p>
          </div>
        ))}
        <div className="col-span-2 p-4 text-center sm:col-span-1">
          <p className="text-4xl font-heading leading-none">{formatEuro(costPerNight, 0)}</p>
          <p className="mt-1 font-bold">Kosten pro Nacht</p>
        </div>
      </div>
    </Card>
  )
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
    <Card className="bg-white">
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
              className="min-h-11 rounded-base border-2 border-black px-3"
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
  roomTypes,
  bedTypes,
  roomFormOpen,
  onToggleRoomForm,
  openRooms,
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
  roomTypes: readonly { value: string; label: string }[]
  bedTypes: readonly { value: string; label: string }[]
  roomFormOpen: boolean
  onToggleRoomForm: () => void
  openRooms: Record<string, boolean>
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
  onAddBed: (roomId: string, payload: { label: string; bed_type: string }) => void
  onUpdateBed: (
    id: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ) => void
  onRemoveBed: (id: string) => void
}) {
  const places = rooms.reduce((sum, room) => sum + room.place_count, 0)
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-2xl font-heading">{building.name}</h2>
          <p className="text-muted">
            {pluralDe(rooms.length, 'Zimmer', 'Zimmer')}, {pluralDe(places, 'Schlafplatz', 'Schlafplätze')}
          </p>
          <BuildingEditor building={building} onSave={onUpdateBuilding} onRemove={onRemoveBuilding} />
        </div>
        <Button variant="neutral" onClick={onToggleRoomForm}>
          + Zimmer hinzufügen
        </Button>
      </div>

      {roomFormOpen ? (
        <RoomForm
          heading={`Neues Zimmer in ${building.name}`}
          intro="Die Schlafplätze ergeben sich aus den Betten, die du danach im Zimmer hinzufügst."
          floors={floors}
          roomTypes={roomTypes}
          submitLabel="Zimmer anlegen"
          onCancel={onToggleRoomForm}
          onSubmit={(payload, values) => onAddRoom(building.id, payload, values)}
        />
      ) : null}

      {rooms.length === 0 ? (
        <Card className="bg-white">
          <CardContent>
            <p className="font-bold">Noch keine Zimmer in {building.name}.</p>
            <p className="text-muted">
              Leg das erste Zimmer an. Betten fügst du danach direkt im Zimmer hinzu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Zimmer in {building.name}</caption>
              <thead className="border-b-2 border-black bg-paper">
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
              <tbody>
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
                      roomTypes={roomTypes}
                      bedTypes={bedTypes}
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
  const [confirming, setConfirming] = useState(false)

  function handleRemoveClick() {
    if (building.room_count > 0) {
      setBlockedReason('Ein Gebäude mit Zimmern kann nicht entfernt werden. Entferne zuerst die Zimmer.')
      return
    }
    setConfirming(true)
  }

  return (
    <details className="mt-2 text-sm" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-bold underline">Gebäude bearbeiten</summary>
      <div className="mt-2 space-y-3 rounded-base border-2 border-black bg-paper p-3">
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
              className="min-h-11 rounded-base border-2 border-black px-3"
            />
          </label>
          <Button type="submit" variant="neutral">
            Speichern
          </Button>
        </form>
        <div className="border-t-2 border-black pt-3">
          {blockedReason ? (
            <p role="alert" className="mb-2 text-sm">
              {blockedReason}
            </p>
          ) : null}
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <p>
                Gebäude {building.name} entfernen?
              </p>
              <Button type="button" variant="neutral" autoFocus onClick={() => setConfirming(false)}>
                Behalten
              </Button>
              <Button type="button" variant="danger" onClick={() => onRemove(building.id)}>
                Ja, entfernen
              </Button>
            </div>
          ) : (
            <Button type="button" variant="neutral" onClick={handleRemoveClick}>
              Gebäude entfernen
            </Button>
          )}
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
  roomTypes,
  bedTypes,
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
  roomTypes: readonly { value: string; label: string }[]
  bedTypes: readonly { value: string; label: string }[]
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
  onAddBed: (roomId: string, payload: { label: string; bed_type: string }) => void
  onUpdateBed: (
    id: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ) => void
  onRemoveBed: (id: string) => void
}) {
  const detailId = `betten-${room.id}`
  const tags = roomTags(room)
  const floorless = FLOORLESS_ROOM_TYPES.has(room.room_type)
  const price = room.traits['price-per-bed-eur']

  return (
    <>
      <tr className="border-b border-black last:border-b-0">
        <th scope="row" className="p-3 align-top font-normal">
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
                <span
                  key={tag}
                  className="rounded-base bg-background px-[7px] py-[1px] text-xs font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </th>
        <td className="p-3 align-top">
          {floorless ? '–' : (floors.find(({ value }) => value === room.floor)?.label ?? '–')}
        </td>
        <td className="p-3 align-top">
          {roomTypes.find(({ value }) => value === room.room_type)?.label ?? room.room_type}
        </td>
        <td className="p-3 align-top">{formatTrait('sanitary', room.traits.sanitary)}</td>
        <td className="p-3 align-top">{bedSummary(beds, bedTypes)}</td>
        <td className="p-3 text-right align-top font-bold tabular-nums">
          {room.place_count === 0 ? (
            <span className="rounded-base border-2 border-black bg-main px-[7px] py-[1px] text-xs font-bold">
              Keine Betten
            </span>
          ) : (
            room.place_count
          )}
        </td>
        <td className="p-3 text-right align-top tabular-nums">
          {typeof price === 'number' ? formatEuro(price, 2) : '–'}
        </td>
      </tr>
      {open ? (
        <tr id={detailId} className="border-b-2 border-t-2 border-black bg-paper">
          <td colSpan={7} className="space-y-4 p-5 pl-[54px]">
            <RoomDetail
              room={room}
              beds={beds}
              labels={labels}
              floors={floors}
              roomTypes={roomTypes}
              bedTypes={bedTypes}
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
): string {
  if (beds.length === 0) return '–'
  const counts = new Map<string, number>()
  for (const bed of beds) counts.set(bed.bed_type, (counts.get(bed.bed_type) ?? 0) + 1)
  return Array.from(counts.entries())
    .map(([type, count]) => `${count}× ${bedTypes.find(({ value }) => value === type)?.label ?? type}`)
    .join(', ')
}

function RoomDetail({
  room,
  beds,
  labels,
  floors,
  roomTypes,
  bedTypes,
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
  roomTypes: readonly { value: string; label: string }[]
  bedTypes: readonly { value: string; label: string }[]
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
  onAddBed: (roomId: string, payload: { label: string; bed_type: string }) => void
  onUpdateBed: (
    id: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ) => void
  onRemoveBed: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="neutral" onClick={() => setEditing((value) => !value)}>
          Zimmer bearbeiten
        </Button>
        {confirmingDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <p>
              Zimmer {room.number} entfernen?
              {beds.length > 0 ? ` Die ${beds.length} Betten darin werden auch entfernt.` : ''}
            </p>
            <Button type="button" variant="neutral" autoFocus onClick={() => setConfirmingDelete(false)}>
              Behalten
            </Button>
            <Button type="button" variant="danger" onClick={() => onRemove(room.id)}>
              Ja, entfernen
            </Button>
          </div>
        ) : (
          <Button type="button" variant="neutral" onClick={() => setConfirmingDelete(true)}>
            Zimmer entfernen
          </Button>
        )}
      </div>

      {editing ? (
        <RoomForm
          floors={floors}
          roomTypes={roomTypes}
          submitLabel="Änderungen speichern"
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
          <div className="divide-y-2 divide-black rounded-base border-2 border-black bg-white">
            {beds.map((bed) => (
              <BedRow
                key={bed.id}
                bed={bed}
                bedTypes={bedTypes}
                onSave={onUpdateBed}
                onRemove={onRemoveBed}
              />
            ))}
          </div>
        )}
        <BedForm bedTypes={bedTypes} onSubmit={(payload) => onAddBed(room.id, payload)} />
      </div>
    </div>
  )
}

function BedRow({
  bed,
  bedTypes,
  onSave,
  onRemove,
}: {
  bed: InventoryBed
  bedTypes: readonly { value: string; label: string }[]
  onSave: (
    id: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
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
          })
          setEditing(false)
        }}
      >
        <label className="grid gap-1">
          <span className="font-bold">Bezeichnung</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="min-h-11 rounded-base border-2 border-black px-3"
          />
        </label>
        <Select label="Bettart" value={bedType} onChange={setBedType} options={bedTypes} />
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
      <div>
        <p>
          <span className="font-bold">{typeLabel}</span>
          {bed.label ? <span className="text-muted"> · {bed.label}</span> : null}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {slotLabels(bed).map((slot) => (
            <span
              key={slot}
              className="min-h-7 rounded-base border-2 border-black bg-white px-2 text-sm font-bold"
            >
              {slot}
            </span>
          ))}
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
          onClick={() => onRemove(bed.id)}
        >
          Entfernen
        </Button>
      </div>
    </div>
  )
}

function slotLabels(bed: InventoryBed): readonly string[] {
  if (bed.bed_type === 'bunk') return ['Oben', 'Unten']
  if (bed.sleeps === 2) return ['Platz 1', 'Platz 2']
  return ['1 Platz']
}

function BedForm({
  bedTypes,
  onSubmit,
}: {
  bedTypes: readonly { value: string; label: string }[]
  onSubmit: (payload: { label: string; bed_type: string }) => void
}) {
  const [bedType, setBedType] = useState(bedTypes[0]?.value ?? '')
  const [label, setLabel] = useState('')
  return (
    <form
      className="space-y-3 border-t-2 border-black pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ label, bed_type: bedType })
        setLabel('')
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Bettart" value={bedType} onChange={setBedType} options={bedTypes} />
        <label className="grid gap-1">
          <span className="font-bold">
            Bezeichnung <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="z. B. am Fenster"
            className="min-h-11 rounded-base border-2 border-black px-3"
          />
        </label>
      </div>
      {bedType === 'bunk' ? (
        <p className="text-sm text-muted">
          Ein Etagenbett hat zwei Schlafplätze: oben und unten. Oben erst ab 6 Jahren.
        </p>
      ) : null}
      <Button type="submit">Bett hinzufügen</Button>
    </form>
  )
}

function RoomForm({
  heading,
  intro,
  floors,
  roomTypes,
  submitLabel,
  initial,
  onCancel,
  onSubmit,
}: {
  heading?: string
  intro?: string
  floors: readonly { value: string; label: string }[]
  roomTypes: readonly { value: string; label: string }[]
  submitLabel: string
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
  const [values, setValues] = useState<RoomTraitValues>(() => initial?.values ?? roomTraitDefaults())
  const [error, setError] = useState<string | null>(null)
  const floorless = FLOORLESS_ROOM_TYPES.has(roomType)

  return (
    <Card className="border-t-2 bg-paper">
      <CardContent>
        {heading ? <h3 className="text-xl font-heading">{heading}</h3> : null}
        {intro ? <p className="mt-1 text-sm text-muted">{intro}</p> : null}
        <form
          className={heading ? 'mt-4 space-y-3' : 'space-y-3'}
          onSubmit={(event) => {
            event.preventDefault()
            const result = onSubmit({ number, floor: floorless ? null : floor || null, room_type: roomType }, values)
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
                className="min-h-11 rounded-base border-2 border-black px-3"
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
    <fieldset className="space-y-3 border-t-2 border-black pt-3">
      <legend className="font-heading text-lg">Raummerkmale</legend>
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
                className="size-5 accent-black"
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
              className="min-h-11 rounded-base border-2 border-black px-3"
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
        className="min-h-11 rounded-base border-2 border-black bg-white px-3"
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

function pluralDe(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatEuro(value: number, decimals: 0 | 2): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
