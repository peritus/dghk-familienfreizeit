import { useState, type FormEvent } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useOrganiser } from '../context.js'
import { inventoryWorld } from '../../../modules/room-inventory/index.js'
import type { EventDraft } from '../../../events/types.js'

const floors = [
  { value: '', label: 'Keine Etage' },
  { value: 'ground', label: 'Erdgeschoss' },
  { value: 'first', label: '1. Etage' },
  { value: 'second', label: '2. Etage' },
]
const roomTypes = [
  { value: 'standard', label: 'Standard' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'schlaffass', label: 'Schlaffass' },
]
const bedTypes = [
  { value: 'single', label: 'Einzelbett' },
  { value: 'double', label: 'Doppelbett' },
]

function id(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}${random.replaceAll('-', '').slice(0, 16)}`
}

function draft(actor: string, type: string, payload: EventDraft['payload']): EventDraft {
  return { at: new Date().toISOString(), actor, subject: null, type, payload }
}

export function Inventory() {
  const { world, state, stage } = useOrganiser()
  const summary = inventoryWorld(world!)
  const [buildingName, setBuildingName] = useState('')
  const [roomBuilding, setRoomBuilding] = useState(summary.buildings[0]?.id ?? '')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomFloor, setRoomFloor] = useState('')
  const [roomType, setRoomType] = useState('standard')
  const [bedRoom, setBedRoom] = useState(summary.rooms[0]?.id ?? '')
  const [bedLabel, setBedLabel] = useState('')
  const [bedType, setBedType] = useState('single')
  const [sleeps, setSleeps] = useState('1')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>, events: readonly EventDraft[]) {
    event.preventDefault()
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
    submit(event, [
      draft(state.principal_email ?? '', 'RoomAdded', {
        room_id: id('rm_'),
        building_id: roomBuilding,
        number,
        floor: roomFloor || null,
        room_type: roomType,
        sort_key: summary.rooms.length + 1,
      }),
    ])
    setRoomNumber('')
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
        sleeps: sleeps === '2' ? 2 : 1,
        sort_key: summary.beds.filter((bed) => bed.room_id === bedRoom).length + 1,
      }),
    ])
    setBedLabel('')
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
          <Select
            label="Schlafplätze"
            value={sleeps}
            onChange={setSleeps}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
            ]}
          />
        </InventoryForm>
      </div>

      <p className="text-lg font-bold">
        Kapazität: {summary.capacity} Schlafplätze · Kosten: {formatEuro(summary.cost_eur)}
      </p>

      <div className="space-y-6">
        {summary.buildings.map((building) => (
          <Card key={building.id} className="bg-white p-0">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-black p-5">
              <h2 className="text-2xl font-heading">{building.name}</h2>
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
                          {room.traits.sanitary ? String(room.traits.sanitary) : '—'}
                          {typeof room.traits['price-per-bed-eur'] === 'number'
                            ? ` · ${formatEuro(room.traits['price-per-bed-eur'])}`
                            : ''}
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

function SummaryValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-base border-2 border-black bg-white px-3 py-2">
      <p className="text-2xl font-heading">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
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
