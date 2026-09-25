import { useState, type FormEvent } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
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

export function Inventory() {
  const { world, state, stage } = useOrganiser()
  const config = selectedInventoryConfig()
  const floors = [
    { value: '', label: 'Keine Etage' },
    ...config.floors.map((value) => ({ value, label: config.copy.floors[value] ?? value })),
  ]
  const roomTypes = config.room_types.map((value) => ({
    value,
    label: config.copy.room_types[value] ?? value,
  }))
  const bedTypes = config.bed_types.map((value) => ({
    value,
    label: config.copy.bed_types[value] ?? value,
  }))
  const summary = inventoryWorld(world!)
  const [buildingName, setBuildingName] = useState('')
  const [roomBuilding, setRoomBuilding] = useState(summary.buildings[0]?.id ?? '')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomFloor, setRoomFloor] = useState('')
  const [roomType, setRoomType] = useState(config.room_types[0] ?? '')
  const [roomTraitValues, setRoomTraitValues] = useState<RoomTraitValues>(() => roomTraitDefaults())
  const [bedRoom, setBedRoom] = useState(summary.rooms[0]?.id ?? '')
  const [bedLabel, setBedLabel] = useState('')
  const [bedType, setBedType] = useState(config.bed_types[0] ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit(
    event: FormEvent<HTMLFormElement>,
    events: readonly Pick<EventDraft, 'type' | 'payload'>[],
  ) {
    event.preventDefault()
    stageInventoryEvents(events)
  }

  function stageInventoryEvents(events: readonly Pick<EventDraft, 'type' | 'payload'>[]): void {
    if (!state.principal_email) return
    stage(events.map(({ type, payload }) => draft(state.principal_email!, type, payload)))
    setError(null)
  }

  function addBuilding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = buildingName.trim()
    if (!name) return setError('Bitte gib einen Gebäudenamen ein.')
    submit(event, [
      draft(state.principal_email ?? '', 'BuildingAdded', {
        building_id: id('bld_'),
        name,
        sort_key: summary.buildings.length + 1,
      }),
    ])
    setBuildingName('')
  }

  function addRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const number = roomNumber.trim()
    if (!roomBuilding || !number)
      return setError('Bitte wähle ein Gebäude und gib eine Zimmernummer ein.')
    const traitError = validateRoomTraitValues(roomTraitValues)
    if (traitError) return setError(traitError)
    const roomId = id('rm_')
    submit(event, [
      draft(state.principal_email ?? '', 'RoomAdded', {
        room_id: roomId,
        building_id: roomBuilding,
        number,
        floor: roomFloor || null,
        room_type: roomType,
        sort_key: summary.rooms.length + 1,
      }),
      ...roomTraitLabelChanges(roomId, roomTraitValues),
    ])
    setRoomNumber('')
    setRoomTraitValues(roomTraitDefaults())
  }

  function addBed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const label = bedLabel.trim()
    if (!bedRoom || !label)
      return setError('Bitte wähle ein Zimmer und gib eine Bettbezeichnung ein.')
    submit(event, [
      draft(state.principal_email ?? '', 'BedAdded', {
        bed_id: id('bed_'),
        room_id: bedRoom,
        label,
        bed_type: bedType,
        sleeps: sleepsForBedType(bedType),
        sort_key: summary.beds.filter((bed) => bed.room_id === bedRoom).length + 1,
      }),
    ])
    setBedLabel('')
  }

  function updateBuilding(buildingId: string, name: string, sortKey: number): void {
    stageInventoryEvents([
      {
        type: 'BuildingUpdated',
        payload: { building_id: buildingId, name, sort_key: sortKey },
      },
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
  ): void {
    const traitError = validateRoomTraitValues(values)
    if (traitError) return setError(traitError)
    stageInventoryEvents([
      { type: 'RoomUpdated', payload: { room_id: roomId, ...payload } },
      ...roomTraitLabelChanges(roomId, values, labels),
    ])
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">Inventar</p>
          <h1 className="text-3xl font-heading sm:text-4xl">Unterkunft</h1>
          <p className="mt-2 text-muted">
            Gebäude, Zimmer, Betten und Schlafplätze im aktuellen Ereignisstand.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
          <SummaryValue value={summary.buildings.length} label="Gebäude" />
          <SummaryValue value={summary.rooms.length} label="Zimmer" />
          <SummaryValue value={summary.capacity} label="Schlafplätze" />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <InventoryForm
          title="Gebäude hinzufügen"
          onSubmit={addBuilding}
          button="Gebäude hinzufügen"
        >
          <label className="grid gap-1">
            <span className="font-bold">Name</span>
            <input
              value={buildingName}
              onChange={(event) => setBuildingName(event.target.value)}
              className="min-h-11 rounded border-2 border-black px-3"
            />
          </label>
        </InventoryForm>
        <InventoryForm title="Zimmer hinzufügen" onSubmit={addRoom} button="Zimmer hinzufügen">
          <Select
            label="Gebäude"
            value={roomBuilding}
            onChange={setRoomBuilding}
            options={summary.buildings.map(({ id, name }) => ({ value: id, label: name }))}
          />
          <label className="grid gap-1">
            <span className="font-bold">Nummer</span>
            <input
              value={roomNumber}
              onChange={(event) => setRoomNumber(event.target.value)}
              className="min-h-11 rounded border-2 border-black px-3"
            />
          </label>
          <Select label="Etage" value={roomFloor} onChange={setRoomFloor} options={floors} />
          <Select label="Zimmertyp" value={roomType} onChange={setRoomType} options={roomTypes} />
          <TraitFields
            values={roomTraitValues}
            onChange={(key, value) =>
              setRoomTraitValues((current) => ({ ...current, [key]: value }))
            }
          />
        </InventoryForm>
        <InventoryForm title="Bett hinzufügen" onSubmit={addBed} button="Bett hinzufügen">
          <Select
            label="Zimmer"
            value={bedRoom}
            onChange={setBedRoom}
            options={summary.rooms.map(({ id, number }) => ({
              value: id,
              label: `Zimmer ${number}`,
            }))}
          />
          <label className="grid gap-1">
            <span className="font-bold">Bezeichnung</span>
            <input
              value={bedLabel}
              onChange={(event) => setBedLabel(event.target.value)}
              className="min-h-11 rounded border-2 border-black px-3"
            />
          </label>
          <Select label="Bettart" value={bedType} onChange={setBedType} options={bedTypes} />
        </InventoryForm>
      </div>

      <p className="text-lg font-bold">
        Kapazität: {summary.capacity} Schlafplätze · Kosten: {formatEuro(summary.cost_eur)}
      </p>

      <div className="space-y-6">
        {summary.buildings.map((building) => (
          <Card key={building.id} className="bg-white p-0">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-black p-5">
              <div>
                <h2 className="text-2xl font-heading">{building.name}</h2>
                <BuildingEditor
                  building={building}
                  onSave={updateBuilding}
                  onRemove={removeBuilding}
                />
              </div>
              <p className="text-muted">
                {building.room_count} Zimmer · {building.place_count} Schlafplätze
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Zimmer in {building.name}</caption>
                <thead className="border-b-2 border-black">
                  <tr>
                    <th scope="col" className="p-3">
                      Zimmer
                    </th>
                    <th scope="col" className="p-3">
                      Etage
                    </th>
                    <th scope="col" className="p-3">
                      Typ
                    </th>
                    <th scope="col" className="p-3">
                      Plätze
                    </th>
                    <th scope="col" className="p-3">
                      Betten
                    </th>
                    <th scope="col" className="p-3">
                      Merkmale
                    </th>
                    <th scope="col" className="p-3">
                      Pflege
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rooms
                    .filter((room) => room.building_id === building.id)
                    .map((room) => (
                      <tr key={room.id} className="border-b border-black last:border-b-0">
                        <th scope="row" className="p-3">
                          {room.number}
                        </th>
                        <td className="p-3">
                          {floors.find(({ value }) => value === room.floor)?.label ?? '—'}
                        </td>
                        <td className="p-3">
                          {roomTypes.find(({ value }) => value === room.room_type)?.label ??
                            room.room_type}
                        </td>
                        <td className="p-3">{room.place_count}</td>
                        <td className="p-3">
                          {summary.beds
                            .filter((bed) => bed.room_id === room.id)
                            .map((bed) => `${bed.label} (${bed.sleeps})`)
                            .join(', ') || '—'}
                        </td>
                        <td className="p-3 text-sm">
                          <div className="space-y-1">
                            {Object.entries(room.traits).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-bold">{traitTitle(key)}:</span>{' '}
                                {formatTrait(value)}
                              </div>
                            ))}
                            {room.capabilities.map((capability) => (
                              <div key={capability}>
                                <span className="font-bold">Fähigkeit:</span> {capability}
                              </div>
                            ))}
                            {Object.keys(room.traits).length === 0 && room.capabilities.length === 0
                              ? '—'
                              : null}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <RoomEditor
                            room={room}
                            beds={summary.beds.filter((bed) => bed.room_id === room.id)}
                            labels={world?.labels_by_entity[room.id] ?? []}
                            floors={floors}
                            room_types={roomTypes}
                            bed_types={bedTypes}
                            onSave={updateRoom}
                            onRemove={removeRoom}
                            onBedSave={updateBed}
                            onBedRemove={removeBed}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        {summary.buildings.length === 0 ? (
          <Card className="bg-white">
            <p>Noch kein Gebäude erfasst.</p>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function selectedInventoryConfig(): RoomInventoryParams {
  const module = activeProfile.modules.find((candidate) => candidate.id === 'room-inventory')
  if (!module?.parameters) throw new Error('room-inventory is not selected in this profile')
  return module.parameters as RoomInventoryParams
}

function SummaryValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-base border-2 border-black bg-white px-3 py-2">
      <p className="text-2xl font-heading">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
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
  const [name, setName] = useState(building.name)
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-bold underline">Gebäude pflegen</summary>
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const value = name.trim()
          if (value) onSave(building.id, value, building.sort_key)
        }}
      >
        <label className="grid gap-1">
          <span className="font-bold">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 rounded border-2 border-black px-3"
          />
        </label>
        <Button type="submit" variant="neutral">
          Speichern
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={building.room_count > 0}
          title={building.room_count > 0 ? 'Erst alle Zimmer entfernen.' : undefined}
          onClick={() => onRemove(building.id)}
        >
          Gebäude entfernen
        </Button>
      </form>
    </details>
  )
}

function RoomEditor({
  room,
  beds,
  labels,
  floors,
  room_types: roomTypes,
  bed_types: bedTypes,
  onSave,
  onRemove,
  onBedSave,
  onBedRemove,
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
  ) => void
  onRemove: (id: string) => void
  onBedSave: (
    id: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ) => void
  onBedRemove: (id: string) => void
}) {
  const [number, setNumber] = useState(room.number)
  const [floor, setFloor] = useState(room.floor ?? '')
  const [roomType, setRoomType] = useState(room.room_type)
  const [values, setValues] = useState<RoomTraitValues>(() => roomTraitValuesFromLabels(labels))
  return (
    <details>
      <summary className="cursor-pointer font-bold underline">Zimmer pflegen</summary>
      <div className="mt-3 min-w-72 space-y-3 rounded border-2 border-black bg-main/10 p-3">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(
              room.id,
              {
                building_id: room.building_id,
                number: number.trim(),
                floor: floor || null,
                room_type: roomType,
                sort_key: room.sort_key,
              },
              values,
              labels,
            )
          }}
        >
          <label className="grid gap-1">
            <span className="font-bold">Nummer</span>
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              className="min-h-11 rounded border-2 border-black px-3"
            />
          </label>
          <Select label="Etage" value={floor} onChange={setFloor} options={floors} />
          <Select label="Zimmertyp" value={roomType} onChange={setRoomType} options={roomTypes} />
          <TraitFields
            values={values}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
          />
          <Button type="submit" variant="neutral">
            Zimmer speichern
          </Button>
        </form>
        <Button
          type="button"
          variant="neutral"
          disabled={beds.length > 0}
          title={beds.length > 0 ? 'Erst alle Betten entfernen.' : undefined}
          onClick={() => onRemove(room.id)}
        >
          Zimmer entfernen
        </Button>
        <div className="space-y-2 border-t-2 border-black pt-3">
          <h3 className="font-heading text-lg">Betten pflegen</h3>
          {beds.map((bed) => (
            <BedEditor
              key={bed.id}
              bed={bed}
              bed_types={bedTypes}
              onSave={onBedSave}
              onRemove={onBedRemove}
            />
          ))}
          {beds.length === 0 ? <p className="text-sm text-muted">Keine Betten erfasst.</p> : null}
        </div>
      </div>
    </details>
  )
}

function BedEditor({
  bed,
  bed_types: bedTypes,
  onSave,
  onRemove,
}: {
  bed: InventoryBed
  bed_types: readonly { value: string; label: string }[]
  onSave: (
    id: string,
    payload: { room_id: string; label: string; bed_type: string; sleeps: 1 | 2; sort_key: number },
  ) => void
  onRemove: (id: string) => void
}) {
  const [label, setLabel] = useState(bed.label)
  const [bedType, setBedType] = useState(bed.bed_type)
  return (
    <form
      className="space-y-2 rounded border border-black bg-white p-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!label.trim()) return
        onSave(bed.id, {
          room_id: bed.room_id,
          label: label.trim(),
          bed_type: bedType,
          sleeps: sleepsForBedType(bedType),
          sort_key: bed.sort_key,
        })
      }}
    >
      <p className="font-bold">{bed.label}</p>
      <label className="grid gap-1">
        <span className="font-bold">Bezeichnung</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="min-h-11 rounded border-2 border-black px-3"
        />
      </label>
      <Select label="Bettart" value={bedType} onChange={setBedType} options={bedTypes} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="neutral">
          Bett speichern
        </Button>
        <Button type="button" variant="neutral" onClick={() => onRemove(bed.id)}>
          Bett entfernen
        </Button>
      </div>
    </form>
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
              className="min-h-11 rounded border-2 border-black px-3"
            />
          </label>
        )
      })}
    </fieldset>
  )
}

function traitTitle(key: string): string {
  const definition = roomPropertyDefinitions.find((candidate) => candidate.key === key)
  return definition ? labelText(definition.trait.title) : key
}

function formatTrait(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'
  if (value === null || value === undefined) return '—'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function InventoryForm({
  title,
  button,
  onSubmit,
  children,
}: {
  title: string
  button: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: React.ReactNode
}) {
  return (
    <Card className="bg-white">
      <h2 className="text-xl font-heading">{title}</h2>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        {children}
        <Button type="submit" className="w-full">
          {button}
        </Button>
      </form>
    </Card>
  )
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
        className="min-h-11 rounded border-2 border-black bg-white px-3"
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

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}
