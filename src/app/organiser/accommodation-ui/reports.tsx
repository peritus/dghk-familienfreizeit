import { Button } from '../../components/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js'
import { Badge } from '../../components/ui/badge.js'
import { reportFixture } from './fixtures.js'
import {
  EmptyState,
  FindingCard,
  MetaLine,
  MetricsStrip,
  ScreenFrame,
  SectionHeading,
  StatusBadge,
} from './components.js'
import type { AssignmentReportView } from './types.js'

export function AssignmentReports({ view = reportFixture }: { view?: AssignmentReportView }) {
  return (
    <ScreenFrame
      eyebrow="Unterkunft · Bericht"
      title="Belegungsbericht"
      description="Eine druckfreundliche Übersicht über Zimmer, Platzierungen, offene Familien und die Hinweise des aktuellen Plans."
      actions={
        <Button variant="neutral" onClick={() => window.print()}>
          Drucken
        </Button>
      }
    >
      <div className="print:border-b-2 print:border-black print:pb-6">
        <MetaLine
          items={[
            { label: 'Erstellt', value: view.generated_at },
            { label: 'Ereignisstand', value: String(view.sequence) },
            { label: 'Geltungsbereich', value: 'Unterkunft' },
          ]}
        />
      </div>
      <MetricsStrip
        items={[
          { value: view.total_families, label: 'Familien' },
          { value: view.placed_families, label: 'Platziert' },
          { value: view.unplaced_families, label: 'Offen', tone: 'attention' },
          { value: view.rooms.length, label: 'Zimmer' },
        ]}
      />

      <section className="space-y-4">
        <SectionHeading
          title="Zimmerbelegung"
          detail="Belegung und Kapazität des aktuellen Vorschlags."
        />
        <div className="overflow-x-auto rounded-base border-2 border-black bg-white">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <caption className="sr-only">Zimmerbelegung</caption>
            <thead className="bg-black text-white">
              <tr>
                <th scope="col" className="p-3">
                  Zimmer
                </th>
                <th scope="col" className="p-3">
                  Belegung
                </th>
                <th scope="col" className="p-3">
                  Kapazität
                </th>
                <th scope="col" className="p-3">
                  Merkmale
                </th>
                <th scope="col" className="p-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black">
              {view.rooms.map((room) => (
                <tr key={room.room}>
                  <th scope="row" className="p-3">
                    <span className="font-bold">{room.room}</span>
                    <span className="block text-sm text-muted">{room.building}</span>
                  </th>
                  <td className="p-3">{room.occupants}</td>
                  <td className="p-3">{room.capacity}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {room.notes.map((note) => (
                        <Badge key={note}>{note}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={room.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Nicht platzierte Familien"
          detail="Diese Fälle brauchen eine Entscheidung, bevor die Unterkunft kommuniziert werden kann."
        />
        {view.unplaced.length === 0 ? (
          <EmptyState
            title="Alle Familien platziert"
            description="Der aktuelle Plan enthält keine offenen Platzierungen."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {view.unplaced.map((item) => (
              <Card key={item.family} className="bg-white">
                <CardHeader>
                  <CardTitle>{item.family}</CardTitle>
                  <p>{item.people}</p>
                </CardHeader>
                <CardContent>
                  <p className="border-l-4 border-danger pl-3">{item.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Hinweise"
          detail="Die vollständige Erklärung bleibt im Plan und auf dem Board verfügbar."
        />
        <div className="grid gap-3">
          {view.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </section>
    </ScreenFrame>
  )
}
