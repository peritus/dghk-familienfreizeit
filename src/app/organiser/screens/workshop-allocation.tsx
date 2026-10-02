import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import type { KernelWorld } from '../../../events/fold.js'
import { composeSolverContributions, buildSolverInput, solve } from '../../../solver/index.js'
import type { Plan } from '../../../solver/types.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import {
  WorkshopScreenHeader,
  WorkshopSectionHeader,
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
} from '../../../modules/workshop-rankings/app/components/workshop-allocation.js'
import {
  buildWorkshopAllocationProjection,
  buildWorkshopAllocationTraceStages,
  workshopAllocationPeople,
  type WorkshopAllocationGroup,
  type WorkshopAllocationProjection,
} from '../../../modules/workshop-rankings/app/workshop-allocation-view.js'

type WorkshopAllocationView = 'answers' | 'demand' | 'trace'

function allocationView(pathname: string): WorkshopAllocationView {
  if (pathname.split('?')[0]?.endsWith('/allocation/demand')) return 'demand'
  if (pathname.split('?')[0]?.endsWith('/allocation/trace')) return 'trace'
  return 'answers'
}

function solveWorkshopAllocation(world: KernelWorld, previousPlan: Plan | null): Plan {
  const contributions = composeSolverContributions(activeProfile)
  return solve(buildSolverInput(world, contributions, previousPlan), contributions, {
    build_revision: 'organiser',
    compatibility_revision: 1,
    event_date: activeProfile.meta.starts_on,
    profile: activeProfile,
    seed: null,
  })
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

export function WorkshopAllocation() {
  useDocumentTitle('Wünsche · Workshops · Familienfreizeit')
  const [location, navigate] = useLocation()
  const { world, previous_plan: previousPlan } = useOrganiser()
  const [group, setGroup] = useState<WorkshopAllocationGroup>('all')
  const [traceMode, setTraceMode] = useState<TraceMode>('all')
  const [selectedPersonName, setSelectedPersonName] = useState('')
  const plan = useMemo(
    () => (world ? solveWorkshopAllocation(world, previousPlan ?? null) : null),
    [world, previousPlan],
  )
  const projection = useMemo(
    () =>
      world && plan
        ? buildWorkshopAllocationProjection({
            world,
            plan,
            event_date: activeProfile.meta.starts_on,
            time_zone: activeProfile.meta.timezone,
            max_rank: rankingLimit(),
          })
        : null,
    [plan, world],
  )

  if (!world || !projection) return null

  const view = allocationView(location)
  const answers = workshopAllocationPeople(projection, group)
  const query = new URLSearchParams(location.split('?')[1] ?? '')
  const queryPersonId = query.get('person')
  const selectedPerson = projection.person_names.find(
    (person) => person.id === queryPersonId || person.name === selectedPersonName,
  )
  const people = projection.answers
    .filter((answer) => group === 'all' || answer.group === group)
    .map((answer) => answer.name)
  const stages = traceStages(projection, group, selectedPerson?.id, traceMode)
  const selectedLabel = traceMode === 'all' ? undefined : selectedPerson?.name

  const setView = (next: string) => {
    const paths: Record<WorkshopAllocationView, string> = {
      answers: organiserPaths.workshop_allocation(),
      demand: organiserPaths.workshop_allocation_demand(),
      trace: organiserPaths.workshop_allocation_trace(),
    }
    void navigate(paths[next as WorkshopAllocationView] ?? paths.answers)
  }

  const openTrace = (answer: { id: string }) => {
    setTraceMode('highlight')
    void navigate(`${organiserPaths.workshop_allocation_trace()}?person=${encodeURIComponent(answer.id)}`)
  }

  return (
    <div className="space-y-8">
      <WorkshopNavigation />
      <WorkshopScreenHeader
        eyebrow="Workshops · Wünsche"
        title="Wünsche"
        description="Was gewünscht wurde und wie die automatische Zuordnung daraus entsteht."
      />
      <WorkshopAllocationConflictNotice projection={projection} />
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
          <WorkshopAllocationEmptyState projection={projection}>
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
          <WorkshopAllocationEmptyState projection={projection} />
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
            title="Verlauf"
            description="Warum Wünsche erfüllt, zurückgestellt oder nicht berücksichtigt wurden."
          />
          <TraceControls
            mode={traceMode}
            onModeChange={setTraceMode}
            selected_person={selectedPersonName || selectedPerson?.name}
            onPersonChange={setSelectedPersonName}
            people={people}
          />
          <TraceLegend
            items={[
              { label: 'erfüllt', tone: 'bg-main' },
              { label: 'voll', tone: 'bg-danger' },
              { label: 'Überschneidung', tone: 'bg-secondary-background' },
              { label: 'leitet selbst', tone: 'bg-paper' },
              { label: 'ohne Termin', tone: 'bg-background' },
            ]}
          />
          <WorkshopAllocationEmptyState projection={projection}>
            Noch kein Verlauf: Es gibt keine abgegebenen Wünsche, die verfolgt werden können.
          </WorkshopAllocationEmptyState>
          {projection.has_answers ? (
            <div id="allocation-trace-heading">
              <ChoiceTraceTable stages={stages} selected_person_label={selectedLabel} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
