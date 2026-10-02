import type { ReactNode } from 'react'
import {
  WorkshopDataTable,
  WorkshopResponsiveCollection,
  WorkshopStatsStrip,
  WorkshopStatusBadge,
} from '../../../../app/components/shared/workshop/shared.js'

export type ChoiceAnswerView = {
  id: string
  name: string
  age_label: string
  status: string
  status_tone?: 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'
  ranks: readonly string[]
}

export function ChoiceRankList({
  ranks,
  empty_label: emptyLabel = 'Keine Rangfolge abgegeben',
}: {
  ranks: readonly string[]
  empty_label?: string
}) {
  return ranks.length ? (
    <ol className="list-decimal space-y-1 pl-5">
      {ranks.map((rank, index) => (
        <li key={`${rank}-${index}`}>{rank}</li>
      ))}
    </ol>
  ) : (
    <span className="text-muted">{emptyLabel}</span>
  )
}

export function ChoiceAnswerRow({
  answer,
  on_open: onOpen,
}: {
  answer: ChoiceAnswerView
  on_open?: (answer: ChoiceAnswerView) => void
}) {
  return (
    <tr className="border-b border-black/30">
      <th scope="row" className="p-3">
        {onOpen ? (
          <button
            type="button"
            className="text-left font-bold underline decoration-black/25 underline-offset-4 hover:decoration-black"
            onClick={() => onOpen(answer)}
          >
            {answer.name}
            <span className="sr-only">: Wünsche verfolgen</span>
          </button>
        ) : (
          answer.name
        )}
      </th>
      <td className="p-3">{answer.age_label}</td>
      <td className="p-3">
        <WorkshopStatusBadge tone={answer.status_tone}>{answer.status}</WorkshopStatusBadge>
      </td>
      {[0, 1, 2, 3, 4].map((index) => (
        <td key={index} className="p-3">
          {answer.ranks[index] ?? <span className="text-muted">—</span>}
        </td>
      ))}
    </tr>
  )
}

export function ChoiceAnswerCard({
  answer,
  on_open: onOpen,
}: {
  answer: ChoiceAnswerView
  on_open?: (answer: ChoiceAnswerView) => void
}) {
  return (
    <li className="grid gap-2 rounded-base border-2 border-black bg-white p-4">
      <p>
        {onOpen ? (
          <button
            type="button"
            className="text-left font-bold underline decoration-black/25 underline-offset-4 hover:decoration-black"
            onClick={() => onOpen(answer)}
          >
            {answer.name}
            <span className="sr-only">: Wünsche verfolgen</span>
          </button>
        ) : (
          <strong>{answer.name}</strong>
        )}{' '}
        <span className="text-muted">· {answer.age_label}</span>
      </p>
      <WorkshopStatusBadge tone={answer.status_tone}>{answer.status}</WorkshopStatusBadge>
      <ChoiceRankList ranks={answer.ranks} />
    </li>
  )
}

export function ChoiceAnswersTable({
  answers,
  on_open: onOpen,
}: {
  answers: readonly ChoiceAnswerView[]
  on_open?: (answer: ChoiceAnswerView) => void
}) {
  const table = (
    <WorkshopDataTable
      caption="Antworten"
      columns={[
        { key: 'person', label: 'Person' },
        { key: 'age', label: 'Alter' },
        { key: 'status', label: 'Antwort' },
        ...[1, 2, 3, 4, 5].map((value) => ({ key: `rank-${value}`, label: `${value}. Wahl` })),
      ]}
      rows={answers}
      rowKey={(answer) => answer.id}
      renderRow={(answer) => (
        <ChoiceAnswerRow key={answer.id} answer={answer} on_open={onOpen} />
      )}
    />
  )
  return (
    <WorkshopResponsiveCollection
      wide={table}
      narrow={
        <ul className="grid gap-3">
          {answers.map((answer) => (
            <ChoiceAnswerCard key={answer.id} answer={answer} on_open={onOpen} />
          ))}
        </ul>
      }
    />
  )
}

export type WorkshopDemandView = {
  id: string
  title: string
  audience: string
  slot: string
  capacity: number
  first_choices: number
  ranked_count: number
  placement_label: string
}

export function DemandCapacityBar({
  capacity,
  first_choices: firstChoices,
  max_value: maxValue,
}: {
  capacity: number
  first_choices: number
  max_value: number
}) {
  const width = Math.max(maxValue, 1)
  return (
    <div
      aria-label={`${firstChoices} Erstwahlen bei ${capacity} Plätzen`}
      className="relative h-7 min-w-36 rounded-base border-2 border-black bg-white"
    >
      <span
        className="absolute inset-y-0 left-0 border-r-2 border-black bg-main"
        style={{ width: `${Math.min((capacity / width) * 100, 100)}%` }}
      />
      <span
        className="absolute inset-y-1 left-1 border-2 border-black"
        style={{ width: `${Math.min((firstChoices / width) * 100, 100)}%` }}
      />
    </div>
  )
}

export function WorkshopDemandRow({
  workshop,
  max_value: maxValue,
}: {
  workshop: WorkshopDemandView
  max_value: number
}) {
  return (
    <tr className="border-b border-black/30">
      <th scope="row" className="p-3">
        {workshop.title}
      </th>
      <td className="p-3">{workshop.audience}</td>
      <td className="p-3">{workshop.slot}</td>
      <td className="p-3 text-right">{workshop.capacity}</td>
      <td className="p-3 text-right">{workshop.first_choices}</td>
      <td className="p-3 text-right">{workshop.ranked_count}</td>
      <td className="p-3">
        <DemandCapacityBar
          capacity={workshop.capacity}
          first_choices={workshop.first_choices}
          max_value={maxValue}
        />
      </td>
    </tr>
  )
}

export function WorkshopDemandTable({ workshops }: { workshops: readonly WorkshopDemandView[] }) {
  const maxValue = Math.max(
    1,
    ...workshops.flatMap((workshop) => [workshop.capacity, workshop.first_choices]),
  )
  return (
    <WorkshopDataTable
      caption="Nachfrage pro Workshop"
      columns={[
        { key: 'workshop', label: 'Workshop' },
        { key: 'audience', label: 'Für' },
        { key: 'slot', label: 'Slot' },
        { key: 'capacity', label: 'Plätze', numeric: true },
        { key: 'first', label: 'als 1. Wahl', numeric: true },
        { key: 'ranked', label: 'in einer Rangfolge', numeric: true },
        { key: 'bar', label: '1. Wahlen und Plätze' },
      ]}
      rows={workshops}
      rowKey={(workshop) => workshop.id}
      renderRow={(workshop) => (
        <WorkshopDemandRow key={workshop.id} workshop={workshop} max_value={maxValue} />
      )}
    />
  )
}

export function WorkshopDemandCards({
  workshops,
}: {
  workshops: readonly WorkshopDemandView[]
}) {
  return (
    <ul className="grid gap-3">
      {workshops.map((workshop) => (
        <li key={workshop.id} className="rounded-base border-2 border-black bg-white p-4">
          <h3 className="text-xl font-heading">{workshop.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {workshop.audience} · {workshop.slot}
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted">Plätze</dt>
              <dd className="font-bold tabular-nums">{workshop.capacity}</dd>
            </div>
            <div>
              <dt className="text-muted">1. Wahl</dt>
              <dd className="font-bold tabular-nums">{workshop.first_choices}</dd>
            </div>
            <div>
              <dt className="text-muted">Rangfolge</dt>
              <dd className="font-bold tabular-nums">{workshop.ranked_count}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <DemandCapacityBar
              capacity={workshop.capacity}
              first_choices={workshop.first_choices}
              max_value={Math.max(workshop.capacity, workshop.first_choices, 1)}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export type TraceMode = 'all' | 'highlight' | 'only'

export function TraceControls({
  mode,
  onModeChange,
  selected_person: selectedPerson,
  onPersonChange,
  people,
}: {
  mode: TraceMode
  onModeChange: (mode: TraceMode) => void
  selected_person?: string
  onPersonChange?: (value: string) => void
  people?: readonly string[]
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-base border-2 border-black bg-white p-4">
      <fieldset className="flex flex-wrap gap-3">
        <legend className="sr-only">Darstellung</legend>
        {(
          [
            ['all', 'Alle Personen'],
            ['highlight', 'Person hervorheben'],
            ['only', 'Nur diese Person'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-2 font-bold">
            <input
              type="radio"
              name="trace-mode"
              value={value}
              checked={mode === value}
              onChange={() => onModeChange(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {people && onPersonChange ? (
        <label className="grid min-w-64 flex-1 gap-1 font-bold">
          Person suchen
          <input
            list="trace-people"
            value={selectedPerson ?? ''}
            onChange={(event) => onPersonChange(event.target.value)}
            className="min-h-11 rounded-base border-2 border-black px-3 font-normal"
          />
          <datalist id="trace-people">
            {people.map((person) => (
              <option key={person} value={person} />
            ))}
          </datalist>
        </label>
      ) : null}
    </div>
  )
}

export function TraceLegend({ items }: { items: readonly { label: string; tone?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm text-muted" aria-label="Legende">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <i
            aria-hidden="true"
            className={`inline-block size-3 rounded-sm border border-black ${item.tone ?? 'bg-white'}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export type TraceStageView = {
  id: string
  label: string
  description: string
  fulfilled: number
  capacity: number
  overlap: number
  leader: number
  unscheduled: number
  open: number
  details?: ReactNode
  selected_summary?: ReactNode
}

export function TraceProgressBar({ stage }: { stage: TraceStageView }) {
  const total = Math.max(
    stage.fulfilled +
      stage.capacity +
      stage.overlap +
      stage.leader +
      stage.unscheduled +
      stage.open,
    1,
  )
  const segments = [
    ['bg-main', stage.fulfilled],
    ['bg-danger', stage.capacity],
    ['bg-secondary-background', stage.overlap],
    ['bg-paper', stage.leader],
    ['bg-background', stage.unscheduled],
  ] as const
  return (
    <div className="flex h-7 overflow-hidden rounded-base border-2 border-black bg-white">
      {segments.map(([tone, value]) =>
        value ? (
          <span key={tone} className={tone} style={{ width: `${(value / total) * 100}%` }} />
        ) : null,
      )}
      {stage.open ? (
        <span className="bg-white" style={{ width: `${(stage.open / total) * 100}%` }} />
      ) : null}
    </div>
  )
}

export function TraceStageRow({
  stage,
  selected_person_label: selectedPersonLabel,
}: {
  stage: TraceStageView
  selected_person_label?: string
}) {
  return (
    <tr className="border-b border-black/30 align-top">
      <th scope="row" className="p-3">
        <span className="block font-heading">{stage.label}</span>
        <span className="text-sm font-normal text-muted">{stage.description}</span>
      </th>
      <td className="min-w-64 p-3">
        <TraceProgressBar stage={stage} />
        {stage.details ? <div className="mt-2 text-sm text-muted">{stage.details}</div> : null}
      </td>
      <td className="p-3 text-right">{stage.fulfilled}</td>
      <td className="p-3 text-right">{stage.capacity}</td>
      <td className="p-3 text-right">{stage.overlap}</td>
      <td className="p-3 text-right">{stage.leader}</td>
      <td className="p-3 text-right">{stage.unscheduled}</td>
      <td className="p-3 text-right font-bold">{stage.open}</td>
      {selectedPersonLabel ? (
        <td className="bg-paper p-3 text-sm">{stage.selected_summary ?? '—'}</td>
      ) : null}
    </tr>
  )
}

export function ChoiceTraceTable({
  stages,
  selected_person_label: selectedPersonLabel,
}: {
  stages: readonly TraceStageView[]
  selected_person_label?: string
}) {
  const table = (
    <WorkshopDataTable
      caption="Verlauf der Wünsche Schritt für Schritt"
      columns={[
        { key: 'stage', label: 'Schritt' },
        { key: 'bar', label: 'Verlauf aller Wünsche' },
        { key: 'fulfilled', label: 'erfüllt', numeric: true },
        { key: 'capacity', label: 'voll', numeric: true },
        { key: 'overlap', label: 'Überschneidung', numeric: true },
        { key: 'leader', label: 'leitet selbst', numeric: true },
        { key: 'unscheduled', label: 'ohne Termin', numeric: true },
        { key: 'open', label: 'noch offen', numeric: true },
        ...(selectedPersonLabel
          ? [{ key: 'selected', label: selectedPersonLabel }]
          : []),
      ]}
      rows={stages}
      rowKey={(stage) => stage.id}
      renderRow={(stage) => (
        <TraceStageRow
          key={stage.id}
          stage={stage}
          selected_person_label={selectedPersonLabel}
        />
      )}
    />
  )
  const cards = (
    <ul className="grid gap-3" aria-label="Verlauf der Wünsche">
      {stages.map((stage) => (
        <li key={stage.id} className="rounded-base border-2 border-black bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-heading">{stage.label}</h3>
            <span className="text-sm text-muted">{stage.description}</span>
          </div>
          <div className="mt-3">
            <TraceProgressBar stage={stage} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ['erfüllt', stage.fulfilled],
              ['voll', stage.capacity],
              ['Überschneidung', stage.overlap],
              ['leitet selbst', stage.leader],
              ['ohne Termin', stage.unscheduled],
              ['noch offen', stage.open],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {stage.details ? <p className="mt-3 text-sm text-muted">{stage.details}</p> : null}
          {selectedPersonLabel ? (
            <p className="mt-3 rounded-base border-2 border-black bg-paper p-2 text-sm">
              <strong>{selectedPersonLabel}:</strong> {stage.selected_summary ?? '—'}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
  return <WorkshopResponsiveCollection wide={table} narrow={cards} />
}

export function ChoiceSummary({
  items,
}: {
  items: readonly { value: string | number; label: string }[]
}) {
  return <WorkshopStatsStrip items={items} />
}
