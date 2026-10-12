import { attentionLabel } from './attention-label.js'
import { flushSync } from 'react-dom'
import { DraftGroupEditor } from './draft-group-editor.js'
import { closedAttentionContext } from '../../attention/closed.js'
import { useEffect, useMemo, useState } from 'react'
import { useOrganiser } from './context.js'
import { activeProfile } from '../../config/index.js'
import { buildRevision } from '../../config/build.js'
import { profileAttention, profileAttentionChecks } from '../../attention/profile.js'
import { attentionAllClear, attentionComplete, selectAttention } from '../../attention/selectors.js'
import { canonical } from '../../attention/engine.js'
import type {
  AttentionItem,
  AttentionResult,
  AttentionScope,
  AttentionArea,
  AttentionAction,
} from '../../attention/types.js'
import type { JsonValue } from '../../events/types.js'
import { Badge } from '../components/shared/ui/badge.js'
import { ActionableNotice } from '../components/shared/ui/notice.js'
import { Button } from '../components/shared/ui/button.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../components/shared/ui/dialog.js'
import { OrganiserLink } from '../components/application/organiser-link.js'
import { organiserPaths, organiserPathWithQuery } from '../../organiser/routes.js'
import { subjectName } from './closed-areas.js'
const evaluator = profileAttention(activeProfile)
export function useAttention(): AttentionResult {
  const { attention, world, current_plan: plan, state } = useOrganiser()
  return useMemo(
    () =>
      attention ??
      evaluator({
        closed_changes: world && plan ? closedAttentionContext(world, plan, activeProfile) : [],
        domain: world ? 'available' : 'loading',
        world,
        plan: plan ?? null,
        profile: activeProfile,
        build_revision: plan?.meta.build_revision ?? buildRevision,
        locale: activeProfile.meta.locale,
        now: '2027-01-01T00:00:00.000Z',
        audience: 'organiser',
        basis: {
          mode: state.drafts.length ? 'prospective' : 'committed',
          group_ids: state.drafts.flatMap((g) => (g.id ? [g.id] : [])),
        },
      }),
    [attention, world, plan, state.drafts],
  )
}
const labels: Readonly<Record<string, string>> = {
  adults: 'Erwachsene',
  children: 'Kinder',
  all: 'Alle',
  check: 'Prüfung',
  payload: 'Änderung',
  kind: 'Änderung',
  aspect: 'Zuordnung',
  before_value: 'Vorher',
  after_value: 'Nachher',
  before: 'Vorher',
  after: 'Nachher',
  subject_id: 'Betroffenes Objekt',
  affected_family_ids: 'Betroffene Familien',
  family_unknown: 'Familie nicht verfügbar',
  room: 'Zimmer',
  attendance: 'Teilnahme',
  placement: 'Platzierung',
  unplaced: 'Ohne Zimmer',
  unassigned: 'Ohne Teilnahme',
  added: 'Neu',
  removed: 'Entfällt',
  moved: 'Geändert',
  capacity: 'Plätze',
  demand: 'Bedarf',
  actual: 'Zugeordnete Schlafplätze',
  shortfall: 'Fehlende Plätze',
  expected: 'Erfüllungsziel',
  field: 'Angabe',
  trait: 'Merkmal',
  key: 'Merkmal',
  capability: 'Ausstattung',
  target: 'Verweis',
  target_at: 'Zieltermin',
  saved_at: 'Gespeichert am',
  slot_id: 'Slot',
  space_id: 'Raum',
  room_id: 'Zimmer',
  workshop_id: 'Workshop',
  workshop_ids: 'Workshops',
  person_ids: 'Personen',
  unplaced_person_ids: 'Ohne Schlafplatz',
  family_ids: 'Betroffene Familien',
  people: 'Teilnehmende',
  leaders: 'Leitungen',
  unavailable: 'Nicht verfügbar',
  age_min: 'Mindestalter',
  age_max: 'Höchstalter',
  audience: 'Zielgruppe',
  asked: 'Gewählte Workshops',
  fulfilled: 'Erfüllte Wünsche',
  max_rank: 'Anzahl Wahlrunden',
  attendance_changed: 'Teilnahme würde sich ändern',
  places: 'Schlafplätze',
  slots: 'Slots',
  spaces: 'Räume',
  count: 'Anzahl',
  cardinality: 'Erlaubte Anzahl',
  value: 'Wert',
  choices: 'Antwort',
  reasons: 'Gründe',
  reason: 'Grund',
  changes: 'Änderungen',
  area: 'Bereich',
}
export function AttentionDetails({ item }: { item: AttentionItem }) {
  const { world, baseline_world: baselineWorld, stage, dispatch, state, apply } = useOrganiser()
  const namesWorld = world ?? baselineWorld
  const [confirm, setConfirm] = useState<AttentionAction | null>(null)
  const checkTitles = new Map(
    profileAttentionChecks(activeProfile).map((check) => [
      check.code,
      typeof check.title === 'string'
        ? check.title
        : (check.title[activeProfile.meta.locale] ?? check.title.de ?? check.title.en),
    ]),
  )
  const display = (value: JsonValue): string =>
    typeof value === 'string'
      ? namesWorld?.entity_kind_by_id[value]
        ? subjectName(namesWorld!, value)
        : activeProfile.traits[value as keyof typeof activeProfile.traits]?.title
          ? typeof activeProfile.traits[value as keyof typeof activeProfile.traits].title ===
            'string'
            ? (activeProfile.traits[value as keyof typeof activeProfile.traits].title as string)
            : ((
                activeProfile.traits[value as keyof typeof activeProfile.traits].title as Readonly<
                  Record<string, string>
                >
              ).de ?? value)
          : (checkTitles.get(value) ??
            labels[value] ??
            (/^[a-z]{2,5}_[a-z0-9_-]+$/i.test(value) ? 'Objekt nicht verfügbar' : value))
      : typeof value === 'boolean'
        ? value
          ? 'Ja'
          : 'Nein'
        : value === null
          ? '—'
          : Array.isArray(value)
            ? value.map(display).join(', ') || '—'
            : typeof value === 'object'
              ? Object.entries(value)
                  .filter(
                    ([key]) =>
                      labels[key] &&
                      !(key === 'before' && 'before_value' in value) &&
                      !(key === 'after' && 'after_value' in value),
                  )
                  .map(([key, v]) => `${labels[key]}: ${display(v)}`)
                  .join('; ')
              : String(value)
  const execute = () => {
    if (confirm?.kind === 'clear-label') {
      const current = world?.labels_by_entity[confirm.entity_id]?.find(
        (l) =>
          l.key === confirm.key &&
          canonical(l.value) === canonical(confirm.value) &&
          l.set_seq === confirm.seq,
      )
      if (!current) {
        setConfirm(null)
        return
      }
      stage([
        {
          type: 'LabelCleared',
          at: new Date().toISOString(),
          actor: state.principal_email!,
          subject: confirm.entity_id,
          payload: { entity_id: confirm.entity_id, key: confirm.key, value: confirm.value },
        },
      ])
    } else if (confirm?.kind === 'review-group')
      dispatch({ type: 'discard-group', group_id: confirm.group_id })
    setConfirm(null)
  }
  return (
    <div className="space-y-2">
      {item.wording.detail !== item.wording.title ? <p>{item.wording.detail}</p> : null}
      {item.subjects.length ? (
        <ul>
          {item.subjects.map((s) => (
            <li key={`${s.kind}:${s.id}`}>
              {namesWorld?.entity_kind_by_id[s.id]
                ? subjectName(namesWorld, s.id)
                : 'Objekt nicht verfügbar'}
            </li>
          ))}
        </ul>
      ) : null}
      {item.wording.reasons.length ? (
        <ul className="list-disc pl-5">
          {item.wording.reasons.map((r, i) => (
            <li key={`${r}:${i}`}>{r}</li>
          ))}
        </ul>
      ) : null}
      <dl className="text-sm">
        {Object.entries(item.evidence)
          .filter(([key]) => labels[key] && !['reason', 'reasons'].includes(key))
          .map(([key, value]) => (
            <div key={key}>
              <dt className="font-bold">{labels[key]}</dt>
              <dd>{display(value)}</dd>
            </div>
          ))}
      </dl>
      {item.source_refs.length ? (
        <p className="text-sm text-muted">
          Grundlage:{' '}
          {item.source_refs
            .map((s) =>
              s.kind === 'label'
                ? `Angabe, Ereignis ${s.seq}`
                : s.kind === 'closing'
                  ? `Festlegung, Ereignis ${s.seq}`
                  : s.kind === 'stage'
                    ? 'Berechnete Zuordnung'
                    : s.kind === 'resolver'
                      ? 'Abgeleitete Anforderungen'
                      : s.kind === 'field'
                        ? 'Eingabeprüfung'
                        : 'Speichervorgang',
            )
            .join(' · ')}
        </p>
      ) : null}
      {item.blocks.length ? (
        <p className="text-sm font-bold">
          Erforderlich vor:{' '}
          {item.blocks
            .map(
              (operation) =>
                ({
                  append: 'Speichern',
                  'close-accommodation': 'Unterkunft festlegen',
                  'close-workshops': 'Workshops festlegen',
                  'capacity-reduction': 'Platzanzahl verringern',
                })[operation],
            )
            .join(', ')}
          .
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 print:hidden">
        {item.actions.map((action, i) =>
          action.kind === 'navigate' ? (
            <OrganiserLink
              key={i}
              className="underline"
              href={
                action.destination === 'family'
                  ? action.entity_id
                    ? organiserPaths.family_detail(action.entity_id)
                    : organiserPaths.families()
                  : action.destination === 'workshop'
                    ? organiserPathWithQuery(organiserPaths.workshops(), {
                        workshop: action.entity_id ?? '',
                      })
                    : action.destination === 'accommodation'
                      ? organiserPaths.assignment_board()
                      : action.destination === 'programme'
                        ? organiserPaths.workshop_programme()
                        : organiserPaths.workshop_allocation()
              }
            >
              Ansehen
            </OrganiserLink>
          ) : (
            <Button
              key={i}
              variant="neutral"
              onClick={() => {
                if (action.kind === 'reload') window.location.reload()
                else if (action.kind === 'retry') void apply()
                else if (action.kind === 'login') window.location.assign('/login')
                else setConfirm(action)
              }}
              disabled={
                action.kind === 'review-group' && state.submitted_groups?.includes(action.group_id)
              }
            >
              {action.kind === 'clear-label'
                ? 'Angabe entfernen …'
                : action.kind === 'review-group'
                  ? 'Änderungsgruppe prüfen …'
                  : action.kind === 'login'
                    ? 'Anmelden'
                    : action.kind === 'retry'
                      ? 'Erneut versuchen'
                      : 'Neu laden'}
            </Button>
          ),
        )}
      </div>
      {confirm?.kind === 'review-group' ? (
        <DraftGroupEditor group_id={confirm.group_id} onClose={() => setConfirm(null)} />
      ) : confirm ? (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setConfirm(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm?.kind === 'clear-label'
                  ? 'Diese Angabe entfernen?'
                  : 'Diese Änderungsgruppe verwerfen?'}
              </DialogTitle>
              <DialogDescription>
                {confirm?.kind === 'clear-label'
                  ? 'Die angezeigte Angabe wird nach erneuter Prüfung ihres aktuellen Standes entfernt.'
                  : 'Andere Änderungsgruppen bleiben erhalten.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="neutral">Behalten</Button>} />
              <Button onClick={execute}>Bestätigen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

export function AttentionNotices({
  scope,
  area,
  subject_id: subjectId,
  actionable = false,
  show_clear: showClear = false,
}: {
  scope?: AttentionScope
  area?: AttentionArea
  subject_id?: string
  actionable?: boolean
  show_clear?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [printing, setPrinting] = useState(() => window.matchMedia?.('print').matches ?? false)
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true)),
      after = () => setPrinting(false)
    const media = window.matchMedia?.('print'),
      change = (event: MediaQueryListEvent) => flushSync(() => setPrinting(event.matches))
    media?.addEventListener('change', change)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      media?.removeEventListener('change', change)
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  const result = useAttention(),
    items = selectAttention(result, { scope, area, subject_id: subjectId, actionable })
  if (items.length === 0)
    return showClear ? (
      <p>
        {attentionAllClear(result)
          ? 'Keine offenen Hinweise in den geprüften Daten.'
          : !attentionComplete(result)
            ? 'Die Prüfung ist noch nicht vollständig.'
            : null}
      </p>
    ) : null
  return (
    <ActionableNotice title={`${items.length} ${items.length === 1 ? 'Hinweis' : 'Hinweise'}`}>
      <ul className="space-y-3 print:hidden">
        {(expanded ? items : items.slice(0, 8)).map((item) => (
          <AttentionNoticeItem key={item.id} item={item} />
        ))}
      </ul>
      {printing ? (
        <ul data-slot="attention-print" className="hidden space-y-3 print:block">
          {items.map((item) => (
            <li key={item.id}>
              <h3>{item.wording.title}</h3>
              <AttentionDetails item={item} />
            </li>
          ))}
        </ul>
      ) : null}
      {items.length > 8 ? (
        <Button
          variant="neutral"
          className="print:hidden"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Weniger anzeigen' : `Alle ${items.length} Hinweise anzeigen`}
        </Button>
      ) : null}
    </ActionableNotice>
  )
}

function AttentionNoticeItem({ item }: { item: AttentionItem }) {
  const [open, setOpen] = useState(false)
  const { world, baseline_world: baselineWorld } = useOrganiser()
  return (
    <li>
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="cursor-pointer font-bold">
          {attentionLabel(item, world ?? baselineWorld ?? null)}{' '}
          <Badge
            tone={
              item.severity === 'error'
                ? 'danger'
                : item.severity === 'warning'
                  ? 'attention'
                  : 'neutral'
            }
          >
            {item.severity === 'error'
              ? 'Problem'
              : item.severity === 'warning'
                ? 'Prüfen'
                : 'Info'}
          </Badge>
        </summary>
        {open ? <AttentionDetails item={item} /> : null}
      </details>
    </li>
  )
}
