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

const meta = {
  title: 'Components/Organiser/Workshop/Choices',
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
      <ChoiceAnswersTable
        answers={[
          {
            id: 'alex',
            name: 'Alex Morgan',
            age_label: '9 Jahre',
            status: 'Rangfolge',
            ranks: ['Keramik', 'Zirkus', 'Kletterwand', 'Waldexpedition', 'Musik'],
          },
          {
            id: 'lena',
            name: 'Lena Bauer',
            age_label: '4 Jahre',
            status: 'Keine Antwort',
            status_tone: 'attention',
            ranks: [],
          },
        ]}
      />
      <WorkshopDemandTable
        workshops={[
          {
            id: 'keramik',
            title: 'Keramik',
            audience: 'Kinder',
            slot: 'Fr 09:00–11:00',
            capacity: 10,
            first_choices: 14,
            ranked_count: 38,
            placement_label: 'geplant',
          },
          {
            id: 'wald',
            title: 'Waldexpedition',
            audience: 'Kinder',
            slot: 'Fr 11:30–13:30',
            capacity: 14,
            first_choices: 8,
            ranked_count: 25,
            placement_label: 'geplant',
          },
        ]}
      />
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
          selected_person="Alex Morgan"
          onPersonChange={() => undefined}
          people={['Alex Morgan', 'Jamie Morgan', 'Mira Stein']}
        />
        <TraceLegend
          items={[
            { label: '1. Wahl erfüllt', tone: 'bg-main' },
            { label: 'voll', tone: 'bg-danger' },
            { label: 'Überschneidung', tone: 'bg-secondary-background' },
            { label: 'noch offen' },
          ]}
        />
        <ChoiceTraceTable
          stages={[
            {
              id: 'answers',
              label: 'Wünsche abgegeben',
              description: 'von 92 Personen',
              fulfilled: 0,
              capacity: 0,
              overlap: 0,
              leader: 0,
              unscheduled: 0,
              open: 320,
            },
            {
              id: 'round-1',
              label: 'Runde 1',
              description: 'Erstwünsche',
              fulfilled: 62,
              capacity: 8,
              overlap: 4,
              leader: 2,
              unscheduled: 0,
              open: 244,
              details: 'Keramik: 14 Erstwahlen, 10 Plätze',
            },
            {
              id: 'round-2',
              label: 'Runde 2',
              description: 'Zweitwünsche',
              fulfilled: 18,
              capacity: 3,
              overlap: 2,
              leader: 1,
              unscheduled: 0,
              open: 220,
            },
          ]}
        />
      </div>
    )
  },
}
