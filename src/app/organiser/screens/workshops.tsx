import { useState, type FormEvent } from 'react'
import { activeProfile } from '../../../config/index.js'
import type { KernelWorld } from '../../../events/fold.js'
import type { EventDraft } from '../../../events/types.js'
import { officialWorkshopsWorld } from '../../../modules/official-workshops/index.js'
import {
  workshopSchedulingWorld,
  type WorkshopSlot,
} from '../../../modules/workshop-scheduling/index.js'
import { workshopSpaceWorld, type WorkshopSpace } from '../../../modules/workshop-space/index.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../../solver/index.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { Button } from '../../components/shared/ui/button.js'
import { DestructiveActionDialog } from '../../components/shared/ui/destructive-action-dialog.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import {
  SpaceEditorForm,
  SlotEditorForm,
  WorkshopEditorForm,
  WorkshopLeaderPicker,
} from '../components/workshop/editors.js'
import {
  WorkshopEmptyState,
  WorkshopLifecycleTimeline,
  WorkshopPhaseNotice,
  WorkshopScreenHeader,
  WorkshopSectionHeader,
  WorkshopStatsStrip,
} from '../../components/shared/workshop/shared.js'
import { WorkshopSummaryRow } from '../../../modules/official-workshops/app/components/authoring.js'
import {
  ProgrammeGrid,
  UnplacedWorkshopRow,
} from '../../../modules/workshop-scheduling/app/components/programme.js'
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

type Placement = { workshop_id: string; slot_id: string; space_id: string }

type SchedulingUnscheduled = { workshop_id: string; reason: string }

type WorkshopPlan = {
  placements: readonly Placement[]
  unscheduled: readonly SchedulingUnscheduled[]
  demand: Readonly<Record<string, number>>
  assignments: readonly { person_id: string; workshop_id: string }[]
  signups: readonly { person_id: string; workshop_id: string }[]
  interests: readonly { person_id: string; workshop_id: string }[]
}

function dateTimeLocal(value: string): string {
  const date = new globalThis.Date(value)
  const part = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(
    date.getHours(),
  )}:${part(date.getMinutes())}`
}

function WorkshopRetireAction({
  label,
  title,
  description,
  onConfirm,
}: {
  label: string
  title: string
  description: string
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <DestructiveActionDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
      />
    </>
  )
}

function solveWorkshopPlan(world: KernelWorld): WorkshopPlan {
  const contributions = composeSolverContributions(activeProfile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'organiser',
    compatibility_revision: 1,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  const scheduling = plan.sections['workshop-scheduling'] as
    | { placements?: readonly Placement[]; unscheduled?: readonly SchedulingUnscheduled[] }
    | undefined
  const rankings = plan.sections['workshop-rankings'] as
    | { demand?: Readonly<Record<string, number>> }
    | undefined
  const attendance = plan.sections['workshop-assignment'] as
    | {
        assignments?: readonly { person_id: string; workshop_id: string }[]
        signups?: readonly { person_id: string; workshop_id: string }[]
        interests?: readonly { person_id: string; workshop_id: string }[]
      }
    | undefined
  return {
    placements: scheduling?.placements ?? [],
    unscheduled: scheduling?.unscheduled ?? [],
    demand: rankings?.demand ?? {},
    assignments: attendance?.assignments ?? [],
    signups: attendance?.signups ?? [],
    interests: attendance?.interests ?? [],
  }
}

function audienceLabel(audience: string): string {
  return { children: 'Kinder', adults: 'Erwachsene', all: 'Alle' }[audience] ?? audience
}

function participationLabel(mode: string): string {
  return (
    { assigned: 'Automatische Zuordnung', 'sign-up': 'Anmeldung', interest: 'Interesse' }[mode] ??
    mode
  )
}

function placementLabel(
  workshopId: string,
  placements: readonly Placement[],
  slots: readonly { id: string; starts_at: string }[],
  spaces: readonly { id: string; name: string }[],
): string | undefined {
  const placement = placements.find((item) => item.workshop_id === workshopId)
  if (!placement) return undefined
  const slot = slots.find((item) => item.id === placement.slot_id)
  const space = spaces.find((item) => item.id === placement.space_id)
  if (!slot || !space) return 'Im Programm platziert'
  const date = new globalThis.Date(slot.starts_at).toLocaleString('de-DE', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} Uhr · ${space.name}`
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
  const schedule = workshopSchedulingWorld(world!)
  const spaces = workshopSpaceWorld(world!).live
  const plan = solveWorkshopPlan(world!)
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
  const leaderNames = new Map([
    ...people.map((person) => [person.id, person.name] as const),
    ...summary.external_leaders.map((leader) => [leader.id, `${leader.name} (extern)`] as const),
  ])
  const assignedByWorkshop = new Map<string, number>()
  for (const assignment of plan.assignments)
    assignedByWorkshop.set(
      assignment.workshop_id,
      (assignedByWorkshop.get(assignment.workshop_id) ?? 0) + 1,
    )
  const placedWorkshopIds = new Set(plan.placements.map((placement) => placement.workshop_id))
  const activeWorkshops = summary.workshops.filter(
    (workshop) => audienceFilter === 'all' || workshop.audience === audienceFilter,
  )
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
      <WorkshopLifecycleTimeline
        steps={[
          {
            id: 'authoring',
            label: 'Workshops anlegen',
            state: summary.workshops.length ? 'complete' : 'current',
            description: summary.workshops.length
              ? `${summary.workshops.length} Workshop${summary.workshops.length === 1 ? '' : 's'} angelegt`
              : 'Titel, Zielgruppe und Leitung erfassen',
          },
          {
            id: 'choice',
            label: 'Wahl öffnen',
            state: summary.workshops.length ? 'current' : 'upcoming',
            description: 'Die nächste manuelle Freigabe für Familien',
          },
          {
            id: 'review',
            label: 'Zuordnung prüfen',
            state: 'upcoming',
            description: 'Bedarf, Plätze und Konflikte kontrollieren',
          },
          {
            id: 'fixed',
            label: 'Festgelegt',
            state: 'upcoming',
            description: 'Plan veröffentlichen und Listen erzeugen',
          },
        ]}
      />
      <WorkshopPhaseNotice
        label={summary.workshops.length ? 'Vorbereitung' : 'Noch kein Workshopplan'}
        tone={summary.workshops.length ? 'success' : 'attention'}
        details={
          summary.workshops.length
            ? 'Die Wahlphase ist in dieser Ansicht noch nicht als eigenes Ereignis gespeichert.'
            : 'Lege den ersten Workshop an, um die nächste Phase vorzubereiten.'
        }
      >
        {summary.workshops.length
          ? 'Workshopdaten sind vorhanden. Prüfe als Nächstes die Zielgruppen, Leitungen und Programmwünsche.'
          : 'Die Workshopdatenbank ist bereit für den ersten Entwurf.'}
      </WorkshopPhaseNotice>
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
          {
            value: summary.workshops.filter((workshop) => !placedWorkshopIds.has(workshop.id))
              .length,
            label: 'noch nicht eingeplant',
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
        {activeWorkshops.length ? (
          activeWorkshops.map((workshop) => (
            <WorkshopSummaryRow
              key={workshop.id}
              workshop={{
                id: workshop.id,
                title: workshop.title,
                description: workshop.description,
                audience: audienceLabel(workshop.audience),
                age_range: `${workshop.age_min}–${workshop.age_max} Jahre`,
                capacity: workshop.capacity,
                participation_mode: participationLabel(workshop.mode),
                leaders: workshop.leader_ids.map(
                  (leaderId) => leaderNames.get(leaderId) ?? leaderId,
                ),
                requirement: workshop.needs.join(', ') || undefined,
                demand:
                  workshop.mode === 'assigned'
                    ? `${assignedByWorkshop.get(workshop.id) ?? 0}/${workshop.capacity} zugeordnet${
                        plan.demand[workshop.id] ? ` · ${plan.demand[workshop.id]} Wünsche` : ''
                      }`
                    : workshop.mode === 'sign-up'
                      ? `${plan.signups.filter((item) => item.workshop_id === workshop.id).length} Anmeldungen`
                      : `${plan.interests.filter((item) => item.workshop_id === workshop.id).length} Interessen`,
                placement: {
                  label:
                    placementLabel(workshop.id, plan.placements, schedule.slots, spaces) ??
                    'Noch nicht eingeplant',
                  tone: placedWorkshopIds.has(workshop.id) ? 'success' : 'attention',
                },
                attention: workshop.leader_ids.length ? undefined : 'Leitung fehlt',
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
  const plan = solveWorkshopPlan(world!)
  const unscheduled = new Map(plan.unscheduled.map((item) => [item.workshop_id, item.reason]))
  const unassignedWorkshops = official.workshops
    .filter(
      (workshop) => !plan.placements.some((placement) => placement.workshop_id === workshop.id),
    )
    .map((workshop) => ({
      id: workshop.id,
      title: workshop.title,
      reason: unscheduled.get(workshop.id) ?? 'Keine passende Platzierung',
      demand_label:
        workshop.mode === 'assigned'
          ? `${plan.demand[workshop.id] ?? 0} Wünsche · Kapazität ${workshop.capacity}`
          : workshop.mode === 'sign-up'
            ? `${plan.signups.filter((item) => item.workshop_id === workshop.id).length} Anmeldungen`
            : `${plan.interests.filter((item) => item.workshop_id === workshop.id).length} Interessen`,
    }))
  const rooms = spaces.map((space) => ({ id: space.id, label: space.name }))
  const rows = schedule.slots.map((slot) => ({
    id: slot.id,
    day_label: new globalThis.Date(slot.starts_at).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    }),
    slot_label: new globalThis.Date(slot.starts_at).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cells: rooms.map((room) => {
      const placement = plan.placements.find(
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
            audience: audienceLabel(workshop.audience),
            age_range: `${workshop.age_min}–${workshop.age_max} Jahre`,
            leaders: `${workshop.leader_ids.length} ${workshop.leader_ids.length === 1 ? 'Leitung' : 'Leitungen'}`,
            capacity_label: `${workshop.capacity} Plätze`,
            demand_label: plan.demand[workshop.id]
              ? `${plan.demand[workshop.id]} Wünsche`
              : undefined,
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
        day_rows={rows.map((row) => ({ id: row.id, label: row.day_label }))}
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
  const plan = solveWorkshopPlan(world!)
  const [editingSlot, setEditingSlot] = useState<WorkshopSlot | null>(null)
  const [slotError, setSlotError] = useState<string | null>(null)
  const overlappingSlotIds = new Set(
    summary.slots.flatMap((slot, index) =>
      summary.slots
        .slice(index + 1)
        .flatMap((other) =>
          new globalThis.Date(slot.starts_at).getTime() <=
            new globalThis.Date(other.ends_at).getTime() &&
          new globalThis.Date(other.starts_at).getTime() <=
            new globalThis.Date(slot.ends_at).getTime()
            ? [slot.id, other.id]
            : [],
        ),
    ),
  )
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
      workshop_count: plan.placements.filter((placement) => placement.slot_id === slot.id).length,
      conflict: overlappingSlotIds.has(slot.id) ? 'Überschneidung prüfen' : undefined,
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
    const startsDate = new globalThis.Date(String(data.get('starts_at')))
    const endsDate = new globalThis.Date(String(data.get('ends_at')))
    if (!Number.isFinite(startsDate.getTime()) || !Number.isFinite(endsDate.getTime())) {
      setSlotError('Beginn und Ende müssen gültige Zeitpunkte sein.')
      return
    }
    if (startsDate >= endsDate) {
      setSlotError('Das Ende muss nach dem Beginn liegen.')
      return
    }
    if (
      summary.slots.some(
        (slot) =>
          slot.id !== editingSlot?.id &&
          startsDate.getTime() <= new globalThis.Date(slot.ends_at).getTime() &&
          new globalThis.Date(slot.starts_at).getTime() <= endsDate.getTime(),
      )
    ) {
      setSlotError('Dieser Zeitraum überschneidet sich mit einem bestehenden Slot.')
      return
    }
    stage([
      draft(
        state.principal_email ?? '',
        editingSlot ? 'WorkshopSlotUpdated' : 'WorkshopSlotAdded',
        {
          slot_id: editingSlot?.id ?? id('slot_'),
          starts_at: startsDate.toISOString(),
          ends_at: endsDate.toISOString(),
          sort_key: editingSlot?.sort_key ?? summary.slots.length + 1,
        },
      ),
    ])
    event.currentTarget.reset()
    setEditingSlot(null)
    setSlotError(null)
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        title="Slots"
        description="Event-backed Zeitfenster für das Programm."
      />
      {slotError ? (
        <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
          {slotError}
        </p>
      ) : null}
      <SlotEditorForm
        key={editingSlot?.id ?? 'new-slot'}
        on_submit={add}
        submit_label={editingSlot ? 'Slot speichern' : 'Slot hinzufügen'}
        show_day={false}
        default_values={
          editingSlot
            ? {
                starts_at: dateTimeLocal(editingSlot.starts_at),
                ends_at: dateTimeLocal(editingSlot.ends_at),
              }
            : undefined
        }
      />
      <div className="grid gap-6">
        {Array.from(slotsByDay, ([day, slots]) => (
          <SlotDayGroup
            key={day}
            day_label={day}
            slots={slots}
            action={(slot) => (
              <>
                <Button
                  size="sm"
                  variant="neutral"
                  onClick={() =>
                    setEditingSlot(summary.slots.find((item) => item.id === slot.id) ?? null)
                  }
                >
                  Bearbeiten
                </Button>
                <WorkshopRetireAction
                  label="Entfernen"
                  title="Slot entfernen?"
                  description={`${slot.day_label}, ${slot.time_label} wird aus dem Workshopprogramm entfernt.`}
                  onConfirm={() =>
                    stage([
                      draft(state.principal_email ?? '', 'WorkshopSlotRetired', {
                        slot_id: slot.id,
                        reason: 'Organisatorisch entfernt',
                      }),
                    ])
                  }
                />
              </>
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
  const [editingSpace, setEditingSpace] = useState<WorkshopSpace | null>(null)
  const slotLabels = new Map(
    schedule.slots.map((slot) => [
      slot.id,
      `${new globalThis.Date(slot.starts_at).toLocaleString('de-DE', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })} Uhr`,
    ]),
  )
  const spaceViews: readonly WorkshopSpaceView[] = summary.live.map((space) => ({
    id: space.id,
    name: space.name,
    location: space.location_description,
    capacity: space.capacity,
    capabilities: world!.capabilities
      .filter((capability) => capability.entity_id === space.id)
      .map((capability) => capability.key),
    blocked_slots: schedule.space_slot_blocks
      .filter((block) => block.space_id === space.id)
      .map((block) => slotLabels.get(block.slot_id) ?? block.slot_id),
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
      draft(
        state.principal_email ?? '',
        editingSpace ? 'WorkshopSpaceUpdated' : 'WorkshopSpaceAdded',
        {
          workshop_space_id: editingSpace?.id ?? id('wsp_'),
          name: String(data.get('name') ?? ''),
          location_description: String(data.get('location') ?? ''),
          capacity: Number(data.get('capacity') ?? 0),
          availability_windows: availabilityWindows,
          sort_key: editingSpace?.sort_key ?? summary.live.length + 1,
        },
      ),
    ])
    event.currentTarget.reset()
    setEditingSpace(null)
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
      <SpaceEditorForm
        key={editingSpace?.id ?? 'new-space'}
        on_submit={add}
        submit_label={editingSpace ? 'Raum speichern' : 'Raum hinzufügen'}
        default_values={
          editingSpace
            ? {
                name: editingSpace.name,
                location: editingSpace.location_description,
                capacity: editingSpace.capacity,
                availability_start: editingSpace.availability_windows[0]
                  ? dateTimeLocal(editingSpace.availability_windows[0].starts_at)
                  : undefined,
                availability_end: editingSpace.availability_windows[0]
                  ? dateTimeLocal(editingSpace.availability_windows[0].ends_at)
                  : undefined,
              }
            : undefined
        }
      />
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
                  variant="neutral"
                  onClick={() =>
                    setEditingSpace(summary.live.find((item) => item.id === space.id) ?? null)
                  }
                >
                  Bearbeiten
                </Button>
                <WorkshopRetireAction
                  label="Entfernen"
                  title="Raum entfernen?"
                  description={`${space.name} wird aus dem Workshopplan entfernt.`}
                  onConfirm={() =>
                    stage([
                      draft(state.principal_email ?? '', 'WorkshopSpaceRetired', {
                        workshop_space_id: space.id,
                        reason: 'Organisatorisch entfernt',
                      }),
                    ])
                  }
                />
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}
