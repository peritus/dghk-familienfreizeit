import { useState, type FormEvent } from 'react'
import { randomIdPart } from '../ids.js'
import { useLocation } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import type { World } from '../../../events/fold.js'
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
import { PhaseDecisionAction } from '../components/phase-decision.js'
import { AreaClosingActions } from '../components/area-closing.js'
import { workshopTrack } from '../../../modules/workshop-assignment/app/workshop-track.js'
import type { PhaseView } from '../../../derive/phases.js'
import {
  SpaceEditorForm,
  SlotEditorForm,
  ExternalLeaderEditorFields,
  WorkshopEditorDialog,
  WorkshopLeaderPicker,
} from '../components/workshop/editors.js'
import {
  WorkshopEmptyState,
  FixedDecisionReview,
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
import { buildProgrammeView } from '../../../modules/workshop-scheduling/app/programme-view.js'
import {
  SlotDayGroup,
  SpaceRow,
  SpaceSlotToggle,
  type WorkshopSlotView,
  type WorkshopSpaceView,
} from '../components/workshop/resources.js'
import { SecondaryNavigation } from '../components/navigation.js'
import { CollectionCreateAction } from '../components/collection-create-action.js'
import { organiserPathWithQuery, organiserPaths } from '../../../organiser/routes.js'
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
  return `${prefix}${randomIdPart()}`
}

function draft(actor: string, type: string, payload: EventDraft['payload']): EventDraft {
  return { at: new Date().toISOString(), actor, subject: null, type, payload }
}

type Placement = { workshop_id: string; slot_id: string; space_id: string }

type SchedulingUnscheduled = { workshop_id: string; reason: string }

type WorkshopPlan = {
  placements: readonly Placement[]
  unscheduled: readonly SchedulingUnscheduled[]
  fixed_placements: readonly {
    workshop_id: string
    slot_id: string
    space_id: string
    note: string | null
  }[]
  automatic_placements: readonly Placement[]
  fixed_placement_violations: readonly {
    workshop_id: string
    slot_id: string
    space_id: string
    note: string | null
    reasons: readonly string[]
  }[]
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

function solveWorkshopPlan(world: World): WorkshopPlan {
  const contributions = composeSolverContributions(activeProfile)
  const plan = solve(buildSolverInput(world, contributions), contributions, {
    build_revision: 'organiser',
    compatibility_revision: 1,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
  const scheduling = plan.sections['workshop-scheduling'] as
    | {
        placements?: readonly Placement[]
        unscheduled?: readonly SchedulingUnscheduled[]
        fixed?: WorkshopPlan['fixed_placements']
        automatic_placements?: readonly Placement[]
        fixed_violations?: WorkshopPlan['fixed_placement_violations']
      }
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
    fixed_placements: scheduling?.fixed ?? [],
    automatic_placements: scheduling?.automatic_placements ?? scheduling?.placements ?? [],
    fixed_placement_violations: scheduling?.fixed_violations ?? [],
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

function slotDurationMinutes(startsAt: string, endsAt: string): number {
  return Math.round(
    (new globalThis.Date(endsAt).getTime() - new globalThis.Date(startsAt).getTime()) / 60_000,
  )
}

export function WorkshopNavigation() {
  const [location, setLocation] = useLocation()
  const programmePaths = [
    organiserPaths.workshop_programme(),
    organiserPaths.workshop_programme_unplaced(),
    organiserPaths.workshop_programme_overlaps(),
  ] as const
  const inParticipationSection =
    location === organiserPaths.workshop_participation() ||
    programmePaths.some((path) => location === path)

  return (
    <div className="grid gap-2">
      <SecondaryNavigation
        aria_label="Workshopbereiche"
        items={[
          {
            href: organiserPaths.workshops(),
            active_paths: [
              organiserPaths.workshops(),
              organiserPaths.workshop_leaders(),
              organiserPaths.workshop_external_leaders(),
            ],
            label: 'Workshops',
          },
          {
            href: organiserPaths.workshop_participation(),
            active_paths: [organiserPaths.workshop_participation(), ...programmePaths],
            label: 'Teilnahme',
          },
          {
            href: organiserPaths.workshop_allocation(),
            active_paths: [
              organiserPaths.workshop_allocation(),
              organiserPaths.workshop_allocation_demand(),
              organiserPaths.workshop_allocation_trace(),
            ],
            label: 'Wünsche',
          },
          {
            href: organiserPaths.workshop_spaces(),
            active_paths: [organiserPaths.workshop_spaces(), organiserPaths.workshop_slots()],
            label: 'Räume und Slots',
          },
          {
            href: organiserPaths.workshop_lists(),
            active_paths: [
              organiserPaths.workshop_lists(),
              organiserPaths.workshop_workshop_list(),
              organiserPaths.workshop_person_list(),
              organiserPaths.workshop_family_list(),
              organiserPaths.workshop_room_list(),
            ],
            label: 'Listen',
          },
        ]}
      />
      {inParticipationSection ? (
        <TertiaryNavigation
          aria_label="Teilnahmeansichten"
          value={programmePaths.some((path) => location === path) ? 'programme' : 'persons'}
          onChange={(next) =>
            setLocation(
              next === 'programme'
                ? organiserPaths.workshop_programme()
                : organiserPaths.workshop_participation(),
            )
          }
          items={[
            { value: 'persons', label: 'Personen' },
            { value: 'programme', label: 'Programm' },
          ]}
        />
      ) : null}
    </div>
  )
}

type ProgrammeReviewView = 'programme' | 'unplaced' | 'overlaps'

function programmeReviewView(pathname: string): ProgrammeReviewView {
  if (pathname.endsWith('/programme/unplaced')) return 'unplaced'
  if (pathname.endsWith('/programme/overlaps')) return 'overlaps'
  return 'programme'
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
              <p
                role="alert"
                className="rounded-base border-2 border-border bg-danger text-danger-foreground p-3"
              >
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
        <div className="overflow-x-auto rounded-base border-2 border-border bg-secondary-background">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Leitungen aus der Veranstaltung</caption>
            <thead>
              <tr className="border-b-2 border-border">
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
                <tr key={leader.id} className="border-b border-border/30 last:border-b-0">
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
  const { world, state, stage, phases } = useOrganiser()
  const summary = officialWorkshopsWorld(world!)
  const choice = phases?.find(({ phase }) => phase === 'workshop-rankings.choice')
  const choiceOpened = choice !== undefined && choice.status !== 'upcoming'
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
        description="Workshops anlegen und bearbeiten, Leitungen und Zielgruppen im Blick behalten."
      />
      <WorkflowStepper
        aria_label="Ablauf der Workshopwahl"
        steps={workshopTrack({
          phases: phases ?? [],
          active_workshop_count: officialWorkshopsWorld(world!).workshops.length,
          meta: activeProfile.meta,
        })}
        next_action={
          choiceOpened ? (
            <AreaClosingActions area="workshops" />
          ) : summary.workshops.length > 0 && state.principal_email ? (
            <PhaseDecisionAction
              label="Wahl öffnen"
              title="Workshopwahl öffnen?"
              description="Familien sehen danach den Workshopkatalog und können Wünsche, Anmeldungen und Interesse angeben. Das Öffnen wird nicht zurückgenommen; danach steuert das Festlegen die Eingaben."
              confirm_label="Wahl öffnen"
              on_confirm={() => stage([draft(state.principal_email!, 'WorkshopChoiceOpened', {})])}
            />
          ) : null
        }
      />
      <WorkshopPhaseNotice
        label={
          choiceOpened
            ? 'Wahl offen'
            : summary.workshops.length
              ? 'Vorbereitung'
              : 'Noch kein Workshopplan'
        }
        tone={summary.workshops.length ? 'success' : 'attention'}
        details={
          choiceOpened
            ? 'Familien sehen den Katalog und können Wünsche, Anmeldungen und Interesse angeben.'
            : summary.workshops.length
              ? 'Familien sehen noch keine Workshops, bis die Wahl geöffnet ist.'
              : 'Lege den ersten Workshop an, um die nächste Phase vorzubereiten.'
        }
      >
        {choiceOpened
          ? 'Die Workshopwahl ist geöffnet.'
          : summary.workshops.length
            ? 'Workshopdaten sind vorhanden. Prüfe Zielgruppen und Leitungen, bevor du die Wahl öffnest.'
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
          <WorkshopSectionHeader
            title="Aktive Workshops"
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
          {activeWorkshops.length ? (
            <div className="divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background">
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
            <ul className="divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background">
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
                <li
                  key={leader.id}
                  className="rounded-base border-2 border-border bg-secondary-background p-4"
                >
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
              Noch keine Person außerhalb der Veranstaltung leitet einen Workshop.
            </WorkshopEmptyState>
          )}
        </section>
      ) : null}
    </div>
  )
}

/** The workshop review phase's readiness, with its first findings (phases.md §3, §8). */
function ReviewReadinessNotice({ phases }: { phases: readonly PhaseView[] }) {
  const review = phases.find(({ phase }) => phase === 'workshop-assignment.review')
  const closed = phases.some(
    ({ phase, status }) => phase === 'workshop-rankings.choice' && status === 'closed',
  )
  const findings = review && !review.readiness.ready ? review.readiness.findings : []
  if (closed)
    return (
      <WorkshopPhaseNotice label="Festgelegt" tone="success">
        Das Ergebnis ist festgelegt. Änderungen erscheinen als Abweichung vom festgelegten Ergebnis.
      </WorkshopPhaseNotice>
    )
  return (
    <WorkshopPhaseNotice
      label={findings.length ? 'Prüfung erforderlich' : 'Zuordnung prüfen'}
      tone={findings.length ? 'attention' : 'success'}
      details={
        findings.length ? (
          <ul className="list-disc pl-5">
            {findings.slice(0, 3).map((finding) => (
              <li key={`${finding.id}-${finding.subject_id ?? ''}`}>{finding.message}</li>
            ))}
            {findings.length > 3 ? <li>… und {findings.length - 3} weitere</li> : null}
          </ul>
        ) : (
          'Alle Workshops haben einen Platz. Prüfe Bedarf, Plätze und Überschneidungen.'
        )
      }
    >
      {findings.length
        ? `${findings.length} ${findings.length === 1 ? 'Hinweis verhindert' : 'Hinweise verhindern'} das Festlegen.`
        : 'Das Programm ist berechnet und kann auf Konflikte geprüft werden.'}
    </WorkshopPhaseNotice>
  )
}

export function WorkshopProgramme() {
  useDocumentTitle('Programm · Workshops · Familienfreizeit')
  const { world, phases } = useOrganiser()
  const [location, navigate] = useLocation()
  const schedule = workshopSchedulingWorld(world!)
  const spaces = workshopSpaceWorld(world!).live
  const official = officialWorkshopsWorld(world!)
  const rankings = workshopRankingsWorld(world!)
  const plan = solveWorkshopPlan(world!)
  const view = programmeReviewView(location)
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
  const leaderNames = new Map([
    ...personNames,
    ...official.external_leaders.map((leader) => [leader.id, `${leader.name} (extern)`] as const),
  ])
  const rankingModule = activeProfile.modules.find((module) => module.id === 'workshop-rankings')
  const overlapRank =
    typeof rankingModule?.parameters?.max_rank === 'number' ? rankingModule.parameters.max_rank : 3
  const programme = buildProgrammeView({
    workshops: official.workshops,
    slots: schedule.slots,
    spaces,
    blocks: schedule.space_slot_blocks,
    placements: plan.placements,
    fixed_placements: plan.fixed_placements,
    automatic_placements: plan.automatic_placements,
    fixed_placement_violations: plan.fixed_placement_violations,
    unscheduled: plan.unscheduled,
    demand: plan.demand,
    assignments: plan.assignments,
    signups: plan.signups,
    interests: plan.interests,
    rankings: rankings.rankings,
    person_names: personNames,
    leader_names: leaderNames,
    overlap_rank: overlapRank,
    time_zone: activeProfile.meta.timezone,
  })
  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Programm"
        title="Programm"
        description="Welcher Workshop wann in welchem Raum stattfindet."
      />
      <WorkflowStepper
        aria_label="Ablauf der Workshopwahl"
        steps={workshopTrack({
          phases: phases ?? [],
          active_workshop_count: officialWorkshopsWorld(world!).workshops.length,
          meta: activeProfile.meta,
        })}
      />
      <ReviewReadinessNotice phases={phases ?? []} />
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
      <FixedDecisionReview
        items={programme.fixed_reviews}
        title="Feste Platzierungen prüfen"
        description="Festgelegte Platzierungen werden mit dem automatischen Programmvergleich erklärt."
      />
      {view === 'programme' ? (
        programme.rows.length && programme.rooms.length ? (
          <ProgrammeGrid
            rooms={programme.rooms}
            rows={programme.rows.map((row) => ({
              ...row,
              // A placed workshop's title opens its roster (placed cells carry the workshop id).
              cells: row.cells.map((cell) =>
                cell.state === 'placed'
                  ? {
                      ...cell,
                      on_open: () =>
                        navigate(
                          organiserPathWithQuery(organiserPaths.workshop_workshop_list(), {
                            workshop: cell.id,
                          }),
                        ),
                    }
                  : cell,
              ),
            }))}
          />
        ) : (
          <WorkshopEmptyState title="Noch kein Programm">
            Ohne Slots und Räume kann nichts eingeplant werden.
          </WorkshopEmptyState>
        )
      ) : null}
      {view === 'unplaced' ? (
        programme.unplaced.length ? (
          <ul className="overflow-hidden rounded-base border-2 border-border">
            {programme.unplaced.map((workshop) => (
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
          {programme.overlaps.length ? (
            <WorkshopOverlapTable overlaps={programme.overlaps} />
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
    const durationMinutes = Number(data.get('duration_minutes'))
    if (
      !Number.isFinite(startsDate.getTime()) ||
      !Number.isSafeInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      setSlotError('Beginn und Dauer müssen gültig sein.')
      return
    }
    const endsDate = new globalThis.Date(startsDate.getTime() + durationMinutes * 60_000)
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
            description="Lege Beginn und Dauer für ein Zeitfenster des Workshopprogramms an."
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
                      duration_minutes: slotDurationMinutes(
                        editingSlot.starts_at,
                        editingSlot.ends_at,
                      ),
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
