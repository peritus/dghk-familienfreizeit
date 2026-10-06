import { activeProfile } from '../../../config/index.js'
import type { AreaId } from '../../../config/phases.js'
import { closedAreaState, subjectName, type ClosedAreaState } from '../closed-areas.js'
import { useOrganiser } from '../context.js'
import { PhaseDecisionAction } from './phase-decision.js'

const areaLabels: Record<AreaId, { name: string; result: string }> = {
  accommodation: { name: 'Unterkunft', result: 'die Zimmerzuordnung' },
  workshops: { name: 'Workshops', result: 'Programm und Teilnahme' },
}

const changeLabels = { added: 'neu', removed: 'entfällt', moved: 'geändert' } as const

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(activeProfile.meta.locale, {
    ['dateStyle']: 'long',
    ['timeStyle']: 'short',
    ['timeZone']: activeProfile.meta.timezone,
  }).format(new Date(value))
}

/** The organiser's derived state of one area, or null while the world is not loaded. */
export function useClosedArea(area: AreaId): ClosedAreaState | null {
  const { world, current_plan: plan, phases } = useOrganiser()
  if (!world) return null
  return closedAreaState({
    modules: activeProfile.modules,
    world,
    plan: plan ?? null,
    phases: phases ?? [],
    area,
  })
}

function ChangeList({ state }: { state: ClosedAreaState }) {
  const { world } = useOrganiser()
  const changes = state.difference?.changes ?? []
  if (changes.length === 0) return <p>Keine Abweichung.</p>
  return (
    <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
      {changes.map((change) => (
        <li key={`${change.kind}-${change.subject_id}-${change.before}-${change.after}`}>
          <strong>{subjectName(world!, change.subject_id)}</strong>{' '}
          <span className="text-muted">({changeLabels[change.kind]})</span>:{' '}
          {subjectName(world!, change.before)} → {subjectName(world!, change.after)}
        </li>
      ))}
    </ul>
  )
}

/**
 * Festlegen, erneutes Festlegen and Wieder öffnen for one area (phases.md §5, §7). The review
 * previews the result the current derivation would record; the Worker computes the stored
 * result when the staged closing is applied.
 */
export function AreaClosingActions({ area }: { area: AreaId }) {
  const { state: organiser, stage } = useOrganiser()
  const state = useClosedArea(area)
  if (!state || !organiser.principal_email) return null
  const actor = organiser.principal_email
  const labels = areaLabels[area]
  const stageEvent = (type: string) =>
    stage([{ at: new Date().toISOString(), actor, subject: null, type, payload: {} }])
  if (state.pending) return <p role="status">Das Ergebnis wird festgelegt …</p>
  const blocked = state.blocking.length > 0 || state.candidate === null
  const families = state.difference?.affected_family_ids.length ?? 0
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PhaseDecisionAction
        label={state.closed ? 'Erneut festlegen' : 'Festlegen'}
        title={`${labels.name} festlegen?`}
        description={
          state.latest
            ? `Familien sehen danach ${labels.result} in der neuen Fassung. Verglichen mit der Festlegung vom ${formatTime(state.latest.at)}:`
            : `Familien sehen danach ${labels.result}. Das ist die erste Festlegung.`
        }
        confirm_label="Festlegen"
        disabled={blocked}
        on_confirm={() => stageEvent(state.contribution.close_event)}
      >
        <div className="space-y-3">
          <p className="font-bold">
            {families} {families === 1 ? 'Familie betroffen' : 'Familien betroffen'}
          </p>
          <ChangeList state={state} />
          {state.blocking.length > 0 ? (
            <div role="alert" className="space-y-1">
              <p className="font-bold">Prüfung erforderlich</p>
              <ul className="list-disc pl-5 text-sm">
                {state.blocking.map((finding) => (
                  <li key={`${finding.id}-${finding.subject_id ?? ''}`}>{finding.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </PhaseDecisionAction>
      {state.closed ? (
        <PhaseDecisionAction
          label="Wieder öffnen"
          title={`${labels.name} wieder öffnen?`}
          description="Familien können ihre Angaben danach wieder ändern. Bis zur nächsten Festlegung sehen sie weiterhin das zuletzt festgelegte Ergebnis."
          confirm_label="Wieder öffnen"
          on_confirm={() => stageEvent(state.contribution.reopen_event)}
        />
      ) : null}
    </div>
  )
}

/** The difference between the latest closed result and the current derivation (phases.md §7). */
export function ClosedAreaDifferences({ area }: { area: AreaId }) {
  const state = useClosedArea(area)
  if (!state?.latest || state.pending) return null
  const changes = state.difference?.changes ?? []
  return (
    <section
      aria-label={`Abweichungen ${areaLabels[area].name}`}
      className="space-y-2 rounded-base border-2 border-border bg-secondary-background p-4"
    >
      <h2 className="font-bold">
        {changes.length === 0
          ? 'Keine Abweichung vom festgelegten Ergebnis'
          : `${changes.length} ${changes.length === 1 ? 'Abweichung' : 'Abweichungen'} vom festgelegten Ergebnis`}
      </h2>
      <p className="text-sm text-muted">Festgelegt am {formatTime(state.latest.at)}</p>
      {changes.length > 0 ? <ChangeList state={state} /> : null}
    </section>
  )
}
