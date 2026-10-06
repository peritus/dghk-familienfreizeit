import { useMemo, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import { officialWorkshopsWorld } from '../../../modules/official-workshops/index.js'
import { workshopTrack } from '../../../modules/workshop-assignment/app/workshop-track.js'
import type { PhaseView } from '../../../derive/phases.js'
import { organiserPathWithQuery, organiserPaths } from '../../../organiser/routes.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import {
  WorkshopScreenHeader,
  WorkshopSectionHeader,
  FixedDecisionReview,
} from '../../components/shared/workshop/shared.js'
import { WorkshopNavigation } from './workshops.js'
import { useOrganiser } from '../context.js'
import {
  ChoiceTraceTable,
  TraceControls,
  TraceLegend,
  type TraceMode,
  type TraceStageView,
} from '../../../modules/workshop-rankings/app/components/choices.js'
import {
  WorkshopAllocationAnswers,
  WorkshopAllocationConflictNotice,
  WorkshopAllocationDemand,
  WorkshopAllocationEmptyState,
  WorkshopAllocationGroupFilter,
  WorkshopAllocationSummary,
  WorkshopAllocationStatus,
} from '../../../modules/workshop-rankings/app/components/workshop-allocation.js'
import {
  buildWorkshopAllocationProjection,
  buildWorkshopAllocationTraceStages,
  workshopAllocationPeople,
  type WorkshopAllocationGroup,
  type WorkshopAllocationProjection,
} from '../../../modules/workshop-rankings/app/workshop-allocation-view.js'

type WorkshopAllocationView = 'answers' | 'demand' | 'trace'

const rankLegendTones = [
  'bg-yellow-300',
  'bg-orange-300',
  'bg-red-300',
  'bg-purple-300',
  'bg-blue-300',
]

function allocationView(pathname: string): WorkshopAllocationView {
  if (pathname.endsWith('/allocation/demand')) return 'demand'
  if (pathname.endsWith('/allocation/trace')) return 'trace'
  return 'answers'
}

function rankingLimit(): number {
  const module = activeProfile.modules.find((item) => item.id === 'workshop-rankings')
  return typeof module?.parameters?.max_rank === 'number' ? module.parameters.max_rank : 3
}

function traceStages(
  projection: WorkshopAllocationProjection,
  group: WorkshopAllocationGroup,
  selectedPersonId: string | undefined,
  mode: TraceMode,
): readonly TraceStageView[] {
  return buildWorkshopAllocationTraceStages(
    projection,
    group,
    mode === 'all' ? undefined : selectedPersonId,
    mode === 'only',
  )
}

/** The workshop area's status from the phase view, never from local answer counts. */
function allocationStatusLabel(phases: readonly PhaseView[]): string {
  const choice = phases.find(({ phase }) => phase === 'workshop-rankings.choice')
  const review = phases.find(({ phase }) => phase === 'workshop-assignment.review')
  if (choice?.status === 'closed') return 'Festgelegt'
  if (!choice || choice.status === 'upcoming') return 'Vorbereitung'
  return review && !review.readiness.ready ? 'Prüfung erforderlich' : 'Zuordnung prüfen'
}

export function WorkshopAllocation() {
  useDocumentTitle('Wünsche · Workshops · Familienfreizeit')
  // wouter's location is the pathname only; a traced person arrives in the query.
  const [location, navigate] = useLocation()
  const queryPersonId = new URLSearchParams(useSearch()).get('person')
  const { world, current_plan: currentPlan, phases } = useOrganiser()
  const [group, setGroup] = useState<WorkshopAllocationGroup>('all')
  const [traceMode, setTraceMode] = useState<TraceMode>(queryPersonId ? 'highlight' : 'all')
  const [selectedPersonName, setSelectedPersonName] = useState('')
  const projection = useMemo(
    () =>
      world && currentPlan
        ? buildWorkshopAllocationProjection({
            world,
            plan: currentPlan,
            event_date: activeProfile.meta.starts_on,
            time_zone: activeProfile.meta.timezone,
            max_rank: rankingLimit(),
          })
        : null,
    [currentPlan, world],
  )

  if (!world || !projection) return null

  const view = allocationView(location)
  const answers = workshopAllocationPeople(projection, group)
  const selectedPerson =
    projection.person_names.find((person) => person.name === selectedPersonName) ??
    projection.person_names.find((person) => person.id === queryPersonId)
  const people = projection.answers
    .filter((answer) => group === 'all' || answer.group === group)
    .map((answer) => answer.name)
    .sort((left, right) => left.localeCompare(right, 'de'))
  const stages = traceStages(projection, group, selectedPerson?.id, traceMode)
  const selectedLabel = traceMode === 'all' ? undefined : selectedPerson?.name
  const activeSelectedPersonId = traceMode === 'all' ? undefined : selectedPerson?.id

  const setView = (next: string) => {
    const paths: Record<WorkshopAllocationView, string> = {
      answers: organiserPaths.workshop_allocation(),
      demand: organiserPaths.workshop_allocation_demand(),
      trace: organiserPaths.workshop_allocation_trace(),
    }
    void navigate(paths[next as WorkshopAllocationView] ?? paths.answers)
  }

  const openTrace = (answer: { id: string }) => {
    const person = projection.person_names.find((item) => item.id === answer.id)
    if (person) setSelectedPersonName(person.name)
    if (traceMode === 'all') setTraceMode('highlight')
    void navigate(
      `${organiserPaths.workshop_allocation_trace()}?person=${encodeURIComponent(answer.id)}`,
    )
  }

  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Workshops · Wünsche"
        title="Wünsche"
        description="Was gewünscht wurde und wie die automatische Zuordnung daraus entsteht."
      />
      <WorkflowStepper
        aria_label="Ablauf der Workshopwahl"
        steps={workshopTrack({
          phases: phases ?? [],
          active_workshop_count: officialWorkshopsWorld(world).workshops.length,
          meta: activeProfile.meta,
        })}
      />
      <WorkshopAllocationStatus label={allocationStatusLabel(phases ?? [])}>
        {projection.has_answers
          ? 'Der Verlauf ist eine abgeleitete Vorschau. Prüfe offene Fälle und Konflikte.'
          : 'Sobald Antworten vorliegen, zeigt der Verlauf die Zuordnung Schritt für Schritt.'}
      </WorkshopAllocationStatus>
      <WorkshopAllocationConflictNotice projection={projection} />
      <FixedDecisionReview
        items={projection.fixed_reviews ?? []}
        title="Feste Teilnahmen prüfen"
        description="Festgelegte Teilnahmen werden mit der automatischen Zuordnung ohne diese Entscheidungen verglichen."
      />
      <TertiaryNavigation
        aria_label="Wünsche"
        value={view}
        onChange={setView}
        controls={<WorkshopAllocationGroupFilter value={group} on_change={setGroup} />}
        items={[
          { value: 'answers', label: 'Antworten' },
          { value: 'demand', label: 'Nachfrage' },
          { value: 'trace', label: 'Verlauf' },
        ]}
      />

      {view === 'answers' ? (
        <section className="space-y-5" aria-labelledby="allocation-answers-heading">
          <WorkshopSectionHeader
            title="Antworten"
            description="Die abgegebenen Rangfolgen und die daraus abgeleiteten Zuordnungen."
          />
          <WorkshopAllocationSummary answers={answers} projection={projection} />
          <WorkshopAllocationEmptyState projection={projection} has_answers={answers.length > 0}>
            {projection.has_workshops
              ? 'Sobald Personen eine Rangfolge abgegeben haben, erscheinen Antworten und Nachfrage hier.'
              : 'Lege zuerst Workshops an, damit Wünsche und Nachfrage berechnet werden können.'}
          </WorkshopAllocationEmptyState>
          {projection.has_answers ? (
            <div id="allocation-answers-heading">
              <WorkshopAllocationAnswers answers={answers} on_person={openTrace} />
            </div>
          ) : null}
        </section>
      ) : null}

      {view === 'demand' ? (
        <section className="space-y-5" aria-labelledby="allocation-demand-heading">
          <WorkshopSectionHeader
            title="Nachfrage"
            description="Erstwünsche, Rangfolgen und verfügbare Plätze je Workshop."
          />
          <WorkshopAllocationEmptyState
            projection={projection}
            has_answers={projection.demand.length > 0}
          />
          {projection.has_workshops && projection.has_answers ? (
            <div id="allocation-demand-heading">
              <WorkshopAllocationDemand demand={projection.demand} />
            </div>
          ) : null}
        </section>
      ) : null}

      {view === 'trace' ? (
        <section className="space-y-5" aria-labelledby="allocation-trace-heading">
          <WorkshopSectionHeader
            title="Was ist aus jedem Wunsch geworden?"
            description="Runde für Runde, mit den Personen, die es betrifft."
          />
          <TraceControls
            mode={traceMode}
            onModeChange={(mode) => {
              setTraceMode(mode)
              if (mode === 'all') {
                setSelectedPersonName('')
              } else if (!selectedPerson && people[0]) {
                setSelectedPersonName(people[0])
              }
            }}
            selected_person={selectedPersonName || selectedPerson?.name}
            onPersonChange={setSelectedPersonName}
            people={people}
          />
          <TraceLegend
            items={[
              ...Array.from({ length: rankingLimit() }, (_, index) => ({
                label: `${index + 1}. Wahl erfüllt`,
                tone: rankLegendTones[index] ?? 'bg-main',
              })),
              { label: 'voll', tone: 'bg-danger' },
              { label: 'Überschneidung', tone: 'bg-secondary-background' },
              { label: 'leitet selbst', tone: 'bg-paper' },
              { label: 'ohne Termin', tone: 'bg-background' },
            ]}
          />
          {traceMode === 'all' ? (
            <WorkshopAllocationEmptyState
              projection={projection}
              has_answers={stages[0]?.open ? stages[0].open > 0 : false}
            >
              Noch kein Verlauf: Es gibt keine abgegebenen Wünsche, die verfolgt werden können.
            </WorkshopAllocationEmptyState>
          ) : null}
          {projection.has_answers ? (
            <div id="allocation-trace-heading">
              <ChoiceTraceTable
                stages={stages}
                selected_person_label={selectedLabel}
                show_detail_rows
                on_person_id={(personId) => openTrace({ id: personId })}
                selected_person_id={activeSelectedPersonId}
              />
              {activeSelectedPersonId && selectedLabel ? (
                <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-base border-2 border-border bg-secondary-background px-3.5 py-2.5">
                  <span className="rounded-[3px] bg-foreground px-1.5 text-sm font-bold text-background">
                    {selectedLabel}
                  </span>
                  <OrganiserLink
                    href={organiserPathWithQuery(organiserPaths.workshop_person_list(), {
                      person: activeSelectedPersonId,
                    })}
                    className="underline decoration-foreground/25 decoration-[1.5px] underline-offset-[3px] hover:decoration-foreground hover:decoration-2"
                  >
                    Workshopplan ansehen
                  </OrganiserLink>
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
