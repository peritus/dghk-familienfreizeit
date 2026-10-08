import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ChoiceAnswersTable,
  ChoiceSummary,
  ChoiceTraceTable,
  TraceControls,
  TraceLegend,
  WorkshopDemandTable,
} from './choices.js'
import {
  fullChoiceAnswers,
  fullDemandRows,
  fullTraceStages,
} from '../../../../app/stories/workshop-fixtures.js'

const meta = {
  title: 'Modules/workshop-rankings/Components/Choices',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Choice answers, demand, and trace compositions from the prototype. Counts and outcomes are supplied by the real solver projection later.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AnswersAndDemand: Story = {
  render: () => (
    <div className="grid gap-8 bg-background p-6">
      <ChoiceSummary
        items={[
          { value: 140, label: 'Personen' },
          { value: 92, label: 'mit Rangfolge' },
          { value: 14, label: 'Keine Antwort' },
        ]}
      />
      <ChoiceAnswersTable answers={fullChoiceAnswers} />
      <WorkshopDemandTable workshops={fullDemandRows} />
    </div>
  ),
}

export const Trace: Story = {
  render: function Render() {
    const [mode, setMode] = useState<'all' | 'highlight' | 'only'>('all')
    return (
      <div className="grid gap-5 bg-background p-6">
        <TraceControls
          mode={mode}
          onModeChange={setMode}
          selected_person_id="per_mara"
          onPersonChange={() => undefined}
          people={[
            { id: 'per_mara', label: 'Mara Schmidt' },
            { id: 'per_leni', label: 'Leni Schmidt' },
            { id: 'per_nika', label: 'Nika Weber' },
          ]}
        />
        <TraceLegend
          items={[
            { label: '1. Wahl erfüllt', tone: 'bg-main' },
            { label: 'voll', tone: 'bg-danger' },
            { label: 'Überschneidung', tone: 'bg-secondary-background' },
            { label: 'noch offen' },
          ]}
        />
        <ChoiceTraceTable stages={fullTraceStages} />
      </div>
    )
  },
}
