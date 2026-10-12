import { fieldFeedback } from '../../../attention/fields.js'
import { useAttention, AttentionNotices } from '../attention.js'
import { pluralDe } from '../../lib/plural-de.js'
import type { Plan } from '../../../solver/types.js'
import { workshopAgeLabel } from '../../../modules/official-workshops/checks.js'
import { ChoiceField } from '../../components/shared/ui/field.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { randomIdPart } from '../ids.js'
import { useLocation, useSearch } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import type { World } from '../../../events/fold.js'
import type { EventDraft } from '../../../events/types.js'
import { officialWorkshopsWorld } from '../../../modules/official-workshops/index.js'
import {
  workshopSchedulingWorld,
  type WorkshopSlot,
} from '../../../modules/workshop-scheduling/index.js'
import { workshopSpaceWorld, type WorkshopSpace } from '../../../modules/workshop-space/index.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { Button } from '../../components/shared/ui/button.js'
import { DestructiveActionDialog } from '../../components/shared/ui/destructive-action-dialog.js'
import { SegmentedControl } from '../../components/shared/ui/segmented-control.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import { PhaseDecisionAction } from '../components/phase-decision.js'
import { AreaClosingActions } from '../components/area-closing.js'
import { workshopTrack } from '../../../modules/workshop-assignment/app/workshop-track.js'
import {
  SpaceEditorForm,
  SlotEditorForm,
  ExternalLeaderEditorFields,
  WorkshopEditorFields,
  WorkshopLeaderPicker,
} from '../components/workshop/editors.js'
import { EmptyState } from '../../components/shared/ui/screen-state.js'
import { FixedDecisionReview } from '../../components/shared/ui/fixed-decision-review.js'
import { CollectionList, CollectionRow } from '../../components/shared/ui/collection-list.js'
import {
  ScreenHeader,
  ScreenLayout,
  CollectionSection,
} from '../../components/shared/ui/screen-layout.js'
import { StatsStrip } from '../../components/shared/ui/stats-strip.js'
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
import { CollectionCreateAction } from '../../components/shared/ui/collection-create-action.js'
import { organiserPathWithQuery, organiserPaths } from '../../../organiser/routes.js'
import { useOrganiser } from '../context.js'

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
  assignments: readonly {
    person_id: string
    workshop_id: string
    reason: 'ranked' | 'fixed'
  }[]
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
  aria_label: ariaLabel,
  title,
  description,
  confirm_label: confirmLabel,
  onConfirm,
}: {
  label: string
  aria_label?: string
  title: string
  description: string
  confirm_label?: string
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button
        ref={trigger}
        size="sm"
        variant="danger"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <DestructiveActionDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirm_label={confirmLabel}
        final_focus={() => {
          if (trigger.current?.isConnected) return trigger.current
          const heading = document.querySelector<HTMLElement>('h1')
          if (heading) heading.tabIndex = -1
          return heading
        }}
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
      />
    </>
  )
}

function solveWorkshopPlan(_world: World, currentPlan?: Plan | null): WorkshopPlan {
  const plan: { sections: Readonly<Record<string, unknown>> } = currentPlan ?? { sections: {} }
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
        assignments?: readonly {
          person_id: string
          workshop_id: string
          reason: 'ranked' | 'fixed'
        }[]
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
  return (
    { children: 'Kinder', adults: 'Erwachsene', all: 'Kinder und Erwachsene' }[audience] ?? audience
  )
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
  const date = new Intl.DateTimeFormat(activeProfile.meta.locale, {
    ['timeZone']: activeProfile.meta.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new globalThis.Date(slot.starts_at))
    .replace(', ', ' ')
  return `${date} · ${space.name}`
}

function slotLabel(startsAt: string, endsAt?: string): string {
  const starts = new globalThis.Date(startsAt)
  const ends = endsAt ? new globalThis.Date(endsAt) : undefined
  const day = starts.toLocaleDateString(activeProfile.meta.locale, {
    weekday: 'short',
    ['timeZone']: activeProfile.meta.timezone,
  })
  const time = starts.toLocaleTimeString(activeProfile.meta.locale, {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: activeProfile.meta.timezone,
  })
  const endTime = ends?.toLocaleTimeString(activeProfile.meta.locale, {
    hour: '2-digit',
    minute: '2-digit',
    ['timeZone']: activeProfile.meta.timezone,
  })
  return `${day} ${time}${endTime ? `–${endTime}` : ''}`
}

function slotDurationMinutes(startsAt: string, endsAt: string): number {
  return Math.round(
    (new globalThis.Date(endsAt).getTime() - new globalThis.Date(startsAt).getTime()) / 60_000,
  )
}

export function WorkshopNavigation() {
  const programmePaths = [
    organiserPaths.workshop_programme(),
    organiserPaths.workshop_programme_unplaced(),
    organiserPaths.workshop_programme_overlaps(),
  ] as const
  return (
    <SecondaryNavigation
      aria_label="Kursbereiche"
      items={[
        {
          href: organiserPaths.workshops(),
          active_paths: [
            organiserPaths.workshops(),
            organiserPaths.workshop_leaders(),
            organiserPaths.workshop_external_leaders(),
          ],
          label: 'Übersicht',
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
  )
}

type ProgrammeReviewView = 'programme' | 'unplaced' | 'overlaps'

function programmeReviewView(pathname: string): ProgrammeReviewView {
  if (pathname.endsWith('/programme/unplaced')) return 'unplaced'
  if (pathname.endsWith('/programme/overlaps')) return 'overlaps'
  return 'programme'
}

function ExternalLeaderCollection() {
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
  for (const value of editingLeader?.availability ?? []) {
    if (!slotOptions.some((option) => option.value === value))
      slotOptions.push({ value, label: value })
  }
  const workshopNames = new Map(summary.workshops.map((workshop) => [workshop.id, workshop.title]))
  const saveLeader = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const availability = data.getAll('availability').map(String)
    if (!name) {
      setError(fieldFeedback('name'))
      return
    }
    if (!availability.length) {
      setError(fieldFeedback('leader-slots'))
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
    <CollectionSection
      title="Externe Leitungen"
      description={`${summary.external_leaders.length} externe Leitungen · Sie leiten nur und nehmen sonst nicht teil.`}
      action={
        <CollectionCreateAction
          label="Externe Leitung hinzufügen"
          title={
            editingLeader ? `Externe Leitung: ${editingLeader.name}` : 'Externe Leitung hinzufügen'
          }
          description="Externe Leitungen leiten Kurse, nehmen aber nicht an der Freizeit teil."
          open={editor !== null}
          on_open_change={(open) => {
            setEditor(open ? (editor ?? 'new') : null)
            setError(null)
          }}
          on_submit={saveLeader}
          submit_label="Übernehmen"
          error={error}
          form_class_name="sm:grid-cols-2"
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
        </CollectionCreateAction>
      }
    >
      {summary.external_leaders.length ? (
        <CollectionList>
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
                  .map((workshop) => workshopNames.get(workshop.id) ?? 'Workshop ohne Titel'),
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
        </CollectionList>
      ) : (
        <EmptyState title="Noch keine externen Leitungen">
          Lege eine externe Leitung an, bevor du sie einem Kurs zuweist.
        </EmptyState>
      )}
    </CollectionSection>
  )
}

function InternalLeaderCollection() {
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
        .map((workshop) => workshopById.get(workshop.id) ?? 'Workshop ohne Titel')
      return { id: person.id, name: name || 'Name nicht verfügbar', leads }
    })
    .filter((leader) => leader.leads.length)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return (
    <CollectionSection
      title="Leitungen"
      description={`${leaders.length} Personen aus der Veranstaltung leiten mindestens einen Kurs.`}
    >
      {leaders.length ? (
        <CollectionList>
          {leaders.map((leader) => (
            <CollectionRow key={leader.id}>
              <strong>{leader.name}</strong>
              <p className="mt-1 text-sm text-muted">Leitet: {leader.leads.join(', ')}</p>
            </CollectionRow>
          ))}
        </CollectionList>
      ) : (
        <EmptyState title="Noch keine internen Leitungen">
          Weise eine Person aus der Veranstaltung einem Kurs zu.
        </EmptyState>
      )}
    </CollectionSection>
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
        {
          value: 'spaces',
          label: 'Räume',
          link: <OrganiserLink href={organiserPaths.workshop_spaces()} />,
        },
        {
          value: 'slots',
          label: 'Slots',
          link: <OrganiserLink href={organiserPaths.workshop_slots()} />,
        },
      ]}
    />
  )
}
export function Workshops({
  initial_view: initialView = 'workshops',
}: { initial_view?: 'workshops' | 'leaders' | 'external' } = {}) {
  const [pathname, navigate] = useLocation()
  useDocumentTitle('Kurse · Familienfreizeit')
  const { world, state, stage, phases, current_plan: currentPlan } = useOrganiser()
  const summary = officialWorkshopsWorld(world!)
  const choice = phases?.find(({ phase }) => phase === 'workshop-rankings.choice')
  const choiceOpened = choice !== undefined && choice.status !== 'upcoming'
  const schedule = workshopSchedulingWorld(world!)
  const spaces = workshopSpaceWorld(world!).live
  const plan = solveWorkshopPlan(world!, currentPlan)
  const [editor, setEditor] = useState<'new' | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'children' | 'adults'>('all')
  const view =
    pathname === organiserPaths.workshop_external_leaders()
      ? 'external'
      : pathname === organiserPaths.workshop_leaders()
        ? 'leaders'
        : initialView
  const [unplacedFilter, setOnlyUnplaced] = useState(false)
  const search = useSearch()
  const query = new URLSearchParams(search)
  const onlyUnplaced = unplacedFilter || query.has('unscheduled')
  const changeUnplaced = (next: boolean) => {
    setOnlyUnplaced(next)
    if (view !== 'workshops' || query.has('unscheduled')) {
      const filters = new URLSearchParams(search)
      if (next) filters.set('unscheduled', '1')
      else filters.delete('unscheduled')
      navigate(organiserPathWithQuery(organiserPaths.workshops(), Object.fromEntries(filters)))
    }
  }
  const [notesFilter, setOnlyNotes] = useState(false)
  const onlyNotes = notesFilter || query.has('notes')
  const focusWorkshop = query.get('workshop')
  useEffect(() => {
    if (focusWorkshop) {
      const row = document.getElementById(`workshop-${focusWorkshop}`)
      row?.scrollIntoView?.({ block: 'center' })
      row?.focus()
    }
  }, [focusWorkshop])
  const people = world!.persons
    .map((person) => {
      const labels = world!.labels_by_entity[person.id] ?? []
      const name = [
        labels.find((label) => label.key === 'given-name')?.value,
        labels.find((label) => label.key === 'family-name')?.value,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
      return { id: person.id, name: name || 'Name nicht verfügbar' }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  const leaderNames = new Map([
    ...people.map((person) => [person.id, person.name] as const),
    ...summary.external_leaders.map((leader) => [leader.id, `${leader.name} (extern)`] as const),
  ])
  const attendanceByWorkshop = new Map<string, Set<string>>()
  for (const attendee of [...plan.assignments, ...plan.signups]) {
    const people = attendanceByWorkshop.get(attendee.workshop_id) ?? new Set<string>()
    people.add(attendee.person_id)
    attendanceByWorkshop.set(attendee.workshop_id, people)
  }
  const fixedByWorkshop = new Map<string, Set<string>>()
  for (const attendee of plan.assignments.filter((assignment) => assignment.reason === 'fixed')) {
    const people = fixedByWorkshop.get(attendee.workshop_id) ?? new Set<string>()
    people.add(attendee.person_id)
    fixedByWorkshop.set(attendee.workshop_id, people)
  }
  const signupsByWorkshop = new Map<string, Set<string>>()
  for (const attendee of plan.signups) {
    const people = signupsByWorkshop.get(attendee.workshop_id) ?? new Set<string>()
    people.add(attendee.person_id)
    signupsByWorkshop.set(attendee.workshop_id, people)
  }
  const interestsByWorkshop = new Map<string, Set<string>>()
  for (const attendee of plan.interests) {
    const people = interestsByWorkshop.get(attendee.workshop_id) ?? new Set<string>()
    people.add(attendee.person_id)
    interestsByWorkshop.set(attendee.workshop_id, people)
  }
  const placedWorkshopIds = new Set(plan.placements.map((placement) => placement.workshop_id))
  const attention = useAttention()
  const notes = attention.items.filter((item) => item.display_scopes.includes('workshop'))
  const notedIds = new Set(
    notes
      .filter((item) => item.kind === 'review' || item.kind === 'problem')
      .flatMap((item) => item.subjects.filter((s) => s.kind === 'workshop').map((s) => s.id)),
  )
  const oversubscribed = notes.filter((item) => item.code === 'workshop-rankings.demand').length
  const editingWorkshop =
    editor && editor !== 'new'
      ? summary.workshops.find((workshop) => workshop.id === editor)
      : undefined
  const activeWorkshops = summary.workshops.filter(
    (workshop) =>
      (audienceFilter === 'all' ||
        workshop.audience === 'all' ||
        workshop.audience === audienceFilter) &&
      (!onlyUnplaced || !placedWorkshopIds.has(workshop.id)) &&
      (!onlyNotes || notedIds.has(workshop.id)),
  )

  const saveWorkshop = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const ageMin = Number(data.get('age_min') ?? 0)
    const ageMax = Number(data.get('age_max') ?? 120)
    const capacity = Number(data.get('capacity') ?? 0)
    if (!title) {
      setError(fieldFeedback('workshop-title'))
      return
    }
    if (
      !Number.isInteger(ageMin) ||
      !Number.isInteger(ageMax) ||
      ageMin < 0 ||
      ageMax > 120 ||
      ageMin > ageMax
    ) {
      setError(fieldFeedback('age-range'))
      return
    }
    if (!Number.isInteger(capacity) || capacity < 0) {
      setError(fieldFeedback('capacity'))
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
    <ScreenLayout
      print_running_title="Kurse"
      print_context={
        <p>
          Ansicht:{' '}
          {view === 'workshops' ? 'Kurse' : view === 'leaders' ? 'Leitungen' : 'Externe Leitungen'}
          {view === 'workshops'
            ? ` · Zielgruppe: ${audienceFilter === 'all' ? 'Alle' : audienceLabel(audienceFilter)}${onlyUnplaced ? ' · Nur nicht eingeplante' : ''}${onlyNotes ? ' · Nur mit Hinweisen' : ''} · ${activeWorkshops.length} von ${summary.workshops.length} Kursen`
            : ''}
        </p>
      }
      secondary_navigation={<WorkshopNavigation />}
      header={
        <ScreenHeader
          eyebrow="Kurse"
          title="Kurse"
          description="Kurse anlegen und bearbeiten, Leitungen und Zielgruppen im Blick behalten."
        />
      }
      workflow={
        <>
          <WorkflowStepper
            aria_label="Ablauf der Kurswahl"
            storage_key="workshops.phase.expanded"
            storage_user={state.principal_email}
            panel={{
              text:
                choice?.status === 'closed'
                  ? 'Das Ergebnis ist festgelegt. Änderungen erscheinen als Abweichungen.'
                  : choiceOpened
                    ? 'Familien können ihre Wünsche, Anmeldungen und ihr Interesse bis zum Festlegen weiter ändern. Prüfe das Ergebnis in den Ansichten dieser Seite.'
                    : summary.workshops.length
                      ? 'Prüfe Zielgruppen und Leitungen. Öffne danach die Wahl für Familien.'
                      : 'Lege den ersten Kurs an.',
            }}
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
                  title="Kurswahl öffnen?"
                  description="Familien sehen danach den Kurskatalog und können Wünsche, Anmeldungen und Interesse angeben. Das Öffnen wird nicht zurückgenommen; danach steuert das Festlegen die Eingaben."
                  confirm_label="Wahl öffnen"
                  on_confirm={() =>
                    stage([draft(state.principal_email!, 'WorkshopChoiceOpened', {})])
                  }
                />
              ) : !summary.workshops.length ? (
                <Button onClick={() => setEditor('new')}>Kurse anlegen</Button>
              ) : null
            }
          />
        </>
      }
      notices={<AttentionNotices scope="workshop" />}
      summary={
        <StatsStrip
          items={[
            {
              value: summary.workshops.length,
              label: pluralDe(summary.workshops.length, 'aktiver Kurs', 'aktive Kurse'),
            },
            {
              value: summary.workshops.filter((workshop) => !placedWorkshopIds.has(workshop.id))
                .length,
              label: 'noch nicht eingeplant',
              tone: 'attention',
              filter: {
                active: onlyUnplaced,
                onToggle: () => {
                  changeUnplaced(!onlyUnplaced)
                },
              },
            },
            {
              value: oversubscribed,
              label: 'mehr Wünsche als Plätze',
            },
            {
              value: summary.external_leaders.length,
              label: pluralDe(
                summary.external_leaders.length,
                'externe Leitung',
                'externe Leitungen',
              ),
            },
          ]}
        />
      }
      tertiary_navigation={
        <TertiaryNavigation
          aria_label="Kursansichten"
          value={view}
          onChange={(next) => {
            const value = next as 'workshops' | 'leaders' | 'external'
            navigate(
              value === 'leaders'
                ? organiserPaths.workshop_leaders()
                : value === 'external'
                  ? organiserPaths.workshop_external_leaders()
                  : organiserPaths.workshops(),
            )
          }}
          controls={
            view === 'workshops' ? (
              <CollectionCreateAction
                label="Kurs hinzufügen"
                title={
                  editingWorkshop ? `Kurs bearbeiten: ${editingWorkshop.title}` : 'Kurs hinzufügen'
                }
                description="Beschreibung, Zielgruppe und Rahmen für diesen Kurs festlegen."
                open={editor !== null}
                on_open_change={(open) => {
                  setEditor(open ? (editor ?? 'new') : null)
                  setError(null)
                }}
                on_submit={saveWorkshop}
                submit_label={editingWorkshop ? 'Speichern' : 'Entwurf anlegen'}
                error={error}
                form_class_name="sm:grid-cols-2"
              >
                <WorkshopEditorFields
                  key={editor ?? 'new'}
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
                </WorkshopEditorFields>
              </CollectionCreateAction>
            ) : null
          }
          items={[
            {
              value: 'workshops',
              label: 'Kurse',
              count: summary.workshops.length,
              link: <OrganiserLink href={organiserPaths.workshops()} />,
            },
            {
              value: 'leaders',
              label: 'Leitungen',
              count: people.filter((person) =>
                summary.workshops.some((workshop) => workshop.leader_ids.includes(person.id)),
              ).length,
              link: <OrganiserLink href={organiserPaths.workshop_leaders()} />,
            },
            {
              value: 'external',
              label: 'Externe Leitungen',
              count: summary.external_leaders.length,
              link: <OrganiserLink href={organiserPaths.workshop_external_leaders()} />,
            },
          ]}
        />
      }
    >
      {view === 'workshops' ? (
        <CollectionSection
          title={null}
          label="Aktive Kurse"

          controls={
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <SegmentedControl
                presentation="filter"
                label="Gruppe"
                value={audienceFilter}
                onChange={setAudienceFilter}
                options={[
                  { value: 'all', label: `Alle (${summary.workshops.length})` },
                  {
                    value: 'children',
                    label: `Kinder (${summary.workshops.filter(({ audience }) => audience === 'children' || audience === 'all').length})`,
                  },
                  {
                    value: 'adults',
                    label: `Erwachsene (${summary.workshops.filter(({ audience }) => audience === 'adults' || audience === 'all').length})`,
                  },
                ]}
              />
              <ChoiceField
                type="checkbox"
                label="Nur nicht eingeplante"
                checked={onlyUnplaced}
                onChange={(event) => changeUnplaced(event.target.checked)}
              />
              <ChoiceField
                type="checkbox"
                label="Nur mit Hinweisen"
                checked={onlyNotes}
                onChange={(event) => {
                  setOnlyNotes(event.target.checked)
                  if (!event.target.checked && query.has('notes'))
                    navigate(organiserPaths.workshops())
                }}
              />
              <p role="status" aria-live="polite" className="text-sm text-muted">
                {activeWorkshops.length} von {summary.workshops.length} Kursen
              </p>
            </div>
          }
        >
          {activeWorkshops.length ? (
            <CollectionList>
              {activeWorkshops.map((workshop) => (
                <WorkshopSummaryRow
                  key={workshop.id}
                  workshop={{
                    id: workshop.id,
                    title: workshop.title,
                    description: workshop.description,
                    audience: audienceLabel(workshop.audience),
                    age_range: workshopAgeLabel(workshop),
                    capacity: workshop.capacity,
                    participation_mode: participationLabel(workshop.mode),
                    leaders: workshop.leader_ids.flatMap((leaderId) =>
                      leaderNames.has(leaderId) ? [leaderNames.get(leaderId)!] : [],
                    ),
                    unknown_leader_count: workshop.leader_ids.filter(
                      (leaderId) => !leaderNames.has(leaderId),
                    ).length,
                    requirement: workshop.needs.join(', ') || undefined,
                    count: attendanceByWorkshop.get(workshop.id)?.size ?? 0,
                    fixed_attendance_count: fixedByWorkshop.get(workshop.id)?.size ?? 0,
                    signup_count:
                      workshop.mode === 'sign-up'
                        ? (signupsByWorkshop.get(workshop.id)?.size ?? 0)
                        : undefined,
                    interest_count:
                      workshop.mode === 'interest'
                        ? (interestsByWorkshop.get(workshop.id)?.size ?? 0)
                        : undefined,
                    wishes:
                      workshop.mode === 'assigned' ? (plan.demand[workshop.id] ?? 0) : undefined,
                    notes: notes
                      .filter(
                        (note) =>
                          note.subjects.some((s) => s.id === workshop.id) &&
                          (note.kind === 'review' || note.kind === 'problem'),
                      )
                      .map((item) => item.wording.detail),
                    placement: {
                      label:
                        placementLabel(workshop.id, plan.placements, schedule.slots, spaces) ??
                        'Noch nicht eingeplant',
                      tone: placedWorkshopIds.has(workshop.id) ? 'success' : 'attention',
                    },
                  }}
                  action={
                    <>
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
                      <WorkshopRetireAction
                        label="Löschen"
                        aria_label={`Kurs löschen: ${workshop.title}`}
                        title={`Kurs löschen: ${workshop.title}?`}
                        description="Der Kurs wird aus dem aktuellen Programm entfernt. Bereits erfasste Wünsche und Entscheidungen bleiben erhalten. Prüfe anschließend die offenen Fälle unter Wünsche · Verlauf."
                        confirm_label="Ja, löschen"
                        onConfirm={() =>
                          stage([
                            draft(state.principal_email ?? '', 'WorkshopRetired', {
                              workshop_id: workshop.id,
                              reason: 'Organisatorisch entfernt',
                            }),
                          ])
                        }
                      />
                    </>
                  }
                />
              ))}
            </CollectionList>
          ) : (
            <EmptyState
              title={
                summary.workshops.length ? 'Keine Kurse für diese Filter' : 'Keine aktiven Kurse'
              }
            >
              {summary.workshops.length
                ? 'Ändere die Filter, um weitere Kurse zu sehen.'
                : 'Noch keine Kurse. Lege den ersten Entwurf an.'}
            </EmptyState>
          )}
        </CollectionSection>
      ) : null}
      {view === 'leaders' ? <InternalLeaderCollection /> : null}
      {view === 'external' ? <ExternalLeaderCollection /> : null}
    </ScreenLayout>
  )
}

/** The workshop review phase's readiness, with its first findings (phases.md §3, §8). */
export function WorkshopProgramme() {
  useDocumentTitle('Programm · Kurse · Familienfreizeit')
  const { world, phases, state, current_plan: currentPlan } = useOrganiser()
  const [location, navigate] = useLocation()
  const schedule = workshopSchedulingWorld(world!)
  const spaces = workshopSpaceWorld(world!).live
  const official = officialWorkshopsWorld(world!)
  const attention = useAttention()
  const plan = solveWorkshopPlan(world!, currentPlan)
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
      return [person.id, name || 'Name nicht verfügbar'] as const
    }),
  )
  const leaderNames = new Map([
    ...personNames,
    ...official.external_leaders.map((leader) => [leader.id, `${leader.name} (extern)`] as const),
  ])
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
    overlap_findings: attention.items.filter((item) => item.code === 'workshop-rankings.overlap'),
    person_names: personNames,
    leader_names: leaderNames,
    time_zone: activeProfile.meta.timezone,
  })
  return (
    <ScreenLayout
      print_orientation={view === 'programme' ? 'landscape' : 'portrait'}
      print_context={
        <p>
          Ansicht:{' '}
          {view === 'programme'
            ? 'Programm'
            : view === 'unplaced'
              ? 'Nicht eingeplant'
              : 'Überschneidungen'}
        </p>
      }
      secondary_navigation={<WorkshopNavigation />}
      header={
        <ScreenHeader
          eyebrow="Programm"
          title="Programm"
          description="Welcher Kurs wann in welchem Raum stattfindet."
        />
      }
      notices={
        <>
          <AttentionNotices scope="programme" />
          <FixedDecisionReview
            items={programme.fixed_reviews}
            title="Feste Platzierungen prüfen"
            description="Festgelegte Platzierungen werden mit dem automatischen Programmvergleich erklärt."
          />
        </>
      }
      workflow={
        <WorkflowStepper
          aria_label="Ablauf der Kurswahl"
          storage_key="workshops.programme.expanded"
          storage_user={state.principal_email}
          steps={workshopTrack({
            phases: phases ?? [],
            active_workshop_count: officialWorkshopsWorld(world!).workshops.length,
            meta: activeProfile.meta,
          })}
        />
      }
      tertiary_navigation={<WorkshopParticipationNavigation />}
    >
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
          <EmptyState title="Noch kein Programm">
            Ohne Slots und Räume kann nichts eingeplant werden.
          </EmptyState>
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
          <EmptyState success>Alle Kurse sind eingeplant.</EmptyState>
        )
      ) : null}
      {view === 'overlaps' ? (
        <section className="space-y-4" aria-labelledby="programme-overlaps-heading">
          <div>
            <h2 id="programme-overlaps-heading" className="text-figure font-heading">
              Überschneidungen
            </h2>
            <p className="mt-1 max-w-3xl text-muted">
              Zwei Kurse aus derselben Top 3 im selben Slot: Die Person kann nur einen davon
              bekommen.
            </p>
          </div>
          {programme.overlaps.length ? (
            <WorkshopOverlapTable overlaps={programme.overlaps} />
          ) : (
            <EmptyState success>Keine Überschneidungen.</EmptyState>
          )}
        </section>
      ) : null}
    </ScreenLayout>
  )
}

export function WorkshopSlots() {
  useDocumentTitle('Slots · Kurse · Familienfreizeit')
  const { world, state, stage, current_plan: currentPlan } = useOrganiser()
  const summary = workshopSchedulingWorld(world!)
  const plan = solveWorkshopPlan(world!, currentPlan)
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
      setSlotError(fieldFeedback('slot-time'))
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
      setSlotError(fieldFeedback('slot-overlap'))
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
    <ScreenLayout
      secondary_navigation={<WorkshopNavigation />}
      header={
        <ScreenHeader
          eyebrow="Kurse"
          title="Räume und Slots"
          description="Kursräume, Kapazitäten und Zeitfenster verwalten."
        />
      }
      tertiary_navigation={<WorkshopResourceNavigation value="slots" />}
    >
      <CollectionSection
        title="Slots"
        action={
          <CollectionCreateAction
            label="Slot hinzufügen"
            title={editingSlot ? 'Slot bearbeiten' : 'Slot hinzufügen'}
            description="Lege Beginn und Dauer für ein Zeitfenster des Kursprogramms an."
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
                  : { starts_at: `${activeProfile.meta.starts_on}T09:00` }
              }
            />
          </CollectionCreateAction>
        }
      >
        {!summary.slots.length ? (
          <EmptyState title="Noch keine Slots">
            Lege das erste Zeitfenster für das Kursprogramm an.
          </EmptyState>
        ) : null}
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
                    description={`${slot.day_label}, ${slot.time_label} wird aus dem Kursprogramm entfernt.`}
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
      </CollectionSection>
    </ScreenLayout>
  )
}

export function WorkshopSpaces() {
  useDocumentTitle('Räume und Slots · Kurse · Familienfreizeit')
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
    stage([
      draft(
        state.principal_email ?? '',
        editingSpace ? 'WorkshopSpaceUpdated' : 'WorkshopSpaceAdded',
        {
          workshop_space_id: editingSpace?.id ?? id('wsp_'),
          name: String(data.get('name') ?? ''),
          location_description: String(data.get('location') ?? ''),
          capacity: Number(data.get('capacity') ?? 0),
          sort_key: editingSpace?.sort_key ?? summary.live.length + 1,
        },
      ),
    ])
    event.currentTarget.reset()
    setAddingSpace(false)
    setEditingSpace(null)
  }
  return (
    <ScreenLayout
      secondary_navigation={<WorkshopNavigation />}
      header={
        <ScreenHeader
          eyebrow="Kurse"
          title="Räume und Slots"
          description="Kursräume, Kapazitäten und ihre Verfügbarkeit pro Slot verwalten."
        />
      }
      tertiary_navigation={<WorkshopResourceNavigation value="spaces" />}
    >
      <CollectionSection
        title="Räume"
        action={
          <CollectionCreateAction
            label="Raum hinzufügen"
            title={editingSpace ? 'Kursraum bearbeiten' : 'Kursraum hinzufügen'}
            description="Lege Ort und Kapazität des Kursraums fest. Die Verfügbarkeit markierst du pro Slot."
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
                    }
                  : undefined
              }
            />
          </CollectionCreateAction>
        }
      >
        {!spaceViews.length ? (
          <EmptyState title="Noch keine Räume">Lege den ersten Kursraum an.</EmptyState>
        ) : null}
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
                    description={`${space.name} wird aus dem Kursplan entfernt.`}
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
      </CollectionSection>
    </ScreenLayout>
  )
}

export function WorkshopLeaders() {
  return <Workshops initial_view="leaders" />
}

export function WorkshopExternalLeaders() {
  return <Workshops initial_view="external" />
}

export function WorkshopParticipationNavigation() {
  const [location, navigate] = useLocation()
  const value =
    location === organiserPaths.workshop_participation() ? 'persons' : programmeReviewView(location)
  return (
    <TertiaryNavigation
      aria_label="Teilnahmeansichten"
      value={value}
      onChange={(next) =>
        navigate(
          next === 'persons'
            ? organiserPaths.workshop_participation()
            : next === 'unplaced'
              ? organiserPaths.workshop_programme_unplaced()
              : next === 'overlaps'
                ? organiserPaths.workshop_programme_overlaps()
                : organiserPaths.workshop_programme(),
        )
      }
      items={[
        {
          value: 'persons',
          label: 'Personen',
          link: <OrganiserLink href={organiserPaths.workshop_participation()} />,
        },
        {
          value: 'programme',
          label: 'Programm',
          link: <OrganiserLink href={organiserPaths.workshop_programme()} />,
        },
        {
          value: 'unplaced',
          label: 'Nicht eingeplant',
          link: <OrganiserLink href={organiserPaths.workshop_programme_unplaced()} />,
        },
        {
          value: 'overlaps',
          label: 'Überschneidungen',
          link: <OrganiserLink href={organiserPaths.workshop_programme_overlaps()} />,
        },
      ]}
    />
  )
}
