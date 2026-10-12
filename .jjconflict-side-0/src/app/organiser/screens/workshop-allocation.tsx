import { AttentionNotices } from '../attention.js'
import { LoadingState } from '../../components/shared/ui/screen-state.js'
import { useMemo, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { activeProfile } from '../../../config/index.js'
import {
  fixedWorkshopAttendanceToken,
  officialWorkshopsWorld,
} from '../../../modules/official-workshops/index.js'
import { Button } from '../../components/shared/ui/button.js'
import { SelectField } from '../../components/shared/ui/field.js'
import { CollectionList, CollectionRow } from '../../components/shared/ui/collection-list.js'
import { AreaClosingActions, ClosedAreaDifferences } from '../components/area-closing.js'
import { workshopTrack } from '../../../modules/workshop-assignment/app/workshop-track.js'
import type { PhaseView } from '../../../derive/phases.js'
import { organiserPathWithQuery, organiserPaths } from '../../../organiser/routes.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import {
  ScreenHeader,
  SectionHeader,
  ScreenLayout,
} from '../../components/shared/ui/screen-layout.js'
import { FixedDecisionReview } from '../../components/shared/ui/fixed-decision-review.js'
import { personPickerOptions } from '../person-picker-options.js'
import { WorkshopNavigation } from './workshops.js'
import { useOrganiser } from '../context.js'
import type { EventDraft } from '../../../events/types.js'
import { workshopAssignmentSection } from '../../../modules/workshop-assignment/index.js'
import {
  ChoiceTraceTable,
  TraceControls,
  TraceLegend,
  type TraceMode,
  type TraceStageView,
} from '../../../modules/workshop-rankings/app/components/choices.js'
import {
  WorkshopAllocationAnswers,
  WorkshopAllocationDemand,
  WorkshopAllocationDemandSummary,
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

function assignmentLimit(): number {
  const module = activeProfile.modules.find((item) => item.id === 'workshop-assignment')
  return typeof module?.parameters?.workshops_per_person === 'number'
    ? module.parameters.workshops_per_person
    : 2
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
  return review && !review.readiness.ready ? 'Prüfung erforderlich' : 'Kursvergabe prüfen'
}

function setLabelDraft(
  actor: string,
  entityId: string,
  key: string,
  value: string,
  strength: 'required' | null,
): EventDraft {
  return {
    at: new Date().toISOString(),
    actor,
    subject: entityId,
    type: 'LabelSet',
    payload: { entity_id: entityId, key, value, strength, note: null },
  }
}

function clearLabelDraft(actor: string, entityId: string, key: string, value: string): EventDraft {
  return {
    at: new Date().toISOString(),
    actor,
    subject: entityId,
    type: 'LabelCleared',
    payload: { entity_id: entityId, key, value },
  }
}

export function WorkshopAllocation() {
  useDocumentTitle('Wünsche · Kurse · Familienfreizeit')
  // wouter's location is the pathname only; a traced person arrives in the query.
  const [location, navigate] = useLocation()
  const queryPersonId = new URLSearchParams(useSearch()).get('person')
  const { world, current_plan: currentPlan, phases, state, stage } = useOrganiser()
  const [group, setGroup] = useState<WorkshopAllocationGroup>('all')
  const [traceMode, setTraceMode] = useState<TraceMode>(queryPersonId ? 'highlight' : 'all')
  const [selectedPersonId, setSelectedPersonId] = useState(queryPersonId ?? '')
  const [fixedPersonId, setFixedPersonId] = useState('')
  const [fixedWorkshopId, setFixedWorkshopId] = useState('')
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

  if (!world || !projection)
    return (
      <ScreenLayout
        secondary_navigation={<WorkshopNavigation />}
        header={<ScreenHeader title="Wünsche" />}
      >
        <LoadingState />
      </ScreenLayout>
    )

  const view = allocationView(location)
  const workshopSummary = officialWorkshopsWorld(world)
  const activeWorkshops = workshopSummary.workshops
  const allWorkshops = [...workshopSummary.workshops, ...workshopSummary.cancelled]
  const assignment = currentPlan ? workshopAssignmentSection(currentPlan) : null
  const fixedPairs = assignment?.fixed ?? []
  const personNamesById = new Map(projection.person_names.map((person) => [person.id, person.name]))
  const workshopsById = new Map(allWorkshops.map((workshop) => [workshop.id, workshop]))
  const fixedKeys = new Set(fixedPairs.map((pair) => `${pair.person_id}|${pair.workshop_id}`))
  const answers = workshopAllocationPeople(projection, group)
  const demand = projection.demand_by_group?.[group] ?? projection.demand
  const hasGroupDemand = demand.some((workshop) => workshop.ranked_count > 0)
  const selectedPerson =
    projection.person_names.find((person) => person.id === queryPersonId) ??
    projection.person_names.find((person) => person.id === selectedPersonId)
  const personNames = projection.person_names
    .filter((person) => answers.some((answer) => answer.id === person.id))
    .map((person) => ({
      id: person.id,
      name: person.name,
      family_name: person.family_name ?? null,
    }))
  if (selectedPerson && !personNames.some((person) => person.id === selectedPerson.id))
    personNames.push({ ...selectedPerson, family_name: selectedPerson.family_name ?? null })
  const people = personPickerOptions(personNames)
  const stages = traceStages(projection, group, selectedPerson?.id, traceMode)
  const selectedLabel =
    traceMode === 'all'
      ? undefined
      : people.find((person) => person.id === selectedPerson?.id)?.label
  const activeSelectedPersonId = traceMode === 'all' ? undefined : selectedPerson?.id

  const setView = (next: string) => {
    const paths: Record<WorkshopAllocationView, string> = {
      answers: organiserPaths.workshop_allocation(),
      demand: organiserPaths.workshop_allocation_demand(),
      trace: organiserPaths.workshop_allocation_trace(),
    }
    void navigate(paths[next as WorkshopAllocationView] ?? paths.answers)
  }

  const selectTracePerson = (personId: string) => {
    setSelectedPersonId(personId)
    void navigate(
      `${organiserPaths.workshop_allocation_trace()}?person=${encodeURIComponent(personId)}`,
    )
  }

  const openTrace = (answer: { id: string }) => {
    const person = projection.person_names.find((item) => item.id === answer.id)
    if (traceMode === 'all') setTraceMode('highlight')
    if (person) selectTracePerson(person.id)
    else
      void navigate(
        `${organiserPaths.workshop_allocation_trace()}?person=${encodeURIComponent(answer.id)}`,
      )
  }

  return (
    <ScreenLayout
      secondary_navigation={<WorkshopNavigation />}
      header={
        <ScreenHeader
          eyebrow="Kurse · Wünsche"
          title="Wünsche"
          description="Was gewünscht wurde und wie die Kursplätze nach den abgegebenen Wunschlisten verteilt werden."
        />
      }
      notices={
        <>
          <AttentionNotices scope="allocation" />
          <ClosedAreaDifferences area="workshops" />
          <FixedDecisionReview
            items={projection.fixed_reviews ?? []}
            title="Feste Teilnahmen prüfen"
            description="Vergleicht feste Teilnahmen mit der Verteilung nach Wunschlisten ohne feste Vorgaben."
          />
        </>
      }
      workflow={
        <>
          <WorkflowStepper
            aria_label="Ablauf der Kurswahl"
            storage_key="workshops.allocation.expanded"
            storage_user={state.principal_email}
            steps={workshopTrack({
              phases: phases ?? [],
              active_workshop_count: officialWorkshopsWorld(world).workshops.length,
              meta: activeProfile.meta,
            })}
            next_action={
              phases?.some(
                ({ phase, status }) =>
                  phase === 'workshop-rankings.choice' && status !== 'upcoming',
              ) ? (
                <AreaClosingActions area="workshops" />
              ) : null
            }
          />
          <WorkshopAllocationStatus label={allocationStatusLabel(phases ?? [])}>
            {projection.has_answers
              ? 'Der Verlauf ist eine abgeleitete Vorschau. Prüfe offene Fälle und Konflikte.'
              : 'Sobald Antworten vorliegen, zeigt der Verlauf die Verteilung nach Wunschlisten Schritt für Schritt.'}
          </WorkshopAllocationStatus>
        </>
      }
      tertiary_navigation={
        <TertiaryNavigation
          aria_label="Wünsche"
          value={view}
          onChange={setView}
          controls={<WorkshopAllocationGroupFilter value={group} on_change={setGroup} />}
          items={[
            {
              value: 'answers',
              label: 'Antworten',
              link: <OrganiserLink href={organiserPaths.workshop_allocation()} />,
            },
            {
              value: 'demand',
              label: 'Nachfrage',
              link: <OrganiserLink href={organiserPaths.workshop_allocation_demand()} />,
            },
            {
              value: 'trace',
              label: 'Verlauf',
              link: <OrganiserLink href={organiserPaths.workshop_allocation_trace()} />,
            },
          ]}
        />
      }
    >
      <section className="space-y-4" aria-label="Feste Teilnahmen">
        <SectionHeader
          title="Feste Teilnahmen"
          description="Lege bei Bedarf eine Teilnahme fest. Sie bleibt trotz Alters-, Zielgruppen-, Kapazitäts-, Überschneidungs-, Leitungs- oder Teilnahmeartkonflikten bestehen; abgesagte und nicht terminierte Kurse werden mit einem Hinweis bei der Vergabe übersprungen."
        />
        <form
          className="grid gap-3 rounded-base border-2 border-border bg-secondary-background p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            if (!fixedPersonId || !fixedWorkshopId) return
            const token = fixedWorkshopAttendanceToken(fixedPersonId, fixedWorkshopId)
            stage([
              setLabelDraft(
                state.principal_email ?? 'organiser@example.test',
                fixedPersonId,
                'needs',
                token,
                'required',
              ),
              setLabelDraft(
                state.principal_email ?? 'organiser@example.test',
                fixedWorkshopId,
                'provides',
                token,
                null,
              ),
            ])
            setFixedPersonId('')
            setFixedWorkshopId('')
          }}
        >
          <SelectField
            label="Person"
            value={fixedPersonId}
            onChange={(event) => setFixedPersonId(event.currentTarget.value)}
            required
          >
            <option value="" disabled>
              Person auswählen
            </option>
            {projection.person_names.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Kurs"
            value={fixedWorkshopId}
            onChange={(event) => setFixedWorkshopId(event.currentTarget.value)}
            required
          >
            <option value="" disabled>
              Kurs auswählen
            </option>
            {activeWorkshops.map((workshop) => (
              <option key={workshop.id} value={workshop.id}>
                {workshop.title}
              </option>
            ))}
          </SelectField>
          <Button
            type="submit"
            disabled={
              !fixedPersonId ||
              !fixedWorkshopId ||
              fixedKeys.has(`${fixedPersonId}|${fixedWorkshopId}`)
            }
          >
            Teilnahme festlegen
          </Button>
        </form>
        {fixedPairs.length ? (
          <CollectionList>
            {fixedPairs.map(({ person_id: personId, workshop_id: workshopId }) => {
              const token = fixedWorkshopAttendanceToken(personId, workshopId)
              const actor = state.principal_email ?? 'organiser@example.test'
              const personName = personNamesById.get(personId) ?? 'Name nicht verfügbar'
              const workshopTitle = workshopsById.get(workshopId)?.title ?? 'Workshop ohne Titel'
              const workshopExists = world.entities_by_kind.workshop?.some(
                (workshop) => workshop.id === workshopId,
              )
              return (
                <CollectionRow
                  key={`${personId}|${workshopId}`}
                  action={
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      aria-label={`Feste Teilnahme von ${personName} an ${workshopTitle} entfernen`}
                      onClick={() =>
                        stage([
                          clearLabelDraft(actor, personId, 'needs', token),
                          ...(workshopExists
                            ? [clearLabelDraft(actor, workshopId, 'provides', token)]
                            : []),
                        ])
                      }
                    >
                      Entfernen
                    </Button>
                  }
                >
                  <strong>{personName}</strong>
                  <p className="mt-1 text-sm">
                    Fest: <strong>{workshopTitle}</strong>
                  </p>
                </CollectionRow>
              )
            })}
          </CollectionList>
        ) : (
          <p className="text-sm text-muted">Noch keine festen Teilnahmen.</p>
        )}
      </section>
      {view === 'answers' ? (
        <section className="space-y-5" aria-labelledby="allocation-answers-heading">
          <SectionHeader
            title="Antworten"
            description="Die abgegebenen Rangfolgen und die daraus berechnete Kursvergabe."
          />
          <WorkshopAllocationSummary answers={answers} projection={projection} />
          <WorkshopAllocationEmptyState projection={projection} has_answers={answers.length > 0}>
            {projection.has_workshops
              ? 'Sobald Personen eine Rangfolge abgegeben haben, erscheinen Antworten und Nachfrage hier.'
              : 'Lege zuerst Kurse an, damit Wünsche und Nachfrage berechnet werden können.'}
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
          <SectionHeader
            title="Nachfrage"
            description="Wünsche der gewählten Gruppe; Plätze und Termine werden je Kurs angezeigt."
          />
          <WorkshopAllocationDemandSummary demand={demand} />
          <p className="text-sm text-muted">
            Der Erstwunsch-Überhang zählt nur Kurse mit Termin. Kurswünsche ohne Termin werden
            separat gezählt.
          </p>
          <WorkshopAllocationEmptyState projection={projection} has_answers={hasGroupDemand} />
          {projection.has_workshops && hasGroupDemand ? (
            <div id="allocation-demand-heading">
              <WorkshopAllocationDemand demand={demand} />
            </div>
          ) : null}
        </section>
      ) : null}
      {view === 'trace' ? (
        <section className="space-y-5" aria-labelledby="allocation-trace-heading">
          <SectionHeader
            title="Was ist aus jedem Wunsch geworden?"
            description="Kennzahlen für die gewählte Gruppe. Eine Personenauswahl filtert nur den Verlauf."
          />
          <WorkshopAllocationSummary answers={answers} projection={projection} />
          <div
            role="note"
            className="rounded-base border-2 border-border bg-secondary-background px-4 py-3 text-sm"
          >
            <p className="font-semibold">
              Rangfolge: bis zu {rankingLimit()} Wünsche pro Person · automatische Vergabe:
              höchstens {assignmentLimit()} Kurse pro Person
            </p>
            <p className="mt-1 text-muted">
              Feste Teilnahmen zählen bei dieser Grenze mit. Sobald {assignmentLimit()} Zuordnungen
              erreicht sind, überspringt der Solver weitere Wünsche als „Ziel bereits erreicht“.
              Wegen Kursplätzen, Terminen, Teilnahmebedingungen und Überschneidungen kann eine
              Person weniger Kurse erhalten.
            </p>
          </div>
          <TraceControls
            mode={traceMode}
            onModeChange={(mode) => {
              setTraceMode(mode)
              if (mode !== 'all' && !selectedPerson && people[0]) {
                selectTracePerson(people[0].id)
              }
            }}
            selected_person_id={activeSelectedPersonId}
            onPersonChange={selectTracePerson}
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
                    Kursplan ansehen
                  </OrganiserLink>
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </ScreenLayout>
  )
}
