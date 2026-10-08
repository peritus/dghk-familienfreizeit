import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button.js'
import { SegmentedControl } from './segmented-control.js'
import { TertiaryNavigation } from './tertiary-navigation.js'
import { WorkflowStepper } from './workflow-stepper.js'
import { DataTable, ResponsiveCollection } from './data-table.js'
import { EmptyState, ErrorState, LoadingState } from './screen-state.js'
import { EntityPicker } from './entity-picker.js'
import { StatusNotice } from './notice.js'
import { PrintDocument } from './print-layout.js'
import { PropertyTags } from './property-tags.js'
import { ScreenHeader, ScreenLayout, CollectionSection } from './screen-layout.js'
import { StatsStrip } from './stats-strip.js'
import { Badge } from './badge.js'

const meta = {
  title: 'Shared/Patterns/Collections',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Semantic workshop composition pieces. These preserve the prototype hierarchy while keeping application state and domain calculations outside presentational components.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const WorkspaceChrome: Story = {
  render: function Render() {
    const [group, setGroup] = useState<'all' | 'kids' | 'adults'>('all')
    const [tab, setTab] = useState('overview')
    return (
      <ScreenLayout
        header={
          <ScreenHeader
            eyebrow="Workshops"
            title="Workshopübersicht"
            description="Anlegen, prüfen und den aktuellen Plan nachvollziehbar machen."
            action={<Button>Workshop hinzufügen</Button>}
          />
        }
        workflow={
          <>
            <WorkflowStepper
              aria_label="Ablauf der Workshopwahl"
              steps={[
                { id: 'create', label: 'Workshops anlegen', state: 'complete' },
                { id: 'choice', label: 'Wahl offen', state: 'current' },
                { id: 'review', label: 'Zuordnung prüfen', state: 'upcoming' },
                { id: 'fixed', label: 'Festgelegt', state: 'upcoming' },
              ]}
            />
            <StatusNotice label="Vorläufig" tone="attention">
              Die Berechnung ändert sich mit jeder Antwort und jeder Änderung.
            </StatusNotice>
          </>
        }
        summary={
          <StatsStrip
            items={[
              { value: 33, label: 'Workshops' },
              { value: 8, label: 'Slots' },
              { value: 10, label: 'Räume' },
            ]}
          />
        }
        tertiary_navigation={
          <TertiaryNavigation
            aria_label="Workshopbereiche"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'overview', label: 'Workshops' },
              { value: 'leaders', label: 'Leitungen' },
              { value: 'external', label: 'Extern' },
            ]}
          />
        }
      >
        <CollectionSection
          title="Gefilterte Übersicht"
          description="Kleine, sichtbare Auswahlgruppen bleiben vergleichbar."
          controls={
            <SegmentedControl
              label="Gruppe"
              value={group}
              onChange={setGroup}
              options={[
                { value: 'all', label: 'Alle' },
                { value: 'kids', label: 'Kinder' },
                { value: 'adults', label: 'Erwachsene' },
              ]}
            />
          }
        >
          <PropertyTags items={['Kinder', '5–14 Jahre', 'Zugewiesen']} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="attention">Nicht eingeplant</Badge>
            <Badge tone="success" variant="free">
              4 Plätze frei
            </Badge>
            <Badge tone="danger">Über Kapazität</Badge>
          </div>
        </CollectionSection>
      </ScreenLayout>
    )
  },
}

export const States: Story = {
  render: () => (
    <div className="grid gap-4 bg-background p-6">
      <LoadingState />
      <ErrorState onRetry={() => undefined} />
      <EmptyState title="Noch keine Workshops" action={<Button>Workshop hinzufügen</Button>}>
        Lege den ersten Workshop an. Programm und Teilnahme werden danach berechnet.
      </EmptyState>
      <EmptyState success>Alle Workshops sind eingeplant.</EmptyState>
    </div>
  ),
}

export const TableAndResponsiveCollection: Story = {
  render: () => {
    const rows = [
      { id: 'keramik', name: 'Keramik', status: '4 Plätze frei' },
      { id: 'wald', name: 'Waldexpedition', status: 'Voll' },
    ]
    const table = (
      <DataTable
        caption="Workshops"
        columns={[
          { key: 'name', label: 'Workshop' },
          { key: 'status', label: 'Status' },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
        renderRow={(row) => (
          <tr key={row.id} className="border-b border-border/30">
            <th scope="row" className="p-3">
              {row.name}
            </th>
            <td className="p-3">{row.status}</td>
          </tr>
        )}
      />
    )
    return (
      <div className="bg-background p-6">
        <ResponsiveCollection
          wide={table}
          narrow={
            <div className="grid gap-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-base border-2 border-border bg-secondary-background p-4"
                >
                  <strong>{row.name}</strong>
                  <p className="text-sm text-muted">{row.status}</p>
                </div>
              ))}
            </div>
          }
        />
      </div>
    )
  },
}

export const PickerAndPrint: Story = {
  render: function Render() {
    const [value, setValue] = useState('keramik')
    return (
      <div className="space-y-6 bg-background p-6">
        <EntityPicker
          label="Workshop"
          value={value}
          options={[
            { value: 'keramik', label: 'Keramik' },
            { value: 'wald', label: 'Waldexpedition' },
          ]}
          onChange={setValue}
          onPrevious={() => setValue('keramik')}
          onNext={() => setValue('wald')}
        />
        <PrintDocument
          title={value === 'keramik' ? 'Keramik' : 'Waldexpedition'}
          metadata={[
            'Freitag, 09:00–11:00 Uhr · Atelier',
            'Leitung: Sam Morgan',
            '8 Personen von 10 Plätzen',
          ]}
        >
          <p className="text-muted">
            Die eigentliche Tabelle wird als semantische Report-Komposition eingesetzt.
          </p>
        </PrintDocument>
      </div>
    )
  },
}
