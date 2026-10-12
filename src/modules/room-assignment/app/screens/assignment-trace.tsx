import { Badge } from '../../../../app/components/shared/ui/badge.js'
import { CollectionList } from '../../../../app/components/shared/ui/collection-list.js'
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
  'family-sort-key': 'Familienreihenfolge',
  'family-id': 'Familien-ID bei Gleichstand',
  'room-score': 'Zimmerwertung',
  'room-sort-key': 'Zimmerreihenfolge',
  'room-id': 'Zimmer-ID bei Gleichstand',
}

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
  return typeof displayName === 'string' ? displayName : id
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
      return entry.step
  }
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
    const label = rejectionLabels.get(rejection.rule) ?? `Weitere Regel (${rejection.rule})`
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
        ? `Bevorzugte Anforderung · ${traitTitle ?? key}`
        : kind === 'preferred-relation'
          ? `Bevorzugte Beziehung · ${traitTitle ?? key}`
          : kind === 'scarce-capability'
            ? `Seltenes Merkmal · ${traitTitle ?? key}`
            : term)
    return `${label}: ${value > 0 ? '+' : ''}${value}`
  })
}

function TraceDecision({
  entry,
  index,
  roomName,
  family_name: familyName,
}: {
  entry: TraceEntry
  index: number
  roomName: (id: string) => string
  family_name: string
}) {
  const allocation = entry.detail?.allocation
  const rejected = rejectedRooms(entry)
  const chosen = entry.detail?.chosen
  const alternatives = entry.detail?.runners_up ?? []
  const title = allocation
    ? `Runde ${allocation.round}: ${familyName}`
    : `${placementLabel(entry)}: ${familyName}`

  return (
    <article
      className="space-y-4 rounded-base border-2 border-border bg-background p-4"
      aria-labelledby={`room-trace-${index}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`room-trace-${index}`} className="font-heading text-metric">
            {title}
          </h3>
          <p className="mt-1 text-muted">
            {chosen ? `Zugeordnet zu ${roomName(chosen.target)}` : entry.text}
          </p>
        </div>
        <Badge
          tone={
            entry.step === 'unplaceable' || entry.step === 'fixed-invalid' ? 'attention' : 'neutral'
          }
        >
          {placementLabel(entry)}
        </Badge>
      </div>

      {allocation ? (
        <section aria-label={`Reihenfolge in Runde ${allocation.round}`}>
          <h4 className="font-bold">Warum diese Familie zuerst?</h4>
          <p className="mt-1 text-sm text-muted">
            Die Priorität verwendet den stärksten konfigurierten Wert; eine verpflichtende
            Anforderung zählt doppelt so stark wie ein Wunsch.
          </p>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {allocation.order.map(({ criterion, value }, orderIndex) => (
              <li key={criterion} className="rounded-base border border-border/50 p-2">
                <span className="block text-sm text-muted">
                  {orderIndex + 1}. {orderLabels[criterion] ?? criterion}
                </span>
                <span className="font-bold tabular-nums">{orderedValue(criterion, value)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {chosen ? (
        <section>
          <h4 className="font-bold">Zimmerwertung: {chosen.score} Punkte</h4>
          {chosen.order ? (
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {chosen.order.map(({ criterion, value }) => (
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
                {alternative.order ? (
                  <ul className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted">
                    {alternative.order.map(({ criterion, value }) => (
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
    </article>
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
  const roomName = (id: string) => namesByRoom.get(id) ?? id

  return (
    <ScreenLayout
      secondary_navigation={<AccommodationNavigation />}
      header={
        <ScreenHeader
          eyebrow="Unterkunft · Belegung"
          title="Verlauf der Zimmerverteilung"
          description="Jede automatische Zuordnung folgt derselben nachvollziehbaren Reihenfolge. Hier siehst du die Faktoren, passende Alternativen und abgelehnte Zimmer."
        />
      }
    >
      <section className="space-y-3 rounded-base border-2 border-border bg-secondary-background p-4">
        <SectionHeader title="Die feste Reihenfolge" />
        <ol className="list-decimal space-y-1 pl-5">
          <li>Feste Zimmerentscheidungen werden zuerst übernommen.</li>
          <li>
            Danach kommt der stärkste konfigurierte Wert für die Priorität; verpflichtende
            Anforderungen zählen doppelt so stark wie Wünsche.
          </li>
          <li>
            Bei gleicher Priorität wird die Familie mit weniger aktuell passenden Zimmern zuerst
            zugeordnet.
          </li>
          <li>
            Bei weiterem Gleichstand kommen Familien mit mehr benötigten Schlafplätzen zuerst.
          </li>
          <li>
            Die gespeicherte Familienreihenfolge und zuletzt die Familien-ID lösen jeden weiteren
            Gleichstand auf.
          </li>
        </ol>
        <p className="text-sm text-muted">
          Nach jeder Zuordnung werden die noch passenden Zimmer neu bewertet. Das Zimmer mit der
          höchsten Wertung gewinnt; bei Gleichstand entscheiden Zimmerreihenfolge und Zimmer-ID.
        </p>
      </section>

      {entries.length ? (
        <CollectionList>
          <ol className="space-y-4">
            {entries.map((entry, index) => (
              <li
                key={`${entry.step}-${entry.subject}-${entry.detail?.allocation?.round ?? index}`}
              >
                <TraceDecision
                  entry={entry}
                  index={index}
                  roomName={roomName}
                  family_name={familyLabel(world, entry.subject)}
                />
              </li>
            ))}
          </ol>
        </CollectionList>
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
