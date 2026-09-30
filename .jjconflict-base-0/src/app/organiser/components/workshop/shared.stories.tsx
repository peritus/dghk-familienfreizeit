import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../components/ui/button.js'
import {
  WorkshopDataTable,
  WorkshopEmptyState,
  WorkshopErrorState,
  WorkshopGroupFilter,
  WorkshopLifecycleTimeline,
  WorkshopListPicker,
  WorkshopLoadingState,
  WorkshopPhaseNotice,
  WorkshopPrintDocument,
  WorkshopPropertyTags,
  WorkshopResponsiveCollection,
  WorkshopScreenHeader,
  WorkshopSectionHeader,
  WorkshopSectionTabs,
  WorkshopStatsStrip,
  WorkshopStatusBadge,
} from './shared.js'

const meta = {
  title: 'Components/Organiser/Workshop/Shared',
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
      <div className="min-h-screen space-y-8 bg-background p-6">
        <WorkshopScreenHeader
          eyebrow="Workshops"
          title="Workshopübersicht"
          description="Anlegen, prüfen und den aktuellen Plan nachvollziehbar machen."
          action={<Button>Workshop hinzufügen</Button>}
        />
        <WorkshopLifecycleTimeline
          steps={[
            { id: 'create', label: 'Workshops anlegen', state: 'complete' },
            { id: 'choice', label: 'Wahl offen', state: 'current' },
            { id: 'review', label: 'Zuordnung prüfen', state: 'upcoming' },
            { id: 'fixed', label: 'Festgelegt', state: 'upcoming' },
          ]}
          next_action={
            <>
              <span className="flex-1">Familien können ihre Rangfolge abgeben.</span>
              <Button size="sm">Wahl schließen</Button>
            </>
          }
        />
        <WorkshopPhaseNotice label="Vorläufig" tone="attention">
          Die Berechnung ändert sich mit jeder Antwort und jeder Änderung.
        </WorkshopPhaseNotice>
        <WorkshopSectionTabs
          label="Workshopbereiche"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Workshops' },
            { value: 'leaders', label: 'Leitungen' },
            { value: 'external', label: 'Extern' },
          ]}
        />
        <WorkshopSectionHeader
          title="Gefilterte Übersicht"
          description="Kleine, sichtbare Auswahlgruppen bleiben vergleichbar."
        />
        <WorkshopGroupFilter value={group} onChange={setGroup} />
        <WorkshopPropertyTags items={['Kinder', '5–14 Jahre', 'Zugewiesen']} />
        <div className="flex flex-wrap gap-2">
          <WorkshopStatusBadge tone="attention">Nicht eingeplant</WorkshopStatusBadge>
          <WorkshopStatusBadge tone="success" variant="free">
            4 Plätze frei
          </WorkshopStatusBadge>
          <WorkshopStatusBadge tone="danger">Über Kapazität</WorkshopStatusBadge>
        </div>
        <WorkshopStatsStrip
          items={[
            { value: 33, label: 'Workshops' },
            { value: 8, label: 'Slots' },
            { value: 10, label: 'Räume' },
          ]}
        />
      </div>
    )
  },
}

export const States: Story = {
  render: () => (
    <div className="grid gap-4 bg-background p-6">
      <WorkshopLoadingState />
      <WorkshopErrorState onRetry={() => undefined} />
      <WorkshopEmptyState
        title="Noch keine Workshops"
        action={<Button>Workshop hinzufügen</Button>}
      >
        Lege den ersten Workshop an. Programm und Teilnahme werden danach berechnet.
      </WorkshopEmptyState>
      <WorkshopEmptyState success>Alle Workshops sind eingeplant.</WorkshopEmptyState>
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
      <WorkshopDataTable
        caption="Workshops"
        columns={[
          { key: 'name', label: 'Workshop' },
          { key: 'status', label: 'Status' },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
        renderRow={(row) => (
          <tr key={row.id} className="border-b border-black/30">
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
        <WorkshopResponsiveCollection
          wide={table}
          narrow={
            <div className="grid gap-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-base border-2 border-black bg-white p-4">
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
        <WorkshopListPicker
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
        <WorkshopPrintDocument
          kind="Teilnahmeliste"
          title={value === 'keramik' ? 'Keramik' : 'Waldexpedition'}
          metadata={[
            'Freitag, 09:00–11:00 Uhr · Atelier',
            'Leitung: Sam Morgan',
            '8 Personen von 10 Plätzen',
          ]}
          status="Vorläufig, nicht endgültig"
          confidential
        >
          <p className="text-muted">
            Die eigentliche Tabelle wird als semantische Report-Komposition eingesetzt.
          </p>
        </WorkshopPrintDocument>
      </div>
    )
  },
}
