import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
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

const rankLegendTones = ['bg-yellow-300', 'bg-orange-300', 'bg-red-300', 'bg-purple-300', 'bg-blue-300']

function WorkshopAllocationTraceContext({
  projection,
  group,
  selected_person_id: selectedPersonId,
}: {
  projection: WorkshopAllocationProjection
  group: WorkshopAllocationGroup
  selected_person_id?: string
}) {
  const people = projection.trace_people.filter(
    (person) =>
      group === 'all' ||
      projection.answers.find((answer) => answer.id === person.id)?.group === group,
  )
  const selected = people.find((person) => person.id === selectedPersonId)
  if (selected) {
    const noWishes = selected.wish_count === 0
    return (
      <div className="rounded-base border-2 border-border bg-paper p-4">
        <h3 className="font-heading text-lg">Kontext für {selected.name}</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted">Person</dt>
            <dd className="font-bold">{selected.name}, {selected.age_label}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Passende Workshops</dt>
            <dd className="font-bold tabular-nums">{selected.matching_workshop_count}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Leitet</dt>
            <dd className="font-bold">{selected.leading_workshops.join(', ') || '—'}</dd>
          </div>
        </dl>
        {noWishes ? (
          <p className="mt-4 rounded-base border-2 border-border bg-background p-3 text-sm">
            <strong>{selected.name} hat keine Wünsche.</strong>{' '}
            {selected.status === 'Keine Präferenz'
              ? 'Bewusst keine Präferenz.'
              : selected.status === 'Keine Antwort'
                ? 'Noch keine Antwort.'
                : 'Keine Rangfolge abgegeben.'}
            {selected.age_label !== 'erwachsen'
              ? ' Plätze kommen nur aus freien Plätzen.'
              : ' Erwachsene ohne Wünsche bekommen keine Plätze zugeteilt.'}
          </p>
        ) : null}
      </div>
    )
  }
  const ranked = people.filter((person) => person.wish_count > 0).length
  const noPreference = people.filter((person) => person.status === 'Keine Präferenz').length
  const noAnswer = people.filter((person) => person.status === 'Keine Antwort').length
  return (
    <div className="rounded-base border-2 border-border bg-paper p-4">
      <h3 className="font-heading text-lg">Kontext</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Personen', people.length],
          ['mit Rangfolge', ranked],
          ['Keine Präferenz', noPreference],
          ['Keine Antwort', noAnswer],
          ['ohne Zuordnung', projection.unassigned_person_ids.filter((id) => people.some((person) => person.id === id)).length],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function allocationView(pathname: string): WorkshopAllocationView {
  if (pathname.split('?')[0]?.endsWith('/allocation/demand')) return 'demand'
  if (pathname.split('?')[0]?.endsWith('/allocation/trace')) return 'trace'
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

export function WorkshopAllocation() {
  useDocumentTitle('Wünsche · Workshops · Familienfreizeit')
  const [location, navigate] = useLocation()
  const { world, current_plan: currentPlan } = useOrganiser()
  const [group, setGroup] = useState<WorkshopAllocationGroup>('all')
  const [traceMode, setTraceMode] = useState<TraceMode>('all')
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
        steps={[
          {
            id: 'authoring',
            label: 'Workshops anlegen',
            state: projection.has_workshops ? 'complete' : 'current',
            description: projection.has_workshops ? 'Workshopplan vorhanden' : 'Workshopplan vorbereiten',
          },
          {
            id: 'choice',
            label: 'Wahl öffnen',
            state: projection.has_workshops ? 'complete' : 'upcoming',
            description: projection.has_answers ? 'Antworten liegen vor' : 'Wünsche erfassen',
          },
          {
            id: 'review',
            label: 'Zuordnung prüfen',
            state: projection.has_answers ? 'current' : 'upcoming',
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
      <WorkshopAllocationStatus label={projection.has_answers ? 'Zuordnung prüfen' : 'Vorbereitung'}>
        {projection.has_answers
          ? 'Der Verlauf ist eine abgeleitete Vorschau. Prüfe offene Fälle und Konflikte vor dem Festlegen.'
          : 'Sobald Antworten vorliegen, zeigt der Verlauf die Zuordnung Schritt für Schritt.'}
      </WorkshopAllocationStatus>
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
          <WorkshopAllocationTraceContext
            projection={projection}
            group={group}
            selected_person_id={selectedPerson?.id}
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
          <WorkshopAllocationEmptyState
            projection={projection}
            has_answers={stages[0]?.open ? stages[0].open > 0 : false}
          >
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
