import { useState, type FormEvent } from 'react'
import { activeProfile } from '../../../config/index.js'
import type { EventDraft } from '../../../events/types.js'
import { officialWorkshopsWorld } from '../../../modules/official-workshops/index.js'
import { workshopSchedulingWorld } from '../../../modules/workshop-scheduling/index.js'
import { workshopSpaceWorld } from '../../../modules/workshop-space/index.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../../solver/index.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { Button } from '../../components/ui/button.js'
import { OrganiserLink } from '../../components/organiser-link.js'
import {
  SpaceEditorForm,
  SlotEditorForm,
  WorkshopEditorForm,
  WorkshopLeaderPicker,
} from '../components/workshop/editors.js'
import {
  WorkshopEmptyState,
  WorkshopScreenHeader,
  WorkshopSectionHeader,
  WorkshopStatsStrip,
} from '../components/workshop/shared.js'
import { WorkshopSummaryRow } from '../components/workshop/authoring.js'
import { ProgrammeGrid, UnplacedWorkshopRow } from '../components/workshop/programme.js'
import {
  SlotDayGroup,
  SpaceRow,
  SpaceSlotToggle,
  type WorkshopSlotView,
  type WorkshopSpaceView,
} from '../components/workshop/resources.js'
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
      aria_label="Workshopbereiche"
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
        participation_mode: String(data.get('participation_mode') ?? 'assigned'),
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
      <WorkshopScreenHeader
        eyebrow="Workshops"
        title="Workshopübersicht"
        description="Anlegen, Wahl öffnen, Zuordnung prüfen und den aktuellen Plan festlegen."
        action={
          <Button onClick={() => setOpen((value) => !value)}>
            {open ? 'Abbrechen' : 'Workshop hinzufügen'}
          </Button>
        }
      />
      {error ? (
        <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
          {error}
        </p>
      ) : null}
      {open ? (
        <WorkshopEditorForm on_submit={add} submit_label="Entwurf anlegen" default_values={{}}>
          <WorkshopLeaderPicker
            leaders={[
              ...people.map((person) => ({ id: person.id, label: person.name })),
              ...summary.external_leaders.map((leader) => ({
                id: leader.id,
                label: leader.name,
                external: true,
              })),
            ]}
          />
        </WorkshopEditorForm>
      ) : null}
      <WorkshopStatsStrip
        items={[
          { value: summary.workshops.length, label: 'aktive Workshops' },
          {
            value: summary.workshops.filter((workshop) => workshop.mode === 'assigned').length,
            label: 'automatische Zuordnung',
          },
          { value: summary.external_leaders.length, label: 'externe Leitungen' },
        ]}
      />
      <section aria-label="Aktive Workshops" className="space-y-3">
        <WorkshopSectionHeader
          title="Aktive Workshops"
          action={
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
          }
        />
        {summary.workshops.filter(
          (workshop) => audienceFilter === 'all' || workshop.audience === audienceFilter,
        ).length ? (
          summary.workshops
            .filter((workshop) => audienceFilter === 'all' || workshop.audience === audienceFilter)
            .map((workshop) => (
              <WorkshopSummaryRow
                key={workshop.id}
                workshop={{
                  id: workshop.id,
                  title: workshop.title,
                  description: workshop.description,
                  audience: workshop.audience,
                  age_range: `${workshop.age_min}–${workshop.age_max} Jahre`,
                  capacity: workshop.capacity,
                  participation_mode: workshop.mode,
                  leaders: workshop.leader_ids,
                  requirement: workshop.needs.join(', ') || undefined,
                }}
              />
            ))
        ) : (
          <WorkshopEmptyState title="Keine aktiven Workshops">
            Noch keine Workshops. Lege den ersten Entwurf an.
          </WorkshopEmptyState>
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
  const spaces = workshopSpaceWorld(world!).live
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
  const unscheduled = new Map(
    (
      plan.sections['workshop-scheduling'] as
        | { unscheduled?: readonly { workshop_id: string; reason: string }[] }
        | undefined
    )?.unscheduled?.map((item) => [item.workshop_id, item.reason]) ?? [],
  )
  const unassignedWorkshops = official.workshops
    .filter((workshop) => !placements.some((placement) => placement.workshop_id === workshop.id))
    .map((workshop) => ({
      id: workshop.id,
      title: workshop.title,
      reason: unscheduled.get(workshop.id) ?? 'Keine passende Platzierung',
      demand_label: `${workshop.capacity} Plätze benötigt`,
    }))
  const rooms = spaces.map((space) => ({ id: space.id, label: space.name }))
  const rows = schedule.slots.map((slot) => ({
    id: slot.id,
    slot_label: new globalThis.Date(slot.starts_at).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cells: rooms.map((room) => {
      const placement = placements.find(
        (candidate) => candidate.slot_id === slot.id && candidate.space_id === room.id,
      )
      const blocked = schedule.space_slot_blocks.some(
        (block) => block.slot_id === slot.id && block.space_id === room.id,
      )
      if (blocked) return { id: `${slot.id}-${room.id}`, state: 'blocked' as const }
      const workshop = placement
        ? official.workshops.find((candidate) => candidate.id === placement.workshop_id)
        : undefined
      return workshop
        ? {
            id: workshop.id,
            state: 'placed' as const,
            title: workshop.title,
            audience: workshop.audience,
            age_range: `${workshop.age_min}–${workshop.age_max} Jahre`,
            leaders: `${workshop.leader_ids.length} Leitungen`,
            capacity_label: `${workshop.capacity} Plätze`,
          }
        : { id: `${slot.id}-${room.id}`, state: 'empty' as const }
    }),
  }))
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Programm"
        title="Wann findet was statt?"
        description="Jeder Workshop erhält höchstens eine Platzierung. Nicht geplante Workshops bleiben mit Grund sichtbar."
      />
      <ProgrammeGrid
        rooms={rooms}
        rows={rows}
        day_rows={rows.map((row) => ({ id: row.id, label: 'Programm' }))}
      />
      {unassignedWorkshops.length ? (
        <section className="space-y-3" aria-label="Nicht eingeplante Workshops">
          <h2 className="text-2xl font-heading">Nicht eingeplant</h2>
          <ul className="overflow-hidden rounded-base border-2 border-black">
            {unassignedWorkshops.map((workshop) => (
              <UnplacedWorkshopRow key={workshop.id} workshop={workshop} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function WorkshopSlots() {
  useDocumentTitle('Slots · Workshops · Familienfreizeit')
  const { world, state, stage } = useOrganiser()
  const summary = workshopSchedulingWorld(world!)
  const slotViews: readonly WorkshopSlotView[] = summary.slots.map((slot) => {
    const startsAt = new globalThis.Date(slot.starts_at)
    return {
      id: slot.id,
      day_label: startsAt.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      }),
      time_label: startsAt.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      workshop_count: 0,
    }
  })
  const slotsByDay = slotViews.reduce((groups, slot) => {
    const daySlots = groups.get(slot.day_label) ?? []
    daySlots.push(slot)
    groups.set(slot.day_label, daySlots)
    return groups
  }, new Map<string, WorkshopSlotView[]>())
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
      <WorkshopScreenHeader
        title="Slots"
        description="Event-backed Zeitfenster für das Programm."
      />
      <SlotEditorForm on_submit={add} submit_label="Slot hinzufügen" show_day={false} />
      <div className="grid gap-6">
        {Array.from(slotsByDay, ([day, slots]) => (
          <SlotDayGroup
            key={day}
            day_label={day}
            slots={slots}
            action={(slot) => (
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
            )}
          />
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
  const spaceViews: readonly WorkshopSpaceView[] = summary.live.map((space) => ({
    id: space.id,
    name: space.name,
    location: space.location_description,
    capacity: space.capacity,
    capabilities: [],
    blocked_slots: schedule.space_slot_blocks
      .filter((block) => block.space_id === space.id)
      .map((block) => block.slot_id),
  }))
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
      <WorkshopScreenHeader
        title="Räume und Slots"
        description="Physische Workshopräume, Kapazitäten und schedule-aware Verfügbarkeit."
        action={
          <OrganiserLink
            href={organiserPaths.workshop_slots()}
            className="min-h-11 rounded-base border-2 border-black bg-white px-4 py-2 font-bold hover:bg-main"
          >
            Slots verwalten
          </OrganiserLink>
        }
      />
      <SpaceEditorForm on_submit={add} submit_label="Raum hinzufügen" />
      <div className="grid gap-3">
        {spaceViews.map((space) => (
          <SpaceRow
            key={space.id}
            space={space}
            action={
              <div className="grid gap-3">
                <ul className="flex flex-wrap gap-2 text-sm">
                  {schedule.slots.map((slot) => {
                    const block = schedule.space_slot_blocks.find(
                      (item) => item.space_id === space.id && item.slot_id === slot.id,
                    )
                    return (
                      <li key={slot.id} className="flex items-center gap-2">
                        <span className="text-xs text-muted">
                          {new globalThis.Date(slot.starts_at).toLocaleString('de-DE', {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <SpaceSlotToggle
                          blocked={Boolean(block)}
                          onChange={() =>
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
                        />
                      </li>
                    )
                  })}
                </ul>
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
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}
