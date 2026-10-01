import { useState, type FormEvent } from 'react'
import { useLocation } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import type { KernelWorld } from '../../../events/fold.js'
import type { EventDraft } from '../../../events/types.js'
import { officialWorkshopsWorld } from '../../../modules/official-workshops/index.js'
import { workshopRankingsWorld } from '../../../modules/workshop-rankings/index.js'
import {
  workshopSchedulingWorld,
  type WorkshopSlot,
} from '../../../modules/workshop-scheduling/index.js'
import { workshopSpaceWorld, type WorkshopSpace } from '../../../modules/workshop-space/index.js'
import { buildSolverInput, composeSolverContributions, solve } from '../../../solver/index.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { Button } from '../../components/shared/ui/button.js'
import { DestructiveActionDialog } from '../../components/shared/ui/destructive-action-dialog.js'
import { SegmentedControl } from '../../components/shared/ui/segmented-control.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import {
  SpaceEditorForm,
  SlotEditorForm,
  ExternalLeaderEditorFields,
  WorkshopEditorDialog,
  WorkshopLeaderPicker,
} from '../components/workshop/editors.js'
import {
  WorkshopEmptyState,
  WorkshopPhaseNotice,
  WorkshopList,
  WorkshopScreenHeader,
  WorkshopSectionHeader,
  WorkshopStatsStrip,
} from '../../components/shared/workshop/shared.js'
import {
  ExternalLeaderRow,
  WorkshopSummaryRow,
} from '../../../modules/official-workshops/app/components/authoring.js'
import {
  ProgrammeGrid,
  UnplacedWorkshopRow,
  WorkshopOverlapTable,
} from '../../../modules/workshop-scheduling/app/components/programme.js'
import {
  SlotDayGroup,
  SpaceRow,
  SpaceSlotToggle,
  type WorkshopSlotView,
  type WorkshopSpaceView,
} from '../components/workshop/resources.js'
import { SecondaryNavigation } from '../components/navigation.js'
import { CollectionCreateAction } from '../components/collection-create-action.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useOrganiser } from '../context.js'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/shared/ui/dialog.js'

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

function slotLabel(startsAt: string, endsAt?: string): string {
  const starts = new globalThis.Date(startsAt)
  const ends = endsAt ? new globalThis.Date(endsAt) : undefined
  const day = starts.toLocaleDateString('de-DE', { weekday: 'short' })
  const time = starts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const endTime = ends?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}${endTime ? `–${endTime}` : ''}`
}

function WorkshopNavigation() {
  return (
    <SecondaryNavigation
      aria_label="Workshopbereiche"
      items={[
        {
          href: organiserPaths.workshops(),
          active_paths: [
            organiserPaths.workshops(),
            organiserPaths.workshop_leaders(),
            organiserPaths.workshop_external_leaders(),
            organiserPaths.workshop_programme(),
            organiserPaths.workshop_programme_unplaced(),
            organiserPaths.workshop_programme_overlaps(),
          ],
          label: 'Workshops',
        },
        {
          href: organiserPaths.workshop_spaces(),
          active_paths: [organiserPaths.workshop_spaces(), organiserPaths.workshop_slots()],
          label: 'Räume und Slots',
        },
      ]}
    />
  )
}

type ProgrammeReviewView = 'programme' | 'unplaced' | 'overlaps'

function programmeReviewView(pathname: string): ProgrammeReviewView {
  if (pathname.endsWith('/programme/unplaced')) return 'unplaced'
  if (pathname.endsWith('/programme/overlaps')) return 'overlaps'
  return 'programme'
}

function scheduleReasonLabel(reason: string): string {
  switch (reason) {
    case 'hard.space-occupied':
      return 'Alle passenden Raum-Slots sind bereits belegt.'
    case 'hard.space-capacity':
      return 'Kein passender Raum bietet genügend Plätze.'
    case 'hard.space-unavailable':
      return 'Kein passender Raum ist in einem Slot verfügbar.'
    case 'hard.space-slot-blocked':
      return 'Passende Raum-Slots sind gesperrt.'
    case 'hard.missing-capability':
      return 'Kein Raum erfüllt die benötigten Eigenschaften.'
    case 'hard.leader-conflict':
      return 'Eine Leitung ist in den passenden Slots bereits eingeplant.'
    case 'hard.no-slot-or-space':
      return 'Es gibt keinen passenden Slot oder Raum.'
    default:
      return reason
  }
}

export function WorkshopExternalLeaders() {
  useDocumentTitle('Externe Leitungen · Workshops · Familienfreizeit')
  const { world, state, stage } = useOrganiser()
  const summary = officialWorkshopsWorld(world!)
  const schedule = workshopSchedulingWorld(world!)
  const [editor, setEditor] = useState<'new' | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const editingLeader =
    editor && editor !== 'new'
      ? summary.external_leaders.find((leader) => leader.id === editor)
      : undefined
  const slotOptions = schedule.slots.map((slot) => ({
    value: slotLabel(slot.starts_at, slot.ends_at),
    label: `${slotLabel(slot.starts_at, slot.ends_at)} Uhr`,
  }))
  const workshopNames = new Map(summary.workshops.map((workshop) => [workshop.id, workshop.title]))
  const saveLeader = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const availability = data.getAll('availability').map(String)
    if (!name) {
      setError('Gib einen Namen an.')
      return
    }
    if (!availability.length) {
      setError('Wähle mindestens einen verfügbaren Slot.')
      return
    }
    stage([
      draft(
        state.principal_email ?? '',
        editingLeader ? 'ExternalLeaderUpdated' : 'ExternalLeaderAdded',
        {
          external_leader_id: editingLeader?.id ?? id('ext_'),
          name,
          phone: String(data.get('phone') ?? '').trim() || null,
          availability,
          sort_key: editingLeader?.sort_key ?? summary.external_leaders.length + 1,
        },
      ),
    ])
    setEditor(null)
    setError(null)
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Workshops"
        title="Externe Leitungen"
        description="Personen außerhalb der Veranstaltung verwalten, die Workshops leiten."
        action={
          <Button
            onClick={() => {
              setEditor('new')
              setError(null)
            }}
          >
            Externe Leitung hinzufügen
          </Button>
        }
      />
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditor(null)
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLeader
                ? `Externe Leitung: ${editingLeader.name}`
                : 'Externe Leitung hinzufügen'}
            </DialogTitle>
            <DialogDescription>
              Externe Leitungen leiten Workshops, nehmen aber nicht an der Freizeit teil.
            </DialogDescription>
            {error ? (
              <p role="alert" className="rounded-base border-2 border-black bg-danger p-3">
                {error}
              </p>
            ) : null}
          </DialogHeader>
          <form
            id="external-leader-form"
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={saveLeader}
          >
            <ExternalLeaderEditorFields
              key={editor ?? 'new'}
              slots={slotOptions}
              default_values={
                editingLeader
                  ? {
                      name: editingLeader.name,
                      phone: editingLeader.phone ?? undefined,
                      availability: editingLeader.availability,
                    }
                  : undefined
              }
            />
          </form>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="neutral">
                  Abbrechen
                </Button>
              }
            />
            <Button type="submit" form="external-leader-form">
              Übernehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section aria-label="Externe Leitungen" className="space-y-3">
        <WorkshopSectionHeader
          title={`${summary.external_leaders.length} externe Leitungen`}
          description="Sie leiten nur und nehmen sonst nicht teil."
        />
        {summary.external_leaders.length ? (
          <WorkshopList>
            {summary.external_leaders.map((leader) => (
              <ExternalLeaderRow
                key={leader.id}
                leader={{
                  id: leader.id,
                  name: leader.name,
                  phone: leader.phone ?? undefined,
                  availability: leader.availability,
                  leads: summary.workshops
                    .filter((workshop) => workshop.leader_ids.includes(leader.id))
                    .map((workshop) => workshopNames.get(workshop.id) ?? workshop.id),
                }}
                total_slots={schedule.slots.length}
                action={
                  <Button
                    size="sm"
                    variant="neutral"
                    onClick={() => {
                      setEditor(leader.id)
                      setError(null)
                    }}
                  >
                    Bearbeiten
                    <span className="sr-only">: {leader.name}</span>
                  </Button>
                }
              />
            ))}
          </WorkshopList>
        ) : (
          <WorkshopEmptyState title="Noch keine externen Leitungen">
            Lege eine externe Leitung an, bevor du sie einem Workshop zuweist.
          </WorkshopEmptyState>
        )}
      </section>
    </div>
  )
}

export function WorkshopLeaders() {
  useDocumentTitle('Leitungen · Workshops · Familienfreizeit')
  const { world } = useOrganiser()
  const summary = officialWorkshopsWorld(world!)
  const workshopById = new Map(summary.workshops.map((workshop) => [workshop.id, workshop.title]))
  const leaders = world!.persons
    .map((person) => {
      const labels = world!.labels_by_entity[person.id] ?? []
      const name = [
        labels.find((label) => label.key === 'given-name')?.value,
        labels.find((label) => label.key === 'family-name')?.value,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
      const leads = summary.workshops
        .filter((workshop) => workshop.leader_ids.includes(person.id))
        .map((workshop) => workshopById.get(workshop.id) ?? workshop.id)
      return { id: person.id, name: name || person.id, leads }
    })
    .filter((leader) => leader.leads.length)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Workshops"
        title="Leitungen"
        description="Personen aus der Veranstaltung, die Workshops leiten."
      />
      <WorkshopSectionHeader title={`${leaders.length} Leitungen`} />
      {leaders.length ? (
        <div className="overflow-x-auto rounded-base border-2 border-black bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Leitungen aus der Veranstaltung</caption>
            <thead>
              <tr className="border-b-2 border-black">
                <th scope="col" className="p-3">
                  Person
                </th>
                <th scope="col" className="p-3">
                  Leitet
                </th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader) => (
                <tr key={leader.id} className="border-b border-black/30 last:border-b-0">
                  <th scope="row" className="p-3">
                    {leader.name}
                  </th>
                  <td className="p-3">{leader.leads.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <WorkshopEmptyState title="Noch keine internen Leitungen">
          Weise eine Person aus der Veranstaltung einem Workshop zu.
        </WorkshopEmptyState>
      )}
    </div>
  )
}

function WorkshopResourceNavigation({ value }: { value: 'spaces' | 'slots' }) {
  const [, setLocation] = useLocation()
  return (
    <TertiaryNavigation
      aria_label="Räume und Slots"
      value={value}
      onChange={(next) =>
        setLocation(
          next === 'spaces' ? organiserPaths.workshop_spaces() : organiserPaths.workshop_slots(),
        )
      }
      items={[
        { value: 'spaces', label: 'Räume' },
        { value: 'slots', label: 'Slots' },
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
  const [editor, setEditor] = useState<'new' | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'children' | 'adults'>('all')
  const [view, setView] = useState<'workshops' | 'leaders' | 'external'>('workshops')
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
  const editingWorkshop =
    editor && editor !== 'new'
      ? summary.workshops.find((workshop) => workshop.id === editor)
      : undefined
  const activeWorkshops = summary.workshops.filter(
    (workshop) => audienceFilter === 'all' || workshop.audience === audienceFilter,
  )
  const internalLeaders = people
    .map((person) => ({
      ...person,
      workshops: summary.workshops.filter((workshop) => workshop.leader_ids.includes(person.id)),
    }))
    .filter((person) => person.workshops.length > 0)
  const externalLeaders = summary.external_leaders.map((leader) => ({
    ...leader,
    workshops: summary.workshops.filter((workshop) => workshop.leader_ids.includes(leader.id)),
  }))
  const saveWorkshop = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const ageMin = Number(data.get('age_min') ?? 0)
    const ageMax = Number(data.get('age_max') ?? 120)
    const capacity = Number(data.get('capacity') ?? 0)
    if (!title) {
      setError('Gib dem Workshop einen Titel.')
      return
    }
    if (
      !Number.isInteger(ageMin) ||
      !Number.isInteger(ageMax) ||
      ageMin < 0 ||
      ageMax > 120 ||
      ageMin > ageMax
    ) {
      setError('Der Altersbereich muss zwischen 0 und 120 Jahren liegen und aufsteigend sein.')
      return
    }
    if (!Number.isInteger(capacity) || capacity < 0) {
      setError('Die Platzanzahl muss eine ganze Zahl ab 0 sein.')
      return
    }
    stage([
      draft(state.principal_email ?? '', editingWorkshop ? 'WorkshopUpdated' : 'WorkshopAdded', {
        workshop_id: editingWorkshop?.id ?? id('wks_'),
        title,
        description: String(data.get('description') ?? ''),
        audience: String(data.get('audience') ?? 'all'),
        age_min: ageMin,
        age_max: ageMax,
        capacity,
        participation_mode: String(data.get('participation_mode') ?? 'assigned'),
        leader_ids: data.getAll('leader_ids').map(String),
        needs: String(data.get('needs') ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        sort_key:
          editingWorkshop?.sort_key ?? summary.workshops.length + summary.cancelled.length + 1,
      }),
    ])
    setEditor(null)
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
          <Button
            onClick={() => {
              setEditor('new')
              setError(null)
            }}
          >
            Workshop hinzufügen
          </Button>
        }
      />
      <WorkflowStepper
        aria_label="Ablauf der Workshopwahl"
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
      <WorkshopEditorDialog
        open={editor !== null}
        on_open_change={(open) => {
          if (!open) {
            setEditor(null)
            setError(null)
          }
        }}
        on_submit={saveWorkshop}
        submit_label={editingWorkshop ? 'Speichern' : 'Entwurf anlegen'}
        error={error}
        default_values={
          editingWorkshop
            ? {
                title: editingWorkshop.title,
                description: editingWorkshop.description,
                audience: editingWorkshop.audience,
                capacity: editingWorkshop.capacity,
                participation_mode: editingWorkshop.mode,
                age_min: editingWorkshop.age_min,
                age_max: editingWorkshop.age_max,
                needs: editingWorkshop.needs.join(', '),
              }
            : undefined
        }
      >
        <WorkshopLeaderPicker
          key={editor ?? 'new'}
          leaders={[
            ...people.map((person) => ({ id: person.id, label: person.name })),
            ...summary.external_leaders.map((leader) => ({
              id: leader.id,
              label: leader.name,
              external: true,
            })),
          ]}
          selected_ids={editingWorkshop?.leader_ids}
        />
      </WorkshopEditorDialog>
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
      <TertiaryNavigation
        aria_label="Workshopansichten"
        value={view}
        onChange={(next) => setView(next as 'workshops' | 'leaders' | 'external')}
        items={[
          { value: 'workshops', label: 'Workshops' },
          { value: 'leaders', label: 'Leitungen' },
          { value: 'external', label: 'Externe Leitungen' },
        ]}
        controls={
          <SegmentedControl
            label="Gruppe"
            value={audienceFilter}
            onChange={setAudienceFilter}
            options={[
              { value: 'all', label: 'Alle' },
              { value: 'children', label: 'Kinder' },
              { value: 'adults', label: 'Erwachsene' },
            ]}
          />
        }
      />
      {view === 'workshops' ? (
        <section aria-label="Aktive Workshops" className="space-y-3">
          <WorkshopSectionHeader title="Aktive Workshops" />
          {activeWorkshops.length ? (
            <div className="divide-y-2 divide-black overflow-hidden rounded-base border-2 border-black bg-white">
              {activeWorkshops.map((workshop) => (
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
                  action={
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() => {
                        setEditor(workshop.id)
                        setError(null)
                      }}
                    >
                      Bearbeiten
                      <span className="sr-only">: {workshop.title}</span>
                    </Button>
                  }
                />
              ))}
            </div>
          ) : (
            <WorkshopEmptyState title="Keine aktiven Workshops">
              Noch keine Workshops. Lege den ersten Entwurf an.
            </WorkshopEmptyState>
          )}
        </section>
      ) : null}
      {view === 'leaders' ? (
        <section aria-label="Interne Leitungen" className="space-y-3">
          <WorkshopSectionHeader
            title="Leitungen"
            description="Personen mit mindestens einem Workshop."
          />
          {internalLeaders.length ? (
            <ul className="divide-y-2 divide-black overflow-hidden rounded-base border-2 border-black bg-white">
              {internalLeaders.map((leader) => (
                <li key={leader.id} className="p-4">
                  <strong>{leader.name}</strong>
                  <p className="mt-1 text-sm text-muted">
                    Leitet: {leader.workshops.map((workshop) => workshop.title).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <WorkshopEmptyState title="Keine internen Leitungen">
              Weise einer Person in einem Workshop eine Leitung zu.
            </WorkshopEmptyState>
          )}
        </section>
      ) : null}
      {view === 'external' ? (
        <section aria-label="Externe Leitungen" className="space-y-3">
          <WorkshopSectionHeader title="Externe Leitungen" />
          {externalLeaders.length ? (
            <ul className="grid gap-3">
              {externalLeaders.map((leader) => (
                <li key={leader.id} className="rounded-base border-2 border-black bg-white p-4">
                  <strong>{leader.name}</strong>
                  {leader.phone ? (
                    <span className="ml-2 text-sm text-muted">· {leader.phone}</span>
                  ) : null}
                  <p className="mt-1 text-sm text-muted">
                    Leitet:{' '}
                    {leader.workshops.length
                      ? leader.workshops.map((workshop) => workshop.title).join(', ')
                      : 'noch keinen Workshop'}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Verfügbar: {leader.availability.length ? leader.availability.join(', ') : '—'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <WorkshopEmptyState title="Keine externen Leitungen">
              Externe Leitungen werden bei der Workshopplanung ergänzt.
            </WorkshopEmptyState>
          )}
        </section>
      ) : null}
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
  const [location, navigate] = useLocation()
  const schedule = workshopSchedulingWorld(world!)
  const spaces = workshopSpaceWorld(world!).live
  const official = officialWorkshopsWorld(world!)
  const rankings = workshopRankingsWorld(world!)
  const plan = solveWorkshopPlan(world!)
  const view = programmeReviewView(location)
  const unscheduled = new Map(plan.unscheduled.map((item) => [item.workshop_id, item.reason]))
  const unassignedWorkshops = official.workshops
    .filter(
      (workshop) => !plan.placements.some((placement) => placement.workshop_id === workshop.id),
    )
    .map((workshop) => ({
      id: workshop.id,
      title: workshop.title,
      reason: scheduleReasonLabel(unscheduled.get(workshop.id) ?? 'hard.no-slot-or-space'),
      demand_label:
        workshop.mode === 'assigned'
          ? `${plan.demand[workshop.id] ?? 0} Wünsche · Kapazität ${workshop.capacity}`
          : workshop.mode === 'sign-up'
            ? `${plan.signups.filter((item) => item.workshop_id === workshop.id).length} Anmeldungen`
            : `${plan.interests.filter((item) => item.workshop_id === workshop.id).length} Interessen`,
    }))
  const rooms = spaces.map((space) => ({ id: space.id, label: space.name }))
  const attendanceByWorkshop = new Map<string, number>()
  for (const item of [...plan.assignments, ...plan.signups])
    attendanceByWorkshop.set(
      item.workshop_id,
      (attendanceByWorkshop.get(item.workshop_id) ?? 0) + 1,
    )
  const interestsByWorkshop = new Map<string, number>()
  for (const item of plan.interests)
    interestsByWorkshop.set(item.workshop_id, (interestsByWorkshop.get(item.workshop_id) ?? 0) + 1)
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
            capacity_label:
              workshop.mode === 'interest'
                ? `${interestsByWorkshop.get(workshop.id) ?? 0} Interessen`
                : (() => {
                    const attendance = attendanceByWorkshop.get(workshop.id) ?? 0
                    const remaining = workshop.capacity - attendance
                    return `${attendance} / ${workshop.capacity} · ${
                      remaining > 0
                        ? `${remaining} frei`
                        : remaining === 0
                          ? 'voll'
                          : 'über Kapazität'
                    }`
                  })(),
            demand_label: plan.demand[workshop.id]
              ? `${plan.demand[workshop.id]} Wünsche`
              : undefined,
          }
        : { id: `${slot.id}-${room.id}`, state: 'empty' as const }
    }),
  }))
  const personNames = new Map(
    world!.persons.map((person) => {
      const labels = world!.labels_by_entity[person.id] ?? []
      const name = [
        labels.find((label) => label.key === 'given-name')?.value,
        labels.find((label) => label.key === 'family-name')?.value,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
      return [person.id, name || person.id] as const
    }),
  )
  const placementByWorkshop = new Map(
    plan.placements.map((placement) => [placement.workshop_id, placement]),
  )
  const workshopsById = new Map(official.workshops.map((workshop) => [workshop.id, workshop]))
  const overlapPeople = new Map<string, Set<string>>()
  for (const ranking of rankings.rankings) {
    const choices = ranking.choices
      .filter(
        (choice): choice is { workshop_id: string; rank: number } =>
          choice.workshop_id !== null && choice.rank !== null && choice.rank <= 3,
      )
      .filter((choice) => placementByWorkshop.has(choice.workshop_id))
    for (let first = 0; first < choices.length; first += 1) {
      for (let second = first + 1; second < choices.length; second += 1) {
        const firstWorkshop = choices[first]?.workshop_id
        const secondWorkshop = choices[second]?.workshop_id
        if (!firstWorkshop || !secondWorkshop) continue
        const firstPlacement = placementByWorkshop.get(firstWorkshop)
        const secondPlacement = placementByWorkshop.get(secondWorkshop)
        if (!firstPlacement || firstPlacement.slot_id !== secondPlacement?.slot_id) continue
        const key = [firstWorkshop, secondWorkshop].sort().join(':')
        const people = overlapPeople.get(key) ?? new Set<string>()
        people.add(ranking.person_id)
        overlapPeople.set(key, people)
      }
    }
  }
  const overlaps = [...overlapPeople.entries()]
    .map(([key, people]) => {
      const [firstWorkshopId, secondWorkshopId] = key.split(':')
      const firstWorkshop = firstWorkshopId ? workshopsById.get(firstWorkshopId) : undefined
      const secondWorkshop = secondWorkshopId ? workshopsById.get(secondWorkshopId) : undefined
      const slot = firstWorkshopId ? placementByWorkshop.get(firstWorkshopId) : undefined
      return {
        id: key,
        workshops: `${firstWorkshop?.title ?? firstWorkshopId} + ${secondWorkshop?.title ?? secondWorkshopId}`,
        slot: slot
          ? slotLabel(
              schedule.slots.find((candidate) => candidate.id === slot.slot_id)?.starts_at ?? '',
            )
          : '—',
        people_count: people.size,
        people: [...people]
          .map((personId) => personNames.get(personId) ?? personId)
          .sort((a, b) => a.localeCompare(b, 'de')),
      }
    })
    .sort(
      (first, second) =>
        second.people_count - first.people_count ||
        first.workshops.localeCompare(second.workshops, 'de'),
    )
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Programm"
        title="Programm"
        description="Welcher Workshop wann in welchem Raum stattfindet."
      />
      <TertiaryNavigation
        aria_label="Programmansicht"
        value={view}
        onChange={(next) => {
          if (next === 'unplaced') navigate(organiserPaths.workshop_programme_unplaced())
          else if (next === 'overlaps') navigate(organiserPaths.workshop_programme_overlaps())
          else navigate(organiserPaths.workshop_programme())
        }}
        items={[
          { value: 'programme', label: 'Ganzes Programm' },
          { value: 'unplaced', label: 'Nicht eingeplant' },
          { value: 'overlaps', label: 'Überschneidungen' },
        ]}
      />
      {view === 'programme' ? (
        schedule.slots.length && rooms.length ? (
          <ProgrammeGrid rooms={rooms} rows={rows} />
        ) : (
          <WorkshopEmptyState title="Noch kein Programm">
            Ohne Slots und Räume kann nichts eingeplant werden.
          </WorkshopEmptyState>
        )
      ) : null}
      {view === 'unplaced' ? (
        unassignedWorkshops.length ? (
          <ul className="overflow-hidden rounded-base border-2 border-black">
            {unassignedWorkshops.map((workshop) => (
              <UnplacedWorkshopRow key={workshop.id} workshop={workshop} />
            ))}
          </ul>
        ) : (
          <WorkshopEmptyState success>Alle Workshops sind eingeplant.</WorkshopEmptyState>
        )
      ) : null}
      {view === 'overlaps' ? (
        <section className="space-y-4" aria-labelledby="programme-overlaps-heading">
          <div>
            <h2 id="programme-overlaps-heading" className="text-2xl font-heading">
              Überschneidungen
            </h2>
            <p className="mt-1 max-w-3xl text-muted">
              Zwei Workshops aus derselben Top 3 im selben Slot: Die Person kann nur einen davon
              bekommen.
            </p>
          </div>
          {overlaps.length ? (
            <WorkshopOverlapTable overlaps={overlaps} />
          ) : (
            <WorkshopEmptyState success>Keine Überschneidungen.</WorkshopEmptyState>
          )}
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
  const [addingSlot, setAddingSlot] = useState(false)
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
    setAddingSlot(false)
    setEditingSlot(null)
    setSlotError(null)
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        title="Slots"
        description="Event-backed Zeitfenster für das Programm."
        action={
          <CollectionCreateAction
            label="Slot hinzufügen"
            title={editingSlot ? 'Slot bearbeiten' : 'Slot hinzufügen'}
            description="Lege ein Zeitfenster für das Workshopprogramm an."
            open={addingSlot || editingSlot !== null}
            on_open_change={(open) => {
              setAddingSlot(open)
              if (!open) setEditingSlot(null)
            }}
            error={slotError}
          >
            <SlotEditorForm
              key={editingSlot?.id ?? 'new-slot'}
              on_submit={add}
              submit_label={editingSlot ? 'Slot speichern' : 'Slot anlegen'}
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
          </CollectionCreateAction>
        }
      />
      <WorkshopResourceNavigation value="slots" />
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
  const [addingSpace, setAddingSpace] = useState(false)
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
    setAddingSpace(false)
    setEditingSpace(null)
  }
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        title="Räume und Slots"
        description="Physische Workshopräume, Kapazitäten und schedule-aware Verfügbarkeit."
        action={
          <CollectionCreateAction
            label="Raum hinzufügen"
            title={editingSpace ? 'Workshopraum bearbeiten' : 'Workshopraum hinzufügen'}
            description="Lege Ort, Kapazität und verfügbare Zeiten fest."
            open={addingSpace || editingSpace !== null}
            on_open_change={(open) => {
              setAddingSpace(open)
              if (!open) setEditingSpace(null)
            }}
          >
            <SpaceEditorForm
              key={editingSpace?.id ?? 'new-space'}
              on_submit={add}
              submit_label={editingSpace ? 'Raum speichern' : 'Raum anlegen'}
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
          </CollectionCreateAction>
        }
      />
      <WorkshopResourceNavigation value="spaces" />
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
