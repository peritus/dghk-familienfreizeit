import { useState, type FormEvent } from 'react'
import { activeProfile } from '../../../config/index.js'
import type { EventDraft } from '../../../events/types.js'
import { officialWorkshopsWorld } from '../../../modules/official-workshops/index.js'
import { workshopSchedulingWorld } from '../../../modules/workshop-scheduling/index.js'
import { workshopSpaceWorld } from '../../../modules/workshop-space/index.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../../solver/index.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { Button } from '../../components/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js'
import { Tag } from '../../components/ui/tag.js'
import { OrganiserLink } from '../../components/organiser-link.js'
import { OrganiserSectionNavigation } from '../components/section-navigation.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useOrganiser } from '../context.js'

function id(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}${random.replaceAll('-', '').slice(0, 16)}`
}

function draft(actor: string, type: string, payload: EventDraft['payload']): EventDraft {
  return { at: new Date().toISOString(), actor, subject: null, type, payload }
}

function WorkshopNavigation() {
  return (
    <OrganiserSectionNavigation
      ariaLabel="Workshopbereiche"
      items={[
        { href: organiserPaths.workshops(), label: 'Workshops' },
        { href: organiserPaths.workshop_spaces(), label: 'Räume und Slots' },
        { href: organiserPaths.workshop_programme(), label: 'Programm' },
      ]}
    />
  )
}

export function Workshops() {
  useDocumentTitle('Workshops · Familienfreizeit')
  const { world, state, stage } = useOrganiser()
  const summary = officialWorkshopsWorld(world!)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'children' | 'adults'>('all')
  const people = world!.persons
    .map((person) => {
      const labels = world!.labels_by_entity[person.id] ?? []
      const name = [
        labels.find((label) => label.key === 'given-name')?.value,
        labels.find((label) => label.key === 'family-name')?.value,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
      return { id: person.id, name: name || person.id }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    if (!title) {
      setError('Gib dem Workshop einen Titel.')
      return
    }
    stage([
      draft(state.principal_email ?? '', 'WorkshopAdded', {
        workshop_id: id('wks_'),
        title,
        description: String(data.get('description') ?? ''),
        audience: String(data.get('audience') ?? 'all'),
        age_min: Number(data.get('age_min') ?? 0),
        age_max: Number(data.get('age_max') ?? 120),
        capacity: Number(data.get('capacity') ?? 8),
        participation_mode: String(data.get('mode') ?? 'assigned'),
        leader_ids: data.getAll('leader_ids').map(String),
        needs: String(data.get('needs') ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        sort_key: summary.workshops.length + summary.cancelled.length + 1,
      }),
    ])
    event.currentTarget.reset()
    setOpen(false)
    setError(null)
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-wide text-muted">Workshops</p>
          <h1 className="mt-1 text-3xl font-heading sm:text-4xl">Workshopübersicht</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Anlegen, Wahl öffnen, Zuordnung prüfen und den aktuellen Plan festlegen.
          </p>
        </div>
        <Button onClick={() => setOpen((value) => !value)}>
          {open ? 'Abbrechen' : 'Workshop hinzufügen'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
          {error}
        </p>
      ) : null}
      {open ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Workshop anlegen</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={add}>
              <label className="grid gap-1 font-bold">
                Titel
                <input
                  name="title"
                  required
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 font-bold">
                Für
                <select
                  name="audience"
                  defaultValue="all"
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                >
                  <option value="all">Alle</option>
                  <option value="children">Kinder</option>
                  <option value="adults">Erwachsene</option>
                </select>
              </label>
              <label className="grid gap-1 font-bold sm:col-span-2">
                Beschreibung
                <textarea
                  name="description"
                  className="min-h-24 rounded-base border-2 border-black px-3 py-2 font-normal"
                />
              </label>
              <label className="grid gap-1 font-bold">
                Kapazität
                <input
                  name="capacity"
                  type="number"
                  min="0"
                  defaultValue="8"
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 font-bold">
                Teilnahme
                <select
                  name="mode"
                  defaultValue="assigned"
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                >
                  <option value="assigned">Zuordnung</option>
                  <option value="sign-up">Anmeldung</option>
                  <option value="interest">Interesse</option>
                </select>
              </label>
              <label className="grid gap-1 font-bold">
                Mindestalter
                <input
                  name="age_min"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 font-bold">
                Höchstalter
                <input
                  name="age_max"
                  type="number"
                  min="0"
                  defaultValue="120"
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 font-bold sm:col-span-2">
                Benötigt{' '}
                <span className="text-sm font-normal text-muted">
                  Mehrere Fähigkeiten mit Komma trennen; die Prüfung erfolgt über den Resolver.
                </span>
                <input
                  name="needs"
                  className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 font-bold sm:col-span-2">
                Leitungen
                <span className="text-sm font-normal text-muted">
                  Mehrere Personen oder externe Leitungen mit Strg/Cmd auswählen.
                </span>
                <select
                  name="leader_ids"
                  multiple
                  size={Math.min(6, Math.max(3, people.length + summary.external_leaders.length))}
                  className="min-h-24 rounded-base border-2 border-black px-3 py-2 font-normal"
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                  {summary.external_leaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} (extern)
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit">Entwurf anlegen</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat value={summary.workshops.length} label="aktive Workshops" />
        <Stat
          value={summary.workshops.filter((workshop) => workshop.mode === 'assigned').length}
          label="automatische Zuordnung"
        />
        <Stat value={summary.external_leaders.length} label="externe Leitungen" />
      </div>
      <section aria-labelledby="active-workshops" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="active-workshops" className="text-2xl font-heading">
            Aktive Workshops
          </h2>
          <label className="grid gap-1 font-bold">
            Zielgruppe
            <select
              value={audienceFilter}
              onChange={(event) =>
                setAudienceFilter(event.target.value as 'all' | 'children' | 'adults')
              }
              className="min-h-11 rounded-base border-2 border-black bg-white px-3 font-normal"
            >
              <option value="all">Alle</option>
              <option value="children">Kinder</option>
              <option value="adults">Erwachsene</option>
            </select>
          </label>
        </div>
        {summary.workshops.filter(
          (workshop) => audienceFilter === 'all' || workshop.audience === audienceFilter,
        ).length ? (
          summary.workshops
            .filter((workshop) => audienceFilter === 'all' || workshop.audience === audienceFilter)
            .map((workshop) => (
              <Card key={workshop.id} className="bg-white">
                <CardContent className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-heading">{workshop.title}</h3>
                    <p className="mt-1 text-muted">
                      {workshop.description || 'Keine Beschreibung'}
                    </p>
                    <p className="mt-2 text-sm">
                      {workshop.audience} · {workshop.capacity} Plätze · {workshop.age_min}–
                      {workshop.age_max} Jahre
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Tag>{workshop.mode}</Tag>
                    <Tag>{workshop.leader_ids.length} Leitungen</Tag>
                  </div>
                </CardContent>
              </Card>
            ))
        ) : (
          <Card className="bg-white">
            <CardContent>
              <p>Noch keine Workshops. Lege den ersten Entwurf an.</p>
            </CardContent>
          </Card>
        )}
      </section>
      {summary.cancelled.length ? (
        <p className="text-sm text-muted">
          {summary.cancelled.length} abgesagte Workshops bleiben in der Historie sichtbar.
        </p>
      ) : null}
    </div>
  )
}

export function WorkshopProgramme() {
  useDocumentTitle('Programm · Workshops · Familienfreizeit')
  const { world } = useOrganiser()
  const schedule = workshopSchedulingWorld(world!)
  const official = officialWorkshopsWorld(world!)
  const plan = solve(
    buildSolverInput(world!, composeSolverContributions(activeProfile)),
    composeSolverContributions(activeProfile),
    {
      build_revision: 'organiser',
      compatibility_revision: 1,
      event_date: activeProfile.meta.starts_on,
      profile: activeProfile,
      seed: null,
    },
  )
  const placements =
    (
      plan.sections['workshop-scheduling'] as
        | { placements?: readonly { workshop_id: string; slot_id: string; space_id: string }[] }
        | undefined
    )?.placements ?? []
  const unassignedWorkshops = official.workshops.filter(
    (workshop) => !placements.some((placement) => placement.workshop_id === workshop.id),
  )
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <header>
        <p className="font-bold uppercase tracking-wide text-muted">Programm</p>
        <h1 className="mt-1 text-3xl font-heading sm:text-4xl">Wann findet was statt?</h1>
        <p className="mt-2 text-muted">
          Jeder Workshop erhält höchstens eine Platzierung. Nicht geplante Workshops bleiben mit
          Grund sichtbar.
        </p>
      </header>
      <Card className="bg-white">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left">
              <caption className="sr-only">Workshopplatzierungen</caption>
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="p-3">Workshop</th>
                  <th className="p-3">Slot</th>
                  <th className="p-3">Raum</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {placements.map((placement) => (
                  <tr key={placement.workshop_id} className="border-b border-black/30">
                    <th className="p-3">
                      {official.workshops.find((workshop) => workshop.id === placement.workshop_id)
                        ?.title ?? placement.workshop_id}
                    </th>
                    <td className="p-3">
                      {schedule.slots.find((slot) => slot.id === placement.slot_id)?.starts_at ??
                        placement.slot_id}
                    </td>
                    <td className="p-3">{placement.space_id}</td>
                    <td className="p-3">
                      <Tag>geplant</Tag>
                    </td>
                  </tr>
                ))}
                {unassignedWorkshops.map((workshop) => (
                  <tr key={`unassigned-${workshop.id}`} className="border-b border-black/30">
                    <th className="p-3">{workshop.title}</th>
                    <td className="p-3" colSpan={2}>
                      Keine passende Platzierung
                    </td>
                    <td className="p-3">
                      <Tag>prüfen</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function WorkshopSlots() {
  useDocumentTitle('Slots · Workshops · Familienfreizeit')
  const { world, state, stage } = useOrganiser()
  const summary = workshopSchedulingWorld(world!)
  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const starts = new globalThis.Date(String(data.get('starts_at'))).toISOString()
    const ends = new globalThis.Date(String(data.get('ends_at'))).toISOString()
    stage([
      draft(state.principal_email ?? '', 'WorkshopSlotAdded', {
        slot_id: id('slot_'),
        starts_at: starts,
        ends_at: ends,
        sort_key: summary.slots.length + 1,
      }),
    ])
    event.currentTarget.reset()
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <header>
        <h1 className="text-3xl font-heading sm:text-4xl">Slots</h1>
        <p className="mt-2 text-muted">Event-backed Zeitfenster für das Programm.</p>
      </header>
      <Card className="bg-white">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={add}>
            <label className="grid gap-1 font-bold">
              Beginn
              <input
                required
                name="starts_at"
                type="datetime-local"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Ende
              <input
                required
                name="ends_at"
                type="datetime-local"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit">Slot hinzufügen</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {summary.slots.map((slot) => (
          <Card key={slot.id} size="sm" className="bg-white">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>{new globalThis.Date(slot.starts_at).toLocaleString('de-DE')}</strong>
                <span className="mx-2">–</span>
                <strong>
                  {new globalThis.Date(slot.ends_at).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  stage([
                    draft(state.principal_email ?? '', 'WorkshopSlotRetired', {
                      slot_id: slot.id,
                      reason: 'Organisatorisch entfernt',
                    }),
                  ])
                }
              >
                Entfernen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function WorkshopSpaces() {
  useDocumentTitle('Räume und Slots · Workshops · Familienfreizeit')
  const { world, state, stage } = useOrganiser()
  const summary = workshopSpaceWorld(world!)
  const schedule = workshopSchedulingWorld(world!)
  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const availabilityStart = String(data.get('availability_start') ?? '')
    const availabilityEnd = String(data.get('availability_end') ?? '')
    const availabilityWindows =
      availabilityStart && availabilityEnd
        ? [
            {
              starts_at: new globalThis.Date(availabilityStart).toISOString(),
              ends_at: new globalThis.Date(availabilityEnd).toISOString(),
            },
          ]
        : []
    stage([
      draft(state.principal_email ?? '', 'WorkshopSpaceAdded', {
        workshop_space_id: id('wsp_'),
        name: String(data.get('name') ?? ''),
        location_description: String(data.get('location') ?? ''),
        capacity: Number(data.get('capacity') ?? 0),
        availability_windows: availabilityWindows,
        sort_key: summary.live.length + 1,
      }),
    ])
    event.currentTarget.reset()
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading sm:text-4xl">Räume und Slots</h1>
            <p className="mt-2 text-muted">
              Physische Workshopräume, Kapazitäten und schedule-aware Verfügbarkeit.
            </p>
          </div>
          <OrganiserLink
            href={organiserPaths.workshop_slots()}
            className="min-h-11 rounded-base border-2 border-black bg-white px-4 py-2 font-bold hover:bg-main"
          >
            Slots verwalten
          </OrganiserLink>
        </div>
      </header>
      <Card className="bg-white">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={add}>
            <label className="grid gap-1 font-bold sm:col-span-2">
              Name
              <input
                required
                name="name"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Ort
              <input
                required
                name="location"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Kapazität
              <input
                required
                name="capacity"
                type="number"
                min="0"
                defaultValue="8"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Verfügbar ab
              <input
                name="availability_start"
                type="datetime-local"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Verfügbar bis
              <input
                name="availability_end"
                type="datetime-local"
                className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
              />
            </label>
            <div>
              <Button type="submit">Raum hinzufügen</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {summary.live.map((space) => (
          <Card key={space.id} size="sm" className="bg-white">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>{space.name}</strong>
                <p className="text-sm text-muted">
                  {space.location_description} · {space.capacity} Plätze
                </p>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {schedule.slots.map((slot) => {
                    const block = schedule.space_slot_blocks.find(
                      (item) => item.space_id === space.id && item.slot_id === slot.id,
                    )
                    return (
                      <li key={slot.id}>
                        <Button
                          size="sm"
                          variant={block ? 'danger' : 'neutral'}
                          onClick={() =>
                            stage([
                              draft(
                                state.principal_email ?? '',
                                block ? 'SpaceSlotUnblocked' : 'SpaceSlotBlocked',
                                block
                                  ? {
                                      block_id: block.id,
                                      space_id: space.id,
                                      slot_id: slot.id,
                                      reason: block.reason,
                                    }
                                  : {
                                      block_id: id('blk_'),
                                      space_id: space.id,
                                      slot_id: slot.id,
                                      reason: 'Für diesen Slot nicht verfügbar',
                                    },
                              ),
                            ])
                          }
                        >
                          {new globalThis.Date(slot.starts_at).toLocaleString('de-DE', {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {block ? 'gesperrt' : 'frei'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  stage([
                    draft(state.principal_email ?? '', 'WorkshopSpaceRetired', {
                      workshop_space_id: space.id,
                      reason: 'Organisatorisch entfernt',
                    }),
                  ])
                }
              >
                Entfernen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card className="bg-white p-4 text-center">
      <p className="text-4xl font-heading leading-none">{value}</p>
      <p className="mt-1 font-bold">{label}</p>
    </Card>
  )
}
