import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChoiceTraceTable, TraceControls, TraceLegend } from './choices.js'
import {
  WorkshopAllocationAnswers,
  WorkshopAllocationConflictNotice,
  WorkshopAllocationDemand,
  WorkshopAllocationEmptyState,
  WorkshopAllocationGroupFilter,
  WorkshopAllocationSummary,
} from './workshop-allocation.js'
import {
  fullChoiceAnswers,
  fullDemandRows,
  fullTraceStages,
} from '../../../../app/stories/workshop-fixtures.js'
import type {
  WorkshopAllocationAnswer,
  WorkshopAllocationProjection,
} from '../workshop-allocation-view.js'
import { LoadingState } from '../../../../app/components/shared/ui/screen-state.js'
import { PrintDocument } from '../../../../app/components/shared/ui/print-layout.js'

const answers: readonly WorkshopAllocationAnswer[] = fullChoiceAnswers.map((answer, index) => ({
  ...answer,
  status: answer.status as WorkshopAllocationAnswer['status'],
  group: index === 2 ? ('adults' as const) : ('children' as const),
}))

const projection: WorkshopAllocationProjection = {
  max_rank: 3,
  answers,
  participation: { slots: [], people: [] },
  demand: fullDemandRows,
  trace_events: [],
  trace_people: [],
  person_names: answers.map(({ id, name }) => ({ id, name })),
  unassigned_person_ids: ['noah'],
  fixed_violation_count: 0,
  unassigned_count: 1,
  has_workshops: true,
  has_answers: true,
}

const meta = {
  title: 'Modules/workshop-rankings/Components/WorkshopAllocation',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Organiser-facing workshop allocation compositions. The visible German labels follow the Wünsche views; all values are synthetic prototype fixtures.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Answers: Story = {
  render: function Render() {
    const [group, setGroup] = useState<'all' | 'children' | 'adults'>('all')
    const visible = answers.filter((answer) => group === 'all' || answer.group === group)
    return (
      <div className="min-h-screen space-y-6 bg-background p-6">
        <WorkshopAllocationGroupFilter value={group} on_change={setGroup} />
        <WorkshopAllocationSummary answers={visible} projection={projection} />
        <WorkshopAllocationAnswers answers={visible} />
      </div>
    )
  },
}

export const Demand: Story = {
  render: () => (
    <div className="min-h-screen bg-background p-6">
      <WorkshopAllocationDemand demand={fullDemandRows} />
    </div>
  ),
}

export const Trace: Story = {
  render: function Render() {
    const [mode, setMode] = useState<'all' | 'highlight' | 'only'>('all')
    const [person, setPerson] = useState('per_mara')
    return (
      <div className="min-h-screen space-y-5 bg-background p-6">
        <TraceControls
          mode={mode}
          onModeChange={setMode}
          selected_person_id={person}
          onPersonChange={setPerson}
          people={[
            { id: 'per_mara', label: 'Mara Schmidt' },
            { id: 'per_nika', label: 'Nika Weber' },
            { id: 'per_jule', label: 'Jule Bauer' },
            { id: 'per_toni', label: 'Toni Berger' },
          ]}
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
        <ChoiceTraceTable
          stages={fullTraceStages}
          selected_person_label={mode === 'all' ? undefined : person}
        />
      </div>
    )
  },
}

export const NarrowResponsive: Story = {
  render: () => (
    <div className="max-w-sm space-y-5 bg-background p-4">
      <WorkshopAllocationAnswers answers={answers} />
      <WorkshopAllocationDemand demand={fullDemandRows.slice(0, 3)} />
      <ChoiceTraceTable stages={fullTraceStages} />
    </div>
  ),
}

export const Empty: Story = {
  render: () => (
    <div className="max-w-2xl bg-background p-6">
      <WorkshopAllocationEmptyState
        projection={{
          ...projection,
          answers: [],
          demand: [],
          has_answers: false,
        }}
      />
    </div>
  ),
}

export const BlockedByConflicts: Story = {
  render: () => (
    <div className="max-w-2xl space-y-5 bg-background p-6">
      <WorkshopAllocationConflictNotice
        projection={{ ...projection, fixed_violation_count: 2, unassigned_count: 3 }}
      />
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div className="max-w-2xl bg-background p-6">
      <LoadingState message="Wünsche werden berechnet" />
    </div>
  ),
}

export const Print: Story = {
  render: () => (
    <div className="bg-background p-6">
      <PrintDocument
        title="Wünsche · Antworten"
        metadata={['Familienfreizeit · 14. Mai', 'Abgeleitete Vorschau']}
      >
        <WorkshopAllocationAnswers answers={answers} />
      </PrintDocument>
    </div>
  ),
}
