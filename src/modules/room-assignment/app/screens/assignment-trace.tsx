import { Badge } from '../../../../app/components/shared/ui/badge.js'
import { LoadingState } from '../../../../app/components/shared/ui/screen-state.js'
import {
  ScreenHeader,
  ScreenLayout,
  SectionHeader,
} from '../../../../app/components/shared/ui/screen-layout.js'
import { useOrganiser } from '../../../../app/organiser/context.js'
import { AccommodationNavigation } from '../../../../app/organiser/components/accommodation-navigation.js'
import { useDocumentTitle } from '../../../../app/lib/use-document-title.js'
import { inventoryWorld } from '../../../room-inventory/index.js'
import type { TraceEntry } from '../../../../solver/types.js'
import { activeProfile } from '../../../../config/index.js'

const orderLabels: Readonly<Record<string, string>> = {
  'configured-opportunity-priority': 'Konfigurierte Priorität',
  'currently-feasible-rooms': 'Aktuell passende Zimmer',
  'bed-demand': 'Benötigte Schlafplätze',
  'family-sort-key': 'Gespeicherte Familienreihenfolge',
  'room-score': 'Zimmerwertung',
  'room-sort-key': 'Gespeicherte Zimmerreihenfolge',
}

const hiddenOrderCriteria = new Set(['family-id', 'room-id'])

const rejectionLabels = new Map([
  ['hard.capacity', 'Nicht genug freie Schlafplätze'],
  ['hard.trait-requirements', 'Erforderliche Ausstattung fehlt'],
  ['hard.sole-occupancy', 'Zimmer ist bereits durch eine andere Familie belegt'],
  ['hard.room-decision', 'Zimmer ist nicht Teil der festgelegten Auswahl'],
  ['hard.resolver-decisions', 'Zimmer wurde durch eine Anforderung ausgeschlossen'],
  ['hard.keep-apart', 'Eine andere Familie muss getrennt bleiben'],
  ['hard.room-unavailable', 'Zimmer ist nicht verfügbar'],
])

function labelValue(
  world: ReturnType<typeof useOrganiser>['world'],
  entityId: string,
  key: string,
) {
  return world?.labels_by_entity[entityId]?.find((label) => label.key === key)?.value
}

function familyLabel(world: ReturnType<typeof useOrganiser>['world'], id: string): string {
  const displayName = labelValue(world, id, 'display-name')
  return typeof displayName === 'string' && displayName.trim() ? displayName : 'Familie ohne Namen'
}

function roomLabels(world: NonNullable<ReturnType<typeof useOrganiser>['world']>) {
  const inventory = inventoryWorld(world)
  const buildings = new Map(inventory.buildings.map(({ id, name }) => [id, name]))
  return new Map(
    inventory.rooms.map((room) => [
      room.id,
      `Zimmer ${room.number}${buildings.has(room.building_id) ? ` · ${buildings.get(room.building_id)}` : ''}`,
    ]),
  )
}

function placementLabel(entry: TraceEntry): string {
  switch (entry.step) {
    case 'fixed':
      return 'Feste Zuordnung'
    case 'fixed-invalid':
      return 'Feste Zuordnung prüfen'
    case 'forced':
      return 'Einziges passendes Zimmer'
    case 'greedy':
      return 'Automatische Zuordnung'
    case 'unplaceable':
      return 'Kein passendes Zimmer'
    default:
      return 'Weitere Entscheidung'
  }
}

function visibleOrder(order: readonly { criterion: string; value: string | number }[] | undefined) {
  return (order ?? []).filter(({ criterion }) => !hiddenOrderCriteria.has(criterion))
}

function orderedValue(criterion: string, value: string | number): string {
  if (criterion === 'currently-feasible-rooms') return `${value} Zimmer`
  if (criterion === 'bed-demand') return `${value} Schlafplätze`
  if (criterion === 'room-score') return `${value} Punkte`
  return String(value)
}

function rejectedRooms(entry: TraceEntry): readonly { room: string; reasons: readonly string[] }[] {
  const grouped = new Map<string, string[]>()
  for (const rejection of entry.detail?.rejected ?? []) {
    const reasons = grouped.get(rejection.target) ?? []
    const label = rejectionLabels.get(rejection.rule) ?? 'Weitere Einschränkung'
    if (!reasons.includes(label)) reasons.push(label)
    grouped.set(rejection.target, reasons)
  }
  return [...grouped].map(([room, reasons]) => ({ room, reasons }))
}

function localizedTraitTitle(key: string): string | null {
  const title = activeProfile.traits[key as keyof typeof activeProfile.traits]?.title
  if (typeof title === 'string') return title
  if (title && typeof title === 'object')
    return title[activeProfile.meta.locale] ?? title[activeProfile.meta.fallback_locale] ?? null
  return null
}

function scoreTerms(terms: readonly [string, number][]): string[] {
  const labels: Readonly<Record<string, string>> = {
    'exact-fit': 'Genau passende Belegung',
    'near-fit': 'Nahezu passende Belegung',
    'orphan-bed': 'Übrige Schlafplätze',
  }
  return terms.map(([term, value]) => {
    const [kind, key] = term.split(':', 2)
    const traitTitle = key ? localizedTraitTitle(key) : null
    const label =
      labels[term] ??
      (kind === 'preferred-requirement'
        ? `Bevorzugte Anforderung · ${traitTitle ?? 'weitere'}`
        : kind === 'preferred-relation'
          ? `Bevorzugte Beziehung · ${traitTitle ?? 'weitere'}`
          : kind === 'scarce-capability'
            ? `Seltene Ausstattung · ${traitTitle ?? 'weitere'}`
            : 'Weitere Wertung')
    return `${label}: ${value > 0 ? '+' : ''}${value}`
  })
}

function TraceDecision({
  entry,
  roomName,
  family_name: familyName,
}: {
  entry: TraceEntry
  roomName: (id: string) => string
  family_name: string
}) {
  const allocation = entry.detail?.allocation
  const rejected = rejectedRooms(entry)
  const chosen = entry.detail?.chosen
  const alternatives = entry.detail?.runners_up ?? []
  const summary =
    entry.step === 'fixed-invalid'
      ? 'Das festgelegte Zimmer ist nicht verfügbar.'
      : chosen
        ? `Zugeordnet zu ${roomName(chosen.target)}`
        : entry.step === 'unplaceable'
          ? 'Kein passendes Zimmer gefunden.'
          : 'Zuordnung wird geprüft.'

  return (
    <details className="rounded-base border-2 border-border bg-secondary-background p-4 text-foreground">
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 rounded-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border">
        <span>
          <span className="block font-heading text-metric">{familyName}</span>
          <span className="mt-1 block text-muted">{summary}</span>
        </span>
        <Badge
          tone={
            entry.step === 'unplaceable' || entry.step === 'fixed-invalid' ? 'attention' : 'neutral'
          }
        >
          {placementLabel(entry)}
        </Badge>
      </summary>

      <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
        {allocation ? (
          <section aria-label="Gründe für die automatische Reihenfolge">
            <h4 className="font-bold">Warum wurde diese Familie als Nächste gewählt?</h4>
            <p className="mt-1 text-sm text-muted">
              Die Werte zeigen, wie die Auswahlregeln bei dieser Zuordnung angewendet wurden.
            </p>
            <ol className="mt-2 grid gap-2 sm:grid-cols-2">
              {visibleOrder(allocation.order).map(({ criterion, value }, orderIndex) => (
                <li key={criterion} className="rounded-base border border-border/50 p-2">
                  <span className="block text-sm text-muted">
                    {orderIndex + 1}. {orderLabels[criterion] ?? criterion}
                  </span>
                  <span className="font-bold tabular-nums">{orderedValue(criterion, value)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-muted">
              Bei exakt gleichem Ergebnis entscheidet eine stabile interne Reihenfolge.
            </p>
          </section>
        ) : null}

        {chosen ? (
          <section>
            <h4 className="font-bold">Warum dieses Zimmer? {chosen.score} Punkte</h4>
            {visibleOrder(chosen.order).length ? (
              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {visibleOrder(chosen.order).map(({ criterion, value }) => (
                  <div key={criterion} className="flex gap-1">
                    <dt className="text-muted">{orderLabels[criterion] ?? criterion}:</dt>
                    <dd className="font-bold tabular-nums">{orderedValue(criterion, value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {scoreTerms(chosen.terms).length ? (
              <ul className="mt-1 list-disc pl-5 text-sm">
                {scoreTerms(chosen.terms).map((term, termIndex) => (
                  <li key={`${term}-${termIndex}`}>{term}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">Keine zusätzlichen Wertungspunkte.</p>
            )}
          </section>
        ) : null}

        {alternatives.length ? (
          <details className="rounded-base border border-border/50 p-3">
            <summary className="cursor-pointer font-bold">
              Andere passende Zimmer ({alternatives.length})
            </summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {alternatives.map((alternative) => (
                <li key={alternative.target}>
                  <strong>{roomName(alternative.target)}</strong> · {alternative.score} Punkte
                  {visibleOrder(alternative.order).length ? (
                    <ul className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
                      {visibleOrder(alternative.order).map(({ criterion, value }) => (
                        <li key={criterion}>
                          {orderLabels[criterion] ?? criterion}: {orderedValue(criterion, value)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {scoreTerms(alternative.terms).length ? (
                    <ul className="list-disc pl-5 text-sm text-muted">
                      {scoreTerms(alternative.terms).map((term, termIndex) => (
                        <li key={`${term}-${termIndex}`}>{term}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        {rejected.length ? (
          <details className="rounded-base border border-border/50 p-3">
            <summary className="cursor-pointer font-bold">
              Abgelehnte Zimmer ({rejected.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {rejected.map(({ room, reasons }) => (
                <li key={room}>
                  <strong>{roomName(room)}</strong>
                  <ul className="list-disc pl-5 text-sm text-muted">
                    {reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </details>
  )
}

function TraceGroup({
  title,
  entries,
  familyLabelFor,
  roomName,
}: {
  title: string
  entries: readonly TraceEntry[]
  familyLabelFor: (id: string) => string
  roomName: (id: string) => string
}) {
  if (!entries.length) return null

  return (
    <section className="space-y-3">
      <SectionHeader title={`${title} (${entries.length})`} />
      <ol className="space-y-2">
        {entries.map((entry, index) => (
          <li key={`${entry.step}-${entry.subject}-${index}`}>
            <TraceDecision
              entry={entry}
              roomName={roomName}
              family_name={familyLabelFor(entry.subject)}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}

export function AssignmentTraceScreen() {
  useDocumentTitle('Verlauf · Belegung · Familienfreizeit')
  const { world, current_plan: plan } = useOrganiser()
  if (!world || !plan)
    return (
      <ScreenLayout
        secondary_navigation={<AccommodationNavigation />}
        header={<ScreenHeader title="Verlauf der Zimmerverteilung" />}
      >
        <LoadingState />
      </ScreenLayout>
    )

  const entries = plan.trace.filter(({ stage }) => stage === 'room-assignment.place')
  const namesByRoom = roomLabels(world)
  const roomName = (id: string) => namesByRoom.get(id) ?? 'Zimmer ohne Bezeichnung'
  const fixed = entries.filter(({ step }) => step === 'fixed' || step === 'fixed-invalid')
  const automatic = entries.filter(({ step }) => step === 'forced' || step === 'greedy')
  const unplaceable = entries.filter(({ step }) => step === 'unplaceable')
  const other = entries.filter(
    ({ step }) => !['fixed', 'fixed-invalid', 'forced', 'greedy', 'unplaceable'].includes(step),
  )

  return (
    <ScreenLayout
      secondary_navigation={<AccommodationNavigation />}
      header={
        <ScreenHeader
          eyebrow="Unterkunft · Belegung"
          title="Verlauf der Zimmerverteilung"
          description="Die Liste zeigt feste Entscheidungen zuerst und danach die automatische Auswahlreihenfolge. Öffne eine Familie, um die Bewertungsdetails zu sehen."
        />
      }
    >
      <section className="space-y-3 rounded-base border-2 border-border bg-secondary-background p-4">
        <SectionHeader title="So wird die nächste automatische Zuordnung entschieden" />
        <p>
          Die fünf Schritte bestimmen jeweils die nächste Familie. Nach jeder automatischen
          Zuordnung werden die verfügbaren Zimmer neu geprüft und dieselben Schritte wiederholt.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Feste Zimmerentscheidungen werden zuerst übernommen.</li>
          <li>
            Bei den übrigen Familien entscheidet zuerst der stärkste konfigurierte Prioritätswert;
            eine verpflichtende Anforderung zählt doppelt so stark wie ein Wunsch.
          </li>
          <li>
            Bei gleicher Priorität kommt die Familie mit weniger aktuell passenden Zimmern zuerst.
          </li>
          <li>
            Bei weiterem Gleichstand kommt die Familie mit mehr benötigten Schlafplätzen zuerst.
          </li>
          <li>
            Die gespeicherte Familienreihenfolge löst weitere Gleichstände auf; bei exakt gleicher
            Reihenfolge entscheidet ein stabiler interner Tie-Breaker.
          </li>
        </ol>
        <p className="text-sm text-muted">
          Für die ausgewählte Familie gewinnt das passende Zimmer mit der höchsten Wertung. Bei
          gleicher Wertung entscheiden die gespeicherte Zimmerreihenfolge und ein stabiler interner
          Tie-Breaker. Die Listen darunter zeigen feste Zuordnungen, automatische Zuordnungen und
          Familien ohne passendes Zimmer.
        </p>
      </section>

      {entries.length ? (
        <div className="space-y-6">
          <TraceGroup
            title="Feste Zimmerentscheidungen"
            entries={fixed}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
          />
          <TraceGroup
            title="Automatische Zuordnungen in Auswahlreihenfolge"
            entries={automatic}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
          />
          <TraceGroup
            title="Ohne passendes Zimmer"
            entries={unplaceable}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
          />
          <TraceGroup
            title="Weitere Ergebnisse"
            entries={other}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
          />
        </div>
      ) : (
        <section className="rounded-base border-2 border-border bg-secondary-background p-5">
          <SectionHeader title="Noch keine Zuordnungen" />
          <p className="mt-2 text-muted">
            Sobald Familien und Zimmer vorhanden sind, erscheint hier der vollständige Ablauf.
          </p>
        </section>
      )}
    </ScreenLayout>
  )
}
