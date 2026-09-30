import { useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog.js'
import { Badge } from '../../components/ui/badge.js'
import { Button } from '../../components/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js'
import { Tabs } from '../../components/ui/tabs.js'
import { decisionFixture } from './fixtures.js'
import { FindingCard, ScreenFrame, SectionHeading } from './components.js'
import type { DecisionScreenView } from './types.js'

export function OrganiserDecisions({ view = decisionFixture }: { view?: DecisionScreenView }) {
  const [filter, setFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [clearId, setClearId] = useState<string | null>(null)
  const filtered = useMemo(
    () => view.findings.filter((finding) => filter === 'all' || finding.severity === filter),
    [filter, view.findings],
  )

  return (
    <ScreenFrame
      eyebrow="Unterkunft · Entscheidungen"
      title="Entscheidungen des Organisationsteams"
      description="Prüfe aktive Anforderungen, trenne Familien bewusst und halte fest, warum eine manuelle Entscheidung nötig ist."
      actions={<Button onClick={() => setAddOpen(true)}>Entscheidung hinzufügen</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-white p-5">
          <p className="text-3xl">{view.decisions.length}</p>
          <p className="font-bold">Aktive Entscheidungen</p>
        </Card>
        <Card className="bg-white p-5">
          <p className="text-3xl">{view.findings.length}</p>
          <p className="font-bold">Offene Hinweise</p>
        </Card>
        <Card className="bg-white p-5">
          <p className="text-3xl">
            {view.decisions.filter((decision) => decision.strength === 'required').length}
          </p>
          <p className="font-bold">Harte Regeln</p>
        </Card>
      </div>

      <section className="space-y-4">
        <SectionHeading
          title="Resolver-Funde"
          detail="Regeln bleiben fest; Werte und Entscheidungen sind prüfbar."
        />
        <Tabs
          label="Hinweise filtern"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Alle', count: view.findings.length },
            {
              value: 'error',
              label: 'Fehler',
              count: view.findings.filter((item) => item.severity === 'error').length,
            },
            {
              value: 'warning',
              label: 'Warnungen',
              count: view.findings.filter((item) => item.severity === 'warning').length,
            },
          ]}
        />
        <div className="grid gap-3">
          {filtered.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Aktive Entscheidungen"
          detail="Notiz, Autor und Zeitpunkt bleiben am Label sichtbar."
        />
        {view.decisions.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-6">
              <p>Noch keine Entscheidungen. Beginne mit einer neuen Entscheidung.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {view.decisions.map((decision) => (
              <Card key={decision.id} className="bg-white">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{decision.holder}</CardTitle>
                    <Badge tone={decision.strength === 'required' ? 'attention' : 'neutral'}>
                      {decision.strength === 'required' ? 'Erforderlich' : 'Bevorzugt'}
                    </Badge>
                  </div>
                  <p className="text-lg">
                    {decision.direction} = <span className="font-bold">{decision.value}</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {decision.note ? (
                    <p className="border-l-4 border-black pl-3">{decision.note}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-4 text-sm text-muted">
                    <span>
                      {decision.author} · {decision.recorded_at}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="neutral" size="sm">
                        Inspect
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setClearId(decision.id)}>
                        Entscheidung löschen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {addOpen ? <DecisionDialog onClose={() => setAddOpen(false)} /> : null}
      {clearId ? (
        <AlertDialog open onOpenChange={(open) => !open && setClearId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Entscheidung löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Die ausgewählte Entscheidung wird aus der aktuellen Organisationsansicht entfernt.
                Die übrigen Entscheidungen bleiben unverändert.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setClearId(null)}>Behalten</AlertDialogCancel>
              <AlertDialogAction onClick={() => setClearId(null)}>Ja, löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </ScreenFrame>
  )
}

function DecisionDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-dialog-title"
    >
      <div className="w-full max-w-2xl rounded-base border-2 border-black bg-white p-6 shadow-shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-muted">
              Neue Entscheidung
            </p>
            <h2 id="decision-dialog-title" className="mt-1 text-2xl">
              Resolver-Wert hinzufügen
            </h2>
          </div>
          <Button variant="neutral" size="icon-sm" onClick={onClose} aria-label="Dialog schließen">
            ×
          </Button>
        </div>
        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onClose()
          }}
        >
          <label className="grid gap-1 font-bold">
            Betroffene Entität
            <input
              className="min-h-11 rounded-base border-2 border-black bg-white px-3 font-normal"
              defaultValue="Familie Seidel"
            />
          </label>
          <label className="grid gap-1 font-bold">
            Mechanismus
            <select
              className="min-h-11 rounded-base border-2 border-black bg-white px-3 font-normal"
              defaultValue="needs"
            >
              <option value="needs">needs / provides</option>
              <option value="separates">separates-from</option>
            </select>
          </label>
          <label className="grid gap-1 font-bold">
            Wert
            <input
              className="min-h-11 rounded-base border-2 border-black bg-white px-3 font-normal"
              placeholder="z. B. ruhiger-flur"
            />
          </label>
          <label className="grid gap-1 font-bold">
            Zusätzliche Informationen <span className="font-normal text-muted">(optional)</span>
            <textarea className="min-h-24 rounded-base border-2 border-black bg-white px-3 py-2 font-normal" />
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t-2 border-black pt-4">
            <Button type="button" variant="neutral" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">Entscheidung hinzufügen</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
