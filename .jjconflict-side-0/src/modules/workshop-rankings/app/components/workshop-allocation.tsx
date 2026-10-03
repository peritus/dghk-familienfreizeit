import type { ReactNode } from 'react'
import { SegmentedControl } from '../../../../app/components/shared/ui/segmented-control.js'
import {
  WorkshopEmptyState,
  WorkshopPhaseNotice,
  WorkshopResponsiveCollection,
  WorkshopStatsStrip,
  WorkshopStatusBadge,
} from '../../../../app/components/shared/workshop/shared.js'
import {
  ChoiceAnswersTable,
  WorkshopDemandCards,
  WorkshopDemandTable,
  type ChoiceAnswerView,
  type WorkshopDemandView,
} from './choices.js'
import type {
  WorkshopAllocationAnswer,
  WorkshopAllocationDemand,
  WorkshopAllocationGroup,
  WorkshopAllocationProjection,
} from '../workshop-allocation-view.js'

export function WorkshopAllocationGroupFilter({
  value,
  on_change: onChange,
}: {
  value: WorkshopAllocationGroup
  on_change: (value: WorkshopAllocationGroup) => void
}) {
  return (
    <SegmentedControl
      label="Gruppe"
      value={value}
      onChange={onChange}
      options={[
        { value: 'all', label: 'Alle' },
        { value: 'children', label: 'Kinder' },
        { value: 'adults', label: 'Erwachsene' },
      ]}
    />
  )
}

export function WorkshopAllocationSummary({
  answers,
  projection,
}: {
  answers: readonly WorkshopAllocationAnswer[]
  projection: WorkshopAllocationProjection
}) {
  const ranked = answers.filter((answer) => answer.status === 'Rangfolge').length
  const noPreference = answers.filter((answer) => answer.status === 'Keine Präferenz').length
  const noAnswer = answers.filter((answer) => answer.status === 'Keine Antwort').length
  const answerIds = new Set(answers.map((answer) => answer.id))
  const unassigned = projection.unassigned_person_ids.filter((id) => answerIds.has(id)).length
  return (
    <WorkshopStatsStrip
      items={[
        { value: answers.length, label: 'Personen' },
        { value: ranked, label: 'mit Rangfolge' },
        { value: noPreference, label: 'Keine Präferenz' },
        { value: noAnswer, label: 'Keine Antwort', tone: noAnswer ? 'attention' : undefined },
        {
          value: unassigned,
          label: 'ohne Zuordnung',
          tone: unassigned ? 'attention' : undefined,
        },
      ]}
    />
  )
}

export function WorkshopAllocationAnswers({
  answers,
  on_person: onPerson,
}: {
  answers: readonly WorkshopAllocationAnswer[]
  on_person?: (answer: WorkshopAllocationAnswer) => void
}) {
  return (
    <ChoiceAnswersTable
      answers={answers as readonly ChoiceAnswerView[]}
      on_open={onPerson as ((answer: ChoiceAnswerView) => void) | undefined}
    />
  )
}

export function WorkshopAllocationDemand({
  demand,
}: {
  demand: readonly WorkshopAllocationDemand[]
}) {
  const table = <WorkshopDemandTable workshops={demand as readonly WorkshopDemandView[]} />
  const cards = <WorkshopDemandCards workshops={demand as readonly WorkshopDemandView[]} />
  return <WorkshopResponsiveCollection wide={table} narrow={cards} />
}

export function WorkshopAllocationConflictNotice({
  projection,
}: {
  projection: WorkshopAllocationProjection
}) {
  if (!projection.fixed_violation_count && !projection.unassigned_count) return null
  return (
    <WorkshopPhaseNotice
      label="Prüfung nötig"
      tone="attention"
      details="Die Zuordnung bleibt eine abgeleitete Vorschau. Prüfe die markierten Fälle vor dem Festlegen."
    >
      {projection.fixed_violation_count
        ? `${projection.fixed_violation_count} feste Entscheidung${projection.fixed_violation_count === 1 ? '' : 'en'} konnte${projection.fixed_violation_count === 1 ? '' : 'n'} nicht erfüllt werden.`
        : `${projection.unassigned_count} Person${projection.unassigned_count === 1 ? '' : 'en'} bleiben ohne Zuordnung.`}
    </WorkshopPhaseNotice>
  )
}

export function WorkshopAllocationEmptyState({
  projection,
  has_answers: hasAnswersOverride,
  children,
}: {
  projection: WorkshopAllocationProjection
  has_answers?: boolean
  children?: ReactNode
}) {
  const hasAnswers = hasAnswersOverride ?? projection.has_answers
  if (projection.has_workshops && hasAnswers) return null
  return (
    <WorkshopEmptyState
      title={projection.has_workshops ? 'Noch keine Wünsche' : 'Noch keine Workshops'}
    >
      {children ??
        (projection.has_workshops
          ? 'Sobald Personen eine Rangfolge abgegeben haben, erscheinen Antworten und Nachfrage hier.'
          : 'Lege zuerst Workshops an, damit Wünsche und Nachfrage berechnet werden können.')}
    </WorkshopEmptyState>
  )
}

export function WorkshopAllocationStatus({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <WorkshopPhaseNotice label={label}>
      <WorkshopStatusBadge tone="neutral">Abgeleitet</WorkshopStatusBadge> {children}
    </WorkshopPhaseNotice>
  )
}
