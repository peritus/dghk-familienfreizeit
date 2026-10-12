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
import { RequirementChip } from '../components/assignment-board/chips.js'
import type { RequirementView } from './assignment-board/types.js'
import type { RoomAssignmentParams } from '../../index.js'
import type { TraceEntry } from '../../../../solver/types.js'
import { activeProfile } from '../../../../config/index.js'

type TraceWorld = NonNullable<ReturnType<typeof useOrganiser>['world']>

const orderLabels: Readonly<Record<string, string>> = {
  'configured-opportunity-priority': 'Konfigurierte Priorität',
  'currently-feasible-rooms': 'Wie viele Zimmer noch passen',
  'bed-demand': 'Benötigte Schlafplätze',
  'family-sort-key': 'Gespeicherte Familienreihenfolge',
  'room-score': 'Zimmerwertung',
  'room-sort-key': 'Gespeicherte Zimmerreihenfolge',
}

const hiddenOrderCriteria = new Set(['family-id', 'family-sort-key', 'room-id'])

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
  if (criterion === 'currently-feasible-rooms')
    return 'Familien mit weniger passenden Zimmern kommen früher dran'
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

type FamilyRoomPreference = {
  trait_key: string
  weight: number
  view: RequirementView
}

function familyRoomPreferences(world: TraceWorld, familyId: string): FamilyRoomPreference[] {
  const personIds = new Set(
    world.persons
      .filter((person) => labelValue(world, person.id, 'member-of') === familyId)
      .map(({ id }) => id),
  )
  const seen = new Set<string>()

  return world.requirements.flatMap((requirement) => {
    if (
      (requirement.holder_id !== familyId && !personIds.has(requirement.holder_id)) ||
      (requirement.consumer && requirement.consumer !== 'room-assignment') ||
      requirement.value === `${familyId}_room` ||
      (requirement.strength !== 'required' && requirement.strength !== 'preferred')
    )
      return []

    const identity = [
      requirement.trait_key,
      requirement.capability_key ?? requirement.structural ?? '',
      requirement.value ?? '',
      requirement.strength,
    ].join(':')
    if (seen.has(identity)) return []
    seen.add(identity)

    const valueTrait = requirement.capability_key
      ? activeProfile.traits[requirement.capability_key as keyof typeof activeProfile.traits]
      : undefined
    const label =
      (valueTrait ? localizedTraitTitle(requirement.capability_key!) : null) ||
      localizedTraitTitle(requirement.trait_key) ||
      (requirement.structural === 'no-other-families' ? 'Zimmer nicht teilen' : 'Zimmerwunsch')

    return [
      {
        trait_key: requirement.trait_key,
        weight: requirement.weight ?? 0,
        view: {
          key: identity,
          label,
          strength: requirement.strength,
          capability_key: requirement.capability_key,
          value: requirement.value,
          kind: requirement.kind,
          structural: requirement.structural,
        },
      },
    ]
  })
}

function priorityConfiguration() {
  const parameters = activeProfile.modules.find(({ id }) => id === 'room-assignment')
    ?.parameters as RoomAssignmentParams | undefined
  const traitKey = parameters?.priority_trait ?? null
  const trait = traitKey
    ? activeProfile.traits[traitKey as keyof typeof activeProfile.traits]
    : undefined
  const weight =
    trait && 'weight' in trait && typeof trait.weight === 'number' ? trait.weight : null

  return {
    trait_key: traitKey,
    label: traitKey ? localizedTraitTitle(traitKey) || 'Zimmerwunsch' : null,
    weight,
  }
}

function PriorityEvidence({
  world,
  family_id: familyId,
  value,
}: {
  world: TraceWorld
  family_id: string
  value: string | number
}) {
  const preferences = familyRoomPreferences(world, familyId)
  const configuration = priorityConfiguration()
  const relevant = preferences.filter(
    ({ trait_key: traitKey }) => !configuration.trait_key || traitKey === configuration.trait_key,
  )

  return (
    <section
      aria-label="Konfigurierte Priorität"
      className="rounded-base border border-border/50 bg-background p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold">1. Konfigurierte Priorität</h4>
          <p className="mt-1 text-sm text-muted">
            {configuration.label
              ? `Für die Reihenfolge zählt ${configuration.label}${configuration.weight === null ? '' : ` mit Gewicht ${configuration.weight}`}.`
              : 'Für die Reihenfolge zählen die konfigurierten Zimmerwünsche.'}{' '}
            Ein Wunsch zählt einfach, eine erforderliche Anforderung doppelt.
          </p>
          {configuration.label && configuration.weight !== null ? (
            <p className="mt-1 text-sm text-muted">
              Das ergibt: Wunsch {configuration.weight} × 1 = {configuration.weight}; erforderlich{' '}
              {configuration.weight} × 2 = {configuration.weight * 2}.
            </p>
          ) : null}
        </div>
        <p className="font-heading text-metric font-bold tabular-nums">{value}</p>
      </div>

      <div className="mt-3">
        <h5 className="text-sm font-bold">Zimmerwünsche und Anforderungen dieser Familie</h5>
        {preferences.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {preferences.map(({ view }) => (
              <li key={view.key}>
                <RequirementChip requirement={view} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Keine Zimmerwünsche oder Anforderungen eingetragen.
          </p>
        )}
      </div>

      {relevant.length ? (
        <>
          <ul className="mt-3 space-y-1 text-sm">
            {relevant.map(({ weight, view }) => {
              const multiplier = view.strength === 'required' ? 2 : 1
              const strength = view.strength === 'required' ? 'erforderlich' : 'Wunsch'
              return (
                <li key={view.key}>
                  {view.label} ({strength}): {weight} × {multiplier} = {weight * multiplier} Punkte
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Bei mehreren passenden Einträgen zählt der höchste Wert; die Werte werden nicht addiert.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {configuration.label
            ? `Für diese Familie ist ${configuration.label} nicht eingetragen.`
            : 'Für diese Familie gibt es keinen passenden Eintrag.'}{' '}
          Deshalb beträgt die konfigurierte Priorität 0.
        </p>
      )}
    </section>
  )
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
  world,
  family_id: familyId,
  family_name: familyName,
}: {
  entry: TraceEntry
  roomName: (id: string) => string
  world: TraceWorld
  family_id: string
  family_name: string
}) {
  const allocation = entry.detail?.allocation
  const rejected = rejectedRooms(entry)
  const chosen = entry.detail?.chosen
  const alternatives = entry.detail?.runners_up ?? []
  const bedDemand = allocation?.order.find(({ criterion }) => criterion === 'bed-demand')?.value
  const priority = allocation?.order.find(
    ({ criterion }) => criterion === 'configured-opportunity-priority',
  )?.value
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
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          {allocation?.round !== undefined ? (
            <span className="font-bold tabular-nums">{allocation.round}.</span>
          ) : null}
          {chosen ? <span className="font-bold">{roomName(chosen.target)}</span> : null}
          <span className="font-heading text-metric">
            {allocation ? `Familie ${familyName}` : familyName}
          </span>
          {!chosen || entry.step === 'fixed-invalid' ? (
            <span className="text-muted">{summary}</span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {priority !== undefined ? <Badge>Priorität {priority}</Badge> : null}
          <Badge
            tone={
              entry.step === 'unplaceable' || entry.step === 'fixed-invalid'
                ? 'attention'
                : 'neutral'
            }
          >
            {placementLabel(entry)}
          </Badge>
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
        {allocation ? (
          <section className="space-y-4" aria-label="Gründe für die automatische Reihenfolge">
            <h4 className="font-bold">Warum wurde diese Familie als Nächste gewählt?</h4>
            {priority !== undefined ? (
              <PriorityEvidence world={world} family_id={familyId} value={priority} />
            ) : null}
            <section aria-label="Auswahl an passenden Zimmern">
              <h5 className="font-bold">2. Wie viele Zimmer noch passen</h5>
              <p className="mt-1 text-sm text-muted">
                Familien mit weniger passenden Zimmern werden früher zugeordnet. Die Zimmer, die für
                diese Familie noch passen, stehen weiter unten.
              </p>
            </section>
            {bedDemand !== undefined ? (
              <section
                aria-label="Benötigte Schlafplätze"
                className="rounded-base border border-border/50 bg-background p-3"
              >
                <h5 className="font-bold">3. Benötigte Schlafplätze</h5>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {orderedValue('bed-demand', bedDemand)}
                </p>
              </section>
            ) : null}
            <p className="mt-2 text-sm text-muted">
              Bei exakt gleicher Reihenfolge entscheidet der Zeitpunkt der Anmeldung: früher
              angemeldete Familien zuerst.
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
              Ungeeignete Zimmer ({rejected.length})
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
  world,
}: {
  title: string
  entries: readonly TraceEntry[]
  familyLabelFor: (id: string) => string
  roomName: (id: string) => string
  world: TraceWorld
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
              world={world}
              family_id={entry.subject}
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
            Bei weiterem Gleichstand kommt die Familie zuerst, die früher im System angelegt wurde.
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
            world={world}
          />
          <TraceGroup
            title="Automatische Zuordnungen in Auswahlreihenfolge"
            entries={automatic}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
            world={world}
          />
          <TraceGroup
            title="Ohne passendes Zimmer"
            entries={unplaceable}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
            world={world}
          />
          <TraceGroup
            title="Weitere Ergebnisse"
            entries={other}
            familyLabelFor={(id) => familyLabel(world, id)}
            roomName={roomName}
            world={world}
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
