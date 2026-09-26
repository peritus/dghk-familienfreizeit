import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge.js'
import { Button } from '../../components/ui/button.js'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.js'
import { Tabs } from '../../components/ui/tabs.js'
import { planDiffFixture, planFixture } from './fixtures.js'
import { ComparisonTable, EmptyState, FindingCard, MetaLine, ScreenFrame, SectionHeading, StatusBadge } from './components.js'
import type { PlanDiffView, PlanView } from './types.js'

export function PlanInspection({
  view = planFixture,
}: {
  view?: PlanView
}) {
  return (
    <ScreenFrame
      eyebrow="Unterkunft · Pläne"
      title="Belegungsplan prüfen"
      description="Der Plan ist eine abgeleitete Momentaufnahme. Prüfe Belegungen und Erklärungen, bevor du eine Änderung kommunizierst."
      actions={<Button variant="neutral">Zur Kommunikation</Button>}
    >
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-2xl">{view.summary.label}</CardTitle>
            <StatusBadge status={view.summary.status} />
          </div>
          <p>{view.summary.summary}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <MetaLine items={[{ label: 'Ereignisstand', value: String(view.summary.sequence) }, { label: 'Erstellt', value: view.summary.createdAt }, { label: 'Belegung', value: `${view.summary.placements} platziert · ${view.summary.unplaced} offen` }]} />
          <div className="flex flex-wrap gap-2">
            <Button>Plan vergleichen</Button>
            <Button variant="neutral">Bericht öffnen</Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <SectionHeading title="Planbefunde" detail="Jeder Hinweis führt zu einer konkreten Prüfung." />
        <div className="grid gap-3">{view.findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>
      </section>

      <section className="space-y-4">
        <SectionHeading title="Erklärungen" detail="Die Entscheidungskette bleibt pro Familie lesbar." />
        <div className="grid gap-3">
          {view.traces.map((trace, index) => (
            <Card key={`${trace.subject}-${index}`} className="bg-white">
              <CardContent className="space-y-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">{trace.subject}</p><Badge>{trace.step}</Badge></div>
                <p>{trace.text}</p>
                {trace.terms ? <p className="text-sm text-muted">{trace.terms.map((term) => `${term.label} ${term.value > 0 ? '+' : ''}${term.value}`).join(' · ')}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </ScreenFrame>
  )
}

export function PlanComparison({
  view = planDiffFixture,
}: {
  view?: PlanDiffView
}) {
  const [filter, setFilter] = useState('all')
  const changes = useMemo(() => view.changes.filter((change) => filter === 'all' || change.kind === filter), [filter, view.changes])

  return (
    <ScreenFrame
      eyebrow="Unterkunft · Vergleich"
      title="Was hat sich bewegt?"
      description="Vergleiche zwei abgeleitete Pläne und sieh pro Familie, was sich verändert hat und welche Regel dafür ausschlaggebend war."
      actions={<Button variant="neutral">Zurück zu den Plänen</Button>}
    >
      {view.unavailableReason ? <EmptyState title="Vergleich nicht verfügbar" description={view.unavailableReason} action={<Button>Neue Prüfung starten</Button>} /> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PlanHeader plan={view.before} label="Ausgangsplan" />
            <PlanHeader plan={view.after} label="Aktueller Plan" />
          </div>
          <Tabs
            label="Änderungen filtern"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'Alle', count: view.changes.length }, { value: 'moved', label: 'Verschoben', count: view.changes.filter((item) => item.kind === 'moved').length }, { value: 'unplaced', label: 'Offen', count: view.changes.filter((item) => item.kind === 'unplaced').length }, { value: 'unchanged', label: 'Unverändert', count: view.changes.filter((item) => item.kind === 'unchanged').length }]}
          />
          <section className="space-y-4" aria-labelledby="change-list-title">
            <SectionHeading title="Familienänderungen" detail={`${changes.length} Ergebnisse`} />
            <div className="grid gap-3">
              {changes.map((change) => (
                <Card key={change.id} className="bg-white">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div><CardTitle className="text-xl">{change.family}</CardTitle><p className="text-sm text-muted">{change.people}</p></div>
                      <Badge tone={change.kind === 'unchanged' ? 'neutral' : change.kind === 'unplaced' ? 'danger' : 'attention'}>{change.kind === 'unchanged' ? 'Unverändert' : change.kind === 'unplaced' ? 'Nicht platziert' : 'Verschoben'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ComparisonTable rows={[{ label: 'Zimmer', before: change.before ?? '—', after: change.after ?? '—', kind: change.kind === 'unchanged' ? undefined : 'changed' }]} caption={`${change.family} Änderung`} />
                    <p><span className="font-bold">Warum:</span> {change.reason}</p>
                    {change.detail ? <p className="text-sm text-muted">{change.detail}</p> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </ScreenFrame>
  )
}

function PlanHeader({ plan, label }: { plan: PlanDiffView['before']; label: string }) {
  return (
    <Card className="bg-white">
      <CardHeader><p className="text-sm font-bold uppercase tracking-wide text-muted">{label}</p><CardTitle className="text-xl">{plan.label}</CardTitle></CardHeader>
      <CardContent className="space-y-3"><StatusBadge status={plan.status} /><MetaLine items={[{ label: 'Stand', value: String(plan.sequence) }, { label: 'Belegung', value: `${plan.placements} Familien` }, { label: 'Offen', value: String(plan.unplaced) }]} /></CardContent>
    </Card>
  )
}

