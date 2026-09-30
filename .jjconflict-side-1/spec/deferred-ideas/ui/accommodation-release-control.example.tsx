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
import {
  releaseScopesFixture,
  communicationReviewFixture,
  communicationHistoryFixture,
} from './fixtures.js'
import { ComparisonTable, EmptyState, FindingCard, MetaLine, ScreenFrame } from './components.js'
import type { CommunicationReviewView, ReleaseScopeView } from './types.js'

const statusCopy = {
  communicated: { label: 'Kommuniziert', tone: 'success' as const },
  changed: { label: 'Geändert', tone: 'attention' as const },
  'never-communicated': { label: 'Noch nicht kommuniziert', tone: 'held' as const },
}

export function ReleaseControl({
  scopes = releaseScopesFixture,
  onReview,
}: {
  scopes?: readonly ReleaseScopeView[]
  onReview?: (scopeIds: readonly string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  return (
    <ScreenFrame
      eyebrow="Unterkunft · Kommunikation"
      title="Was sehen Familien bereits?"
      description="Halte neue oder geänderte Unterkunftsinformationen zurück, bis sie geprüft und bewusst kommuniziert wurden."
      actions={<Button variant="neutral">Kommunikationsverlauf</Button>}
    >
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-2xl">Ausstehende Änderungen</CardTitle>
          <p>Wähle nur die Bereiche aus, die jetzt sichtbar werden sollen.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {scopes.length === 0 ? (
            <EmptyState
              title="Alles ist an Familien kommuniziert."
              description="Es gibt aktuell keine offenen Unterkunftsänderungen."
            />
          ) : (
            scopes.map((scope) => {
              const blocked = Boolean(scope.blocking)
              return (
                <label
                  key={scope.id}
                  className={
                    blocked
                      ? 'grid gap-3 rounded-base border-2 border-black bg-secondary-background p-4 text-muted'
                      : 'grid gap-3 rounded-base border-2 border-black bg-white p-4 hover:bg-main'
                  }
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(scope.id)}
                      disabled={blocked}
                      onChange={() => toggle(scope.id)}
                      className="mt-1 size-5 accent-black"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-bold">
                        <span>{scope.title}</span>
                        <Badge tone={statusCopy[scope.status].tone}>
                          {statusCopy[scope.status].label}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-sm">{scope.detail}</span>
                    </span>
                    <span className="text-right text-sm font-bold">
                      {scope.affected_families} Familien
                    </span>
                  </div>
                  <span className="ml-8 border-l-4 border-black pl-3 text-sm">
                    {scope.blocking ?? scope.change_summary}
                  </span>
                </label>
              )
            })
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-4">
            <p className="font-bold">{selected.length} ausgewählt</p>
            <Button
              disabled={selected.length === 0}
              onClick={() => {
                onReview?.(selected)
                window.dispatchEvent(new CustomEvent('open-review'))
              }}
            >
              Auswahl prüfen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-paper">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
          <StatusKey
            tone="success"
            label="Kommuniziert"
            detail="Familien sehen die geprüfte Fassung."
          />
          <StatusKey
            tone="attention"
            label="Geändert"
            detail="Eine neue Prüfung ist erforderlich."
          />
          <StatusKey
            tone="held"
            label="Zurückgehalten"
            detail="Noch nicht für Familien sichtbar."
          />
        </CardContent>
      </Card>
    </ScreenFrame>
  )
}

function StatusKey({
  tone,
  label,
  detail,
}: {
  tone: 'success' | 'attention' | 'held'
  label: string
  detail: string
}) {
  return (
    <div className="space-y-2">
      <Badge tone={tone}>{label}</Badge>
      <p className="text-sm text-muted">{detail}</p>
    </div>
  )
}

export function CommunicationReview({
  view = communicationReviewFixture,
}: {
  view?: CommunicationReviewView
}) {
  const [notify, setNotify] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const selectedScopes = useMemo(
    () => view.scopes.filter((scope) => view.selected_scope_ids.includes(scope.id)),
    [view.scopes, view.selected_scope_ids],
  )
  const blocking =
    view.dependencies.length > 0 || selectedScopes.some((scope) => Boolean(scope.blocking))

  return (
    <ScreenFrame
      eyebrow="Unterkunft · Prüfansicht"
      title="Kommunikation prüfen"
      description="Diese Vorschau zeigt die Angaben, die anschließend in der Familienansicht sichtbar werden."
      actions={<Button variant="neutral">Zurück zu den Änderungen</Button>}
    >
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>
            Ausgewählt: {selectedScopes.map((scope) => scope.title).join(', ') || 'nichts'}
          </CardTitle>
          <p>
            {view.affected_families.length} betroffene Familien · {view.notification_count} mögliche
            E-Mail-Empfänger
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <MetaLine
            items={[
              { label: 'Geprüfter Stand', value: String(view.reviewed_sequence) },
              { label: 'Profil', value: view.build_label },
              {
                label: 'E-Mail',
                value: notify ? `${view.notification_count} Empfänger` : 'Nicht ausgewählt',
              },
            ]}
          />
          <ComparisonTable
            rows={view.differences}
            caption="Familienansicht: Änderungen der Unterkunft"
          />
          <div className="grid gap-2">
            <p className="font-bold">Betroffene Familien</p>
            <div className="flex flex-wrap gap-2">
              {view.affected_families.map((family) => (
                <Badge key={family}>{family}</Badge>
              ))}
            </div>
          </div>
          {view.dependencies.length > 0 ? (
            <div className="grid gap-3">
              {view.dependencies.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          ) : null}
          <label className="flex items-start gap-3 border-t-2 border-black pt-4">
            <input
              type="checkbox"
              checked={notify}
              onChange={(event) => setNotify(event.target.checked)}
              className="mt-1 size-5 accent-black"
            />
            <span>
              <span className="font-bold">Familien per E-Mail benachrichtigen</span>
              <span className="block text-sm text-muted">
                Die Sichtbarkeit und der E-Mail-Versand bleiben getrennte Entscheidungen.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-4">
            <p className="text-sm text-muted">
              Diese Angaben werden anschließend in der Familienansicht sichtbar.
            </p>
            <Button disabled={blocking} onClick={() => setConfirming(true)}>
              Jetzt an Familien kommunizieren
            </Button>
          </div>
        </CardContent>
      </Card>
      {confirming ? (
        <AlertDialog open onOpenChange={(open) => !open && setConfirming(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unterkunft kommunizieren?</AlertDialogTitle>
              <AlertDialogDescription>
                Die ausgewählten Angaben werden in der Familienansicht sichtbar. Diese Aktion ändert
                nicht die E-Mail-Auswahl.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirming(false)}>Zurück</AlertDialogCancel>
              <AlertDialogAction onClick={() => setConfirming(false)}>
                Jetzt kommunizieren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </ScreenFrame>
  )
}

export function CommunicationHistory({
  entries = communicationHistoryFixture,
}: {
  entries?: typeof communicationHistoryFixture
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <ScreenFrame
      eyebrow="Unterkunft · Verlauf"
      title="Kommunikationsverlauf"
      description="Prüfe, wann welche Unterkunftsangaben kommuniziert wurden und welche Vergleichsinformationen dazu gehören."
    >
      {entries.length === 0 ? (
        <EmptyState
          title="Noch keine Kommunikation"
          description="Für die Unterkunft wurde noch keine Mitteilung aufgezeichnet."
        />
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="bg-white">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{entry.scopes.join(' · ')}</CardTitle>
                    <p className="text-sm text-muted">
                      {entry.communicated_at} · {entry.actor}
                    </p>
                  </div>
                  <Badge>Stand {entry.sequence}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{entry.note ?? 'Kommunikation ohne zusätzliche Notiz.'}</p>
                <Button
                  variant="neutral"
                  size="sm"
                  aria-expanded={openId === entry.id}
                  onClick={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
                >
                  {openId === entry.id ? 'Vergleich schließen' : 'Vergleich öffnen'}
                </Button>
                {openId === entry.id ? (
                  <ComparisonTable
                    rows={entry.differences}
                    caption={`${entry.scopes.join(' · ')} Vergleich`}
                  />
                ) : null}
                {entry.unavailable_reason ? (
                  <p className="border-l-4 border-danger pl-3">{entry.unavailable_reason}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScreenFrame>
  )
}
