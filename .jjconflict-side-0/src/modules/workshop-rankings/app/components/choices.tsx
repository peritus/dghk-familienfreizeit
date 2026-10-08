import { ChoiceField } from '../../../../app/components/shared/ui/field.js'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { DataTable, ResponsiveCollection } from '../../../../app/components/shared/ui/data-table.js'
import { StatsStrip } from '../../../../app/components/shared/ui/stats-strip.js'
import { Badge } from '../../../../app/components/shared/ui/badge.js'

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
    <tr className="border-b border-border/30">
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
        <Badge tone={answer.status_tone}>{answer.status}</Badge>
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
    <li className="grid gap-2 rounded-base border-2 border-border bg-secondary-background p-4">
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
      <Badge tone={answer.status_tone}>{answer.status}</Badge>
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
    <DataTable
      caption="Antworten"
      columns={[
        { key: 'person', label: 'Person' },
        { key: 'age', label: 'Alter' },
        { key: 'status', label: 'Antwort' },
        ...[1, 2, 3, 4, 5].map((value) => ({ key: `rank-${value}`, label: `${value}. Wahl` })),
      ]}
      rows={answers}
      rowKey={(answer) => answer.id}
      renderRow={(answer) => <ChoiceAnswerRow key={answer.id} answer={answer} on_open={onOpen} />}
    />
  )
  return (
    <ResponsiveCollection
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
      className="relative h-7 min-w-36 rounded-base border-2 border-border bg-secondary-background"
    >
      <span
        className="absolute inset-y-0 left-0 border-r-2 border-border bg-main"
        style={{ width: `${Math.min((capacity / width) * 100, 100)}%` }}
      />
      <span
        className="absolute inset-y-1 left-1 border-2 border-border"
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
    <tr className="border-b border-border/30">
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
    <DataTable
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

export function WorkshopDemandCards({ workshops }: { workshops: readonly WorkshopDemandView[] }) {
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
type TracePersonOption = { id: string; label: string }

function TracePersonSearch({
  selected_label: selectedLabel,
  selected_person_id: selectedPersonId,
  on_person_change: onPersonChange,
  people,
}: {
  selected_label?: string
  selected_person_id?: string
  on_person_change: (personId: string) => void
  people: readonly TracePersonOption[]
}) {
  const [text, setText] = useState(selectedLabel ?? '')
  const commit = (candidate: string) => {
    const match = people.find((person) => person.label === candidate.trim())
    if (match && match.id !== selectedPersonId) onPersonChange(match.id)
  }

  return (
    <label className="grid min-w-64 flex-1 gap-1 font-bold">
      Person suchen
      <input
        list="trace-people"
        type="search"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const inputType = (event.nativeEvent as InputEvent).inputType
          if (!inputType || inputType === 'insertReplacementText') commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value)
        }}
        onBlur={(event) => commit(event.currentTarget.value)}
        className="min-h-11 rounded-base border-2 border-border px-3 font-normal"
      />
      <datalist id="trace-people">
        {people.map((person) => (
          <option key={person.id} value={person.label} />
        ))}
      </datalist>
    </label>
  )
}

export function TraceControls({
  mode,
  onModeChange,
  selected_person_id: selectedPersonId,
  onPersonChange,
  people,
}: {
  mode: TraceMode
  onModeChange: (mode: TraceMode) => void
  selected_person_id?: string
  onPersonChange?: (personId: string) => void
  people?: readonly TracePersonOption[]
}) {
  const selectedPerson = people?.find((person) => person.id === selectedPersonId)

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-end gap-4 rounded-base border-2 border-border bg-background p-4 shadow-shadow"
      role="group"
      aria-label="Personen im Verlauf"
    >
      <fieldset className="flex flex-wrap gap-1 max-sm:flex-col" aria-label="Darstellung">
        <legend className="sr-only">Darstellung</legend>
        {(
          [
            ['all', 'Alle Personen'],
            ['highlight', 'Person hervorheben'],
            ['only', 'Nur diese Person'],
          ] as const
        ).map(([value, label]) => (
          <ChoiceField
            key={value}
            className="flex min-h-11 items-center gap-2 border-2 border-l-0 border-border bg-secondary-background px-3 font-bold first:rounded-l-base first:border-l-2 last:rounded-r-base max-sm:border-l-2 max-sm:border-t-0 max-sm:first:rounded-l-none max-sm:first:rounded-t-base max-sm:last:rounded-r-none max-sm:last:rounded-b-base has-[:checked]:bg-main"
            type="radio"
            name="trace-mode"
            value={value}
            checked={mode === value}
            onChange={() => onModeChange(value)}
            label={<>{label}</>}
          />
        ))}
      </fieldset>
      {mode !== 'all' && people && onPersonChange ? (
        <TracePersonSearch
          key={selectedPersonId ?? ''}
          selected_label={selectedPerson?.label}
          selected_person_id={selectedPersonId}
          on_person_change={onPersonChange}
          people={people}
        />
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
            className={`inline-block size-3 rounded-sm border border-border ${item.tone ?? 'bg-secondary-background'}`}
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
  phase?: string
  rank?: number | null
  eligibility?: number
  cancellation?: number
  unprocessed?: number
  not_needed?: number
  detail_items?: readonly string[]
  detail_groups?: readonly {
    id: string
    heading: string
    items: readonly {
      id: string
      person_id: string | null
      people: readonly { id: string; name: string }[]
      text: string
      bold_prefix?: string
      strike_people?: boolean
    }[]
  }[]
  details?: ReactNode
  selected_summary?: ReactNode
}

type TraceSegment = {
  id: string
  value: number
  label: string
  className?: string
  style?: CSSProperties
}

const rankColors: Record<number, string> = {
  1: 'hsl(33 100% 76%)',
  2: 'hsl(33 100% 83%)',
  3: 'hsl(33 100% 88%)',
  4: 'hsl(33 70% 94%)',
  5: 'hsl(33 60% 96%)',
}

function stageSegments(
  stage: TraceStageView,
  stageIndex: number,
  currentIndex: number | null,
  fulfilledOnly = false,
): TraceSegment[] {
  const segments: TraceSegment[] = []
  const state =
    currentIndex === null
      ? ''
      : stageIndex === currentIndex
        ? ' font-extrabold'
        : ' opacity-50 font-medium'
  const add = (
    id: string,
    value: number,
    label: string,
    className?: string,
    style?: CSSProperties,
  ) => {
    if (value > 0)
      segments.push({ id, value, label, className: `${className ?? ''}${state}`, style })
  }

  if (stage.fulfilled) {
    const rankColor = stage.rank ? rankColors[stage.rank] : undefined
    add(
      `${stage.id}-fulfilled`,
      stage.fulfilled,
      stage.rank ? `Wunsch ${stage.rank}` : 'erfüllt',
      rankColor ? 'border-r border-black/20' : 'bg-main',
      rankColor ? { ['backgroundColor']: rankColor } : undefined,
    )
  }
  if (fulfilledOnly) return segments

  add(`${stage.id}-capacity`, stage.capacity, 'voll', 'bg-danger', {
    ['backgroundImage']: 'repeating-linear-gradient(135deg, #fff 0 4px, #b9b3ab 4px 6px)',
  })
  add(`${stage.id}-overlap`, stage.overlap, 'Überschneidung', 'bg-secondary-background', {
    ['backgroundColor']: 'hsl(30 10% 74%)',
  })
  add(`${stage.id}-leader`, stage.leader, 'leitet selbst', 'bg-paper', {
    ['backgroundImage']: 'repeating-linear-gradient(90deg, #fff 0 4px, #8a847c 4px 6px)',
  })
  add(`${stage.id}-unscheduled`, stage.unscheduled, 'ohne Termin', 'bg-background', {
    ['backgroundImage']: 'radial-gradient(#6b645c 1px, transparent 1.4px)',
  })
  add(`${stage.id}-not-needed`, stage.not_needed ?? 0, 'Ziel erreicht', 'bg-paper', {
    ['backgroundImage']: 'repeating-linear-gradient(45deg, #fff 0 4px, #d2ccc4 4px 6px)',
  })
  return segments
}

export function TraceProgressBar({
  stages,
  index,
  current = true,
}: {
  stages: readonly TraceStageView[]
  index: number
  current?: boolean
}) {
  const stage = stages[index]
  const currentIndex = current ? index : null
  const segments = [
    ...stages
      .slice(0, index)
      .flatMap((visibleStage, visibleIndex) =>
        stageSegments(visibleStage, visibleIndex, currentIndex, true),
      ),
    ...(stage ? [stageSegments(stage, index, currentIndex)] : []),
  ].flat()
  if (stage?.open) {
    segments.push({
      id: `${stage.id}-open`,
      value: stage.open,
      label: 'noch offen',
      className: `bg-secondary-background${currentIndex === index ? ' cur' : ''}`,
      style: { ['backgroundColor']: '#fff' },
    })
  }
  const total = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1,
  )
  if (!segments.length) {
    return (
      <div
        className="flex h-10 w-full items-center justify-center overflow-hidden rounded-base border-2 border-border bg-white text-sm text-muted"
        role="img"
        aria-label={`${stage?.label ?? 'Verlauf'}: keine Wünsche`}
      >
        keine Wünsche
      </div>
    )
  }
  return (
    <div
      className="flex h-10 w-full items-stretch overflow-hidden rounded-base border-2 border-border bg-secondary-background"
      role="img"
      aria-label={`${stage?.label ?? 'Verlauf'}: ${segments.map((segment) => `${segment.value} ${segment.label}`).join(', ')}`}
    >
      {segments.map((segment) => (
        <span
          key={segment.id}
          className={`flex items-center justify-center text-center ${segment.className ?? ''}`}
          style={{ width: `${(segment.value / total) * 100}%`, ...segment.style }}
          title={`${segment.value} ${segment.label}`}
        >
          {segment.value / total >= 0.035 ? segment.value : null}
        </span>
      ))}
    </div>
  )
}

function TraceDetailItems({
  groups,
  on_person_id: onPersonId,
  selected_person_id: selectedPersonId,
}: {
  groups: readonly {
    id: string
    heading: string
    items: readonly {
      id: string
      person_id: string | null
      people: readonly { id: string; name: string }[]
      text: string
      bold_prefix?: string
      strike_people?: boolean
    }[]
  }[]
  on_person_id?: (personId: string) => void
  selected_person_id?: string
}) {
  const renderItem = (item: (typeof groups)[number]['items'][number]) => {
    const parts: ReactNode[] = []
    let cursor = 0
    const matches: {
      start: number
      end: number
      kind: 'prefix' | 'person'
      person?: { id: string; name: string }
    }[] = []
    if (item.bold_prefix) {
      const position = item.text.indexOf(item.bold_prefix)
      if (position >= 0) {
        matches.push({
          start: position,
          end: position + item.bold_prefix.length,
          kind: 'prefix',
        })
      }
    }
    let personCursor = 0
    item.people.forEach((person) => {
      const position = item.text.indexOf(person.name, personCursor)
      if (position < 0) return
      matches.push({
        start: position,
        end: position + person.name.length,
        kind: 'person',
        person,
      })
      personCursor = position + person.name.length
    })
    matches.sort((left, right) => left.start - right.start)
    matches.forEach((match, index) => {
      if (match.start < cursor) return
      parts.push(item.text.slice(cursor, match.start))
      if (match.kind === 'prefix') {
        parts.push(
          <strong key={`${item.id}-prefix-${index}`}>
            {item.text.slice(match.start, match.end)}
          </strong>,
        )
      } else if (match.person) {
        const selected = match.person.id === selectedPersonId
        const personContent = (
          <span
            className={
              selected
                ? 'rounded-sm bg-foreground px-1 text-background no-underline'
                : 'underline underline-offset-2'
            }
          >
            {match.person.name}
          </span>
        )
        const person = item.strike_people ? <s>{personContent}</s> : personContent
        parts.push(
          onPersonId ? (
            <button
              key={`${item.id}-${match.person.id}-${index}`}
              type="button"
              className="rounded-sm"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onPersonId(match.person!.id)}
            >
              {person}
            </button>
          ) : (
            <span key={`${item.id}-${match.person.id}-${index}`}>{person}</span>
          ),
        )
      }
      cursor = match.end
    })
    parts.push(item.text.slice(cursor))
    return parts
  }
  return (
    <ul className="space-y-1">
      {groups.flatMap((group) =>
        group.items.map((item) => <li key={`${group.id}-${item.id}`}>{renderItem(item)}</li>),
      )}
    </ul>
  )
}

export function TraceStageRow({
  stage,
  stages,
  index,
  show_detail_rows: showDetailRows,
  selected_person_label: selectedPersonLabel,
  on_person_id: onPersonId,
  selected_person_id: selectedPersonId,
}: {
  stage: TraceStageView
  stages: readonly TraceStageView[]
  index: number
  show_detail_rows: boolean
  selected_person_label?: string
  on_person_id?: (personId: string) => void
  selected_person_id?: string
}) {
  return (
    <>
      <tr className="border-b border-border/30 align-top">
        <th scope="row" className="w-52 min-w-52 p-3">
          <span className="block font-heading">{stage.label}</span>
          <span className="text-sm font-normal text-muted">{stage.description}</span>
        </th>
        <td className="min-w-[32rem] p-3">
          <TraceProgressBar stages={stages} index={index} current={stage.id !== 'result'} />
        </td>
        {selectedPersonLabel ? (
          <td className="bg-paper p-3 text-sm">{stage.selected_summary ?? '—'}</td>
        ) : null}
      </tr>
      {showDetailRows && stage.detail_groups?.length
        ? stage.detail_groups.map((group) => (
            <tr key={`${stage.id}-${group.id}`} className="border-b border-border/30 align-top">
              <th scope="row" className="w-52 min-w-52 p-3 pt-0 text-sm text-muted">
                {group.heading}
              </th>
              <td colSpan={1} className="p-3 pt-0 text-sm text-muted">
                <TraceDetailItems
                  groups={[group]}
                  on_person_id={onPersonId}
                  selected_person_id={selectedPersonId}
                />
              </td>
              {selectedPersonLabel ? <td className="bg-paper" aria-hidden="true" /> : null}
            </tr>
          ))
        : null}
    </>
  )
}

export function ChoiceTraceTable({
  stages,
  selected_person_label: selectedPersonLabel,
  show_detail_rows: showDetailRows = true,
  on_person_id: onPersonId,
  selected_person_id: selectedPersonId,
}: {
  stages: readonly TraceStageView[]
  selected_person_label?: string
  show_detail_rows?: boolean
  on_person_id?: (personId: string) => void
  selected_person_id?: string
}) {
  const table = (
    <DataTable
      caption="Verlauf der Wünsche Schritt für Schritt"
      columns={[
        { key: 'stage', label: 'Schritt' },
        { key: 'bar', label: 'Verlauf aller Wünsche' },
        ...(selectedPersonLabel ? [{ key: 'selected', label: selectedPersonLabel }] : []),
      ]}
      rows={stages}
      rowKey={(stage) => stage.id}
      renderRow={(stage) => (
        <TraceStageRow
          key={stage.id}
          stage={stage}
          stages={stages}
          index={stages.indexOf(stage)}
          show_detail_rows={showDetailRows}
          selected_person_label={selectedPersonLabel}
          on_person_id={onPersonId}
          selected_person_id={selectedPersonId}
        />
      )}
    />
  )
  const cards = (
    <ul className="grid gap-3" aria-label="Verlauf der Wünsche">
      {stages.map((stage, index) => (
        <li key={stage.id} className="rounded-base border-2 border-black bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-heading">{stage.label}</h3>
            <span className="text-sm text-muted">{stage.description}</span>
          </div>
          <div className="mt-3">
            <TraceProgressBar stages={stages} index={index} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ['erfüllt', stage.fulfilled],
              ['voll', stage.capacity],
              ['Überschneidung', stage.overlap],
              ['leitet selbst', stage.leader],
              ['ohne Termin', stage.unscheduled],
              ['Ziel erreicht', stage.not_needed ?? 0],
              ['noch offen', stage.open],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {stage.detail_groups?.length ? (
            <div className="mt-3 text-sm text-muted">
              <div className="space-y-3">
                {stage.detail_groups.map((group) => (
                  <section
                    key={group.id}
                    className="grid gap-x-6 sm:grid-cols-[minmax(11rem,13rem)_minmax(0,1fr)]"
                  >
                    <h4 className="text-sm font-bold">{group.heading}</h4>
                    <TraceDetailItems
                      groups={[group]}
                      on_person_id={onPersonId}
                      selected_person_id={selectedPersonId}
                    />
                  </section>
                ))}
              </div>
            </div>
          ) : null}
          {selectedPersonLabel ? (
            <p className="mt-3 rounded-base border-2 border-black bg-paper p-2 text-sm">
              <strong>{selectedPersonLabel}:</strong> {stage.selected_summary ?? '—'}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
  return <ResponsiveCollection wide={table} narrow={cards} />
}

export function ChoiceSummary({
  items,
}: {
  items: readonly { value: string | number; label: string }[]
}) {
  return <StatsStrip items={items} />
}
