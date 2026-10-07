import { ChoiceField } from '../../../app/components/shared/ui/field.js'
import { SelectField, TextareaField } from '../../../app/components/shared/ui/field.js'
import { Button } from '../../../app/components/shared/ui/button.js'
import { useMemo, useState } from 'react'
import type { Entity, World, Label } from '../../../events/fold.js'
import type { EventDraft, JsonValue } from '../../../events/types.js'
import type {
  FamilyControlDefinition,
  FamilyPreferencesParams,
  OccasionProfile,
  Trait,
} from '../../../config/define.js'
import type { FeatureAudience } from '../../../config/features.js'
import { sectionOffered } from '../../../derive/features.js'
import type { PhaseView } from '../../../derive/phases.js'
import {
  familyControlDefinitions,
  familyControlLabelKey,
  familyPreferencesConfig,
} from '../index.js'
import { Card, CardContent, CardHeader } from '../../../app/components/shared/ui/card.js'

type Stage = (events: readonly EventDraft[]) => void

export type FamilyPreferencesControlsProps = {
  profile: Pick<OccasionProfile, 'meta' | 'traits' | 'modules'>
  family_id: string
  persons: readonly Entity[]
  world: World
  actor: string
  stage: Stage
  section_keys?: readonly string[]
  trait_keys?: readonly string[]
  person_id?: string
  defer_text?: boolean
  tri_state_no_answer?: boolean
  /** The renderer's audience; a governed section is offered only while its feature is effective. */
  audience?: FeatureAudience
  /** Effective features for the audience; absent offers every section (features.md §4). */
  effective_features?: ReadonlySet<string>
  /** The derived phase view, for Zieltermin, late, and closed notices (phases.md §8). */
  phases?: readonly PhaseView[]
}

type Target = { id: string; kind: 'family' | 'person' }

type TriStateValue = 'none' | 'indifferent' | 'required' | 'preferred'

const eventTime = (): string => new Date().toISOString()

function localized(
  value: string | Readonly<Record<string, string>> | null,
  locale: string,
  fallback: string,
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? value[fallback] ?? Object.values(value)[0] ?? ''
}

function labelsFor(world: World, target: Target): readonly Label[] {
  return world.labels_by_entity[target.id] ?? []
}

function labelValues(labels: readonly Label[], key: string): readonly JsonValue[] {
  return labels.filter((label) => label.key === key).map((label) => label.value)
}

function baseEvent(actor: string, target: Target, familyId: string) {
  return { at: eventTime(), actor, subject: target.kind === 'person' ? target.id : familyId }
}

function labelSet(
  actor: string,
  familyId: string,
  target: Target,
  key: string,
  value: JsonValue,
  strength: 'required' | 'preferred' | null,
): EventDraft {
  return {
    ...baseEvent(actor, target, familyId),
    type: 'LabelSet',
    payload: { entity_id: target.id, key, value, strength, note: null },
  }
}

function labelClear(
  actor: string,
  familyId: string,
  target: Target,
  key: string,
  value: JsonValue | null = null,
): EventDraft {
  return {
    ...baseEvent(actor, target, familyId),
    type: 'LabelCleared',
    payload: { entity_id: target.id, key, value },
  }
}

const controlLabelKey = familyControlLabelKey

function controlTitle(
  title: string | Readonly<Record<string, string>>,
  meta: OccasionProfile['meta'],
): string {
  return localized(title, meta.locale, meta.fallback_locale)
}

function DeferredTextControl({
  title,
  help,
  current,
  disabled,
  actor,
  family_id: familyId,
  target,
  trait_key: traitKey,
  stage,
}: {
  title: string
  help: string | null
  current: Label | undefined
  disabled: boolean
  actor: string
  family_id: string
  target: Target
  trait_key: string
  stage: Stage
}) {
  const currentText = typeof current?.value === 'string' ? current.value : ''
  const [draft, setDraft] = useState(currentText)
  const dirty = draft !== currentText
  return (
    <div className="grid gap-2">
      <TextareaField
        label={title}
        hint={<>{help ? <span className="text-sm">{help}</span> : null}</>}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="neutral"
          type="button"
          disabled={!dirty || disabled}
          onClick={() => {
            const value = draft.trim()
            stage([
              value
                ? labelSet(actor, familyId, target, traitKey, value, null)
                : labelClear(actor, familyId, target, traitKey),
            ])
          }}
        >
          Speichern
        </Button>
        <Button
          variant="neutral"
          type="button"
          disabled={!dirty || disabled}
          onClick={() => setDraft(currentText)}
        >
          Verwerfen
        </Button>
        {dirty ? <span className="text-sm font-bold">Änderungen offen</span> : null}
      </div>
    </div>
  )
}

function TraitControl({
  trait_key: traitKey,
  trait,
  target,
  family_id: familyId,
  labels,
  persons,
  world,
  actor,
  stage,
  meta,
  defer_text: deferText,
  tri_state_no_answer: triStateNoAnswer,
}: {
  trait_key: string
  trait: Trait
  target: Target
  family_id: string
  labels: readonly Label[]
  persons: readonly Entity[]
  world: World
  actor: string
  stage: Stage
  meta: OccasionProfile['meta']
  defer_text?: boolean
  tri_state_no_answer?: boolean
}) {
  const facing = trait.family_facing!
  const title = controlTitle(facing.title, meta)
  const help = facing.help ? controlTitle(facing.help, meta) : null
  const values =
    trait.value.kind === 'enum'
      ? trait.value.values
      : trait.value.kind === 'ref'
        ? (world.entities_by_kind[trait.value.entity_kind] ?? []).map((entity) => entity.id)
        : []
  const current = labels.find((label) => label.key === traitKey)
  const validity = trait.valid_for?.({
    label: (key) => labels.find((label) => label.key === key)?.value,
  })
  const disabled = validity !== undefined && validity !== true
  const disabledReason = disabled
    ? typeof validity === 'string'
      ? validity
      : 'Diese Angabe ist für diese Person derzeit nicht verfügbar.'
    : null
  const [unpersistedTriState, setUnpersistedTriState] = useState<TriStateValue>(
    current?.strength ?? (triStateNoAnswer ? 'none' : 'indifferent'),
  )

  if (facing.control === 'tri-state') {
    const selected = current?.strength ?? unpersistedTriState
    const choices: readonly { value: TriStateValue; label: string }[] = [
      ...(triStateNoAnswer ? [{ value: 'none' as const, label: 'Keine Angabe' }] : []),
      ...(facing.strengths?.includes('required')
        ? [{ value: 'required' as const, label: facing.invert ? 'Auf keinen Fall' : 'Unbedingt' }]
        : []),
      ...(facing.strengths?.includes('preferred')
        ? [{ value: 'preferred' as const, label: facing.invert ? 'Lieber nicht' : 'Gerne' }]
        : []),
      { value: 'indifferent' as const, label: facing.invert ? 'Gerne' : 'Egal' },
    ] as const
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{title}</legend>
        {help ? <p className="text-sm">{help}</p> : null}
        {disabledReason ? <p role="note">{disabledReason}</p> : null}
        <div className="flex flex-wrap gap-3">
          {choices.map((choice) => (
            <ChoiceField
              key={choice.value}
              className="flex min-h-11 items-center gap-2"
              type="radio"
              name={`${target.id}-${traitKey}`}
              checked={selected === choice.value}
              onChange={() => {
                setUnpersistedTriState(choice.value)
                if (choice.value === 'indifferent' || choice.value === 'none') {
                  if (current) stage([labelClear(actor, familyId, target, traitKey)])
                  return
                }
                const value = values[0]
                if (!value || (current?.value === value && current.strength === choice.value))
                  return
                stage([
                  labelSet(
                    actor,
                    familyId,
                    target,
                    traitKey,
                    value,
                    choice.value as 'required' | 'preferred',
                  ),
                ])
              }}
              label={<>{choice.label}</>}
            />
          ))}
        </div>
      </fieldset>
    )
  }

  if (facing.control === 'toggle') {
    const checked = current?.value === true
    return (
      <ChoiceField
        className="flex min-h-11 items-center gap-3"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.checked) {
            if (!checked) stage([labelSet(actor, familyId, target, traitKey, true, null)])
          } else if (checked) stage([labelClear(actor, familyId, target, traitKey)])
        }}
        label={
          <>
            <span>
              <span className="block font-bold">{title}</span>
              {help ? <span className="block text-sm">{help}</span> : null}
              {disabledReason ? <span className="block text-sm">{disabledReason}</span> : null}
            </span>
          </>
        }
      />
    )
  }

  if (facing.control === 'free-text') {
    if (deferText) {
      return (
        <DeferredTextControl
          title={title}
          help={help}
          current={current}
          disabled={disabled}
          actor={actor}
          family_id={familyId}
          target={target}
          trait_key={traitKey}
          stage={stage}
        />
      )
    }
    return (
      <TextareaField
        label={title}
        hint={<>{help ? <span className="text-sm">{help}</span> : null}</>}
        defaultValue={typeof current?.value === 'string' ? current.value : ''}
        disabled={disabled}
        onBlur={(event) => {
          const value = event.target.value.trim()
          if (!value) {
            if (current) stage([labelClear(actor, familyId, target, traitKey)])
          } else if (current?.value !== value) {
            stage([labelSet(actor, familyId, target, traitKey, value, null)])
          }
        }}
      />
    )
  }

  if (facing.control === 'choice') {
    const choices = trait.value.kind === 'enum' ? trait.value.values : []
    const selected = typeof current?.value === 'string' ? current.value : ''
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{title}</legend>
        {help ? <p className="text-sm">{help}</p> : null}
        <div className="flex flex-wrap gap-2">
          <ChoiceField
            className="flex min-h-11 items-center gap-2 rounded-base border-2 border-border px-3 font-bold"
            type="radio"
            name={`${target.id}-${traitKey}`}
            checked={selected === ''}
            onChange={() => current && stage([labelClear(actor, familyId, target, traitKey)])}
            label={<>Keine Angabe</>}
          />
          {choices.map((choice) => {
            const copy = trait.kind === 'property' ? trait.copy?.[choice] : undefined
            const label = copy ? controlTitle(copy, meta) : choice
            return (
              <ChoiceField
                key={choice}
                className="flex min-h-11 items-center gap-2 rounded-base border-2 border-border px-3 font-bold"
                type="radio"
                name={`${target.id}-${traitKey}`}
                checked={selected === choice}
                onChange={() => {
                  if (selected !== choice)
                    stage([labelSet(actor, familyId, target, traitKey, choice, null)])
                }}
                label={<>{label}</>}
              />
            )
          })}
        </div>
        {selected === 'other' ? (
          <p className="text-sm">Was genau, gerne unten bei den Hinweisen.</p>
        ) : null}
      </fieldset>
    )
  }

  if (facing.control === 'family-picker') {
    const selected = new Set(
      labelValues(labels, traitKey).filter((value): value is string => typeof value === 'string'),
    )
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{title}</legend>
        {help ? <p className="text-sm">{help}</p> : null}
        {disabledReason ? <p role="note">{disabledReason}</p> : null}
        {world.families.map((family) => {
          const familyLabels = world.labels_by_entity[family.id] ?? []
          return (
            <ChoiceField
              key={family.id}
              className="flex min-h-11 items-center gap-3"
              type="checkbox"
              checked={selected.has(family.id)}
              onChange={(event) => {
                const next = new Set(selected)
                if (event.target.checked) next.add(family.id)
                else next.delete(family.id)
                const events: EventDraft[] = [labelClear(actor, familyId, target, traitKey)]
                for (const value of [...next].sort())
                  events.push(labelSet(actor, familyId, target, traitKey, value, null))
                stage(events)
              }}
              label={<>{labelText(familyLabels, 'display-name') || family.id}</>}
            />
          )
        })}
      </fieldset>
    )
  }

  if (facing.control === 'person-picker') {
    const selected = new Set(
      labelValues(labels, traitKey).filter((value): value is string => typeof value === 'string'),
    )
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{title}</legend>
        {help ? <p className="text-sm">{help}</p> : null}
        {disabledReason ? <p role="note">{disabledReason}</p> : null}
        {persons.map((person) => {
          const personLabels = world.labels_by_entity[person.id] ?? []
          const personName =
            `${labelText(personLabels, 'given-name')} ${labelText(personLabels, 'family-name')}`.trim()
          return (
            <ChoiceField
              key={person.id}
              className="flex min-h-11 items-center gap-3"
              type="checkbox"
              checked={selected.has(person.id)}
              onChange={(event) => {
                const next = new Set(selected)
                if (event.target.checked) next.add(person.id)
                else next.delete(person.id)
                const events: EventDraft[] = [labelClear(actor, familyId, target, traitKey)]
                for (const value of [...next].sort())
                  events.push(labelSet(actor, familyId, target, traitKey, value, 'required'))
                stage(events)
              }}
              label={<>{personName || person.id}</>}
            />
          )
        })}
      </fieldset>
    )
  }

  return (
    <SelectField
      label={title}
      hint={
        <>
          {help ? <span className="text-sm">{help}</span> : null}
          {disabledReason ? <span className="text-sm">{disabledReason}</span> : null}
        </>
      }
      value={typeof current?.value === 'string' ? current.value : ''}
      disabled={disabled}
      onChange={(event) => {
        const value = event.target.value
        if (!value) {
          if (current) stage([labelClear(actor, familyId, target, traitKey)])
        } else if (current?.value !== value) {
          stage([labelSet(actor, familyId, target, traitKey, value, facing.strengths?.[0] ?? null)])
        }
      }}
    >
      <option value="">—</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {trait.value.kind === 'ref'
            ? labelText(world.labels_by_entity[value] ?? [], 'display-name') || value
            : value}
        </option>
      ))}
    </SelectField>
  )
}

function labelText(labels: readonly Label[], key: string): string {
  const value = labels.find((label) => label.key === key)?.value
  return typeof value === 'string' ? value : ''
}

function moduleControlTitle(
  control: FamilyControlDefinition,
  params: FamilyPreferencesParams,
  meta: OccasionProfile['meta'],
): string {
  return controlTitle(
    params.module_controls.find(({ key }) => key === control.key)?.title ?? control.key,
    meta,
  )
}

function WorkshopControls({
  control,
  params,
  target,
  family_id: familyId,
  labels,
  world,
  actor,
  stage,
  meta,
  person_name: personName,
}: {
  control: FamilyControlDefinition
  params: FamilyPreferencesParams
  target: Target
  family_id: string
  labels: readonly Label[]
  world: World
  actor: string
  stage: Stage
  meta: OccasionProfile['meta']
  person_name: string
}) {
  const title = moduleControlTitle(control, params, meta)
  const help = params.module_controls.find(({ key }) => key === control.key)?.help
  const labelKey = controlLabelKey(control)
  const workshops = (world.entities_by_kind.workshop ?? []).filter((workshop) => {
    const workshopLabels = world.labels_by_entity[workshop.id] ?? []
    return workshopLabels.find((label) => label.key === 'cancelled')?.value !== true
  })
  const current = new Set(
    labelValues(labels, labelKey).filter((value): value is string => typeof value === 'string'),
  )
  if (control.control === 'ranking') {
    const rankingLabels = labels.filter((label) => label.key === labelKey)
    const selected = new Map<number, string>()
    for (const label of rankingLabels) {
      if (typeof label.value !== 'object' || label.value === null || Array.isArray(label.value))
        continue
      const rank = label.value.rank
      const workshopId = label.value.workshop_id
      if (typeof rank === 'number' && typeof workshopId === 'string') selected.set(rank, workshopId)
    }
    return (
      <fieldset className="grid gap-2">
        <legend className="font-bold">{title}</legend>
        {help ? <p className="text-sm">{controlTitle(help, meta)}</p> : null}
        {[1, 2, 3].map((rank) => (
          <SelectField
            key={rank}
            label={`${rank}. Wunsch`}
            value={selected.get(rank) ?? ''}
            onChange={(event) => {
              const next = new Map(selected)
              if (event.target.value) next.set(rank, event.target.value)
              else next.delete(rank)
              const events: EventDraft[] = [labelClear(actor, familyId, target, labelKey)]
              for (const [nextRank, workshopId] of [...next.entries()].sort(([a], [b]) => a - b))
                events.push(
                  labelSet(
                    actor,
                    familyId,
                    target,
                    labelKey,
                    { workshop_id: workshopId, rank: nextRank },
                    null,
                  ),
                )
              stage(events)
            }}
          >
            <option value="">—</option>
            {workshops.map((workshop) => (
              <option key={workshop.id} value={workshop.id}>
                {labelText(world.labels_by_entity[workshop.id] ?? [], 'title') || workshop.id}
              </option>
            ))}
          </SelectField>
        ))}
      </fieldset>
    )
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="font-bold">
        {personName} · {title}
      </legend>
      {help ? <p className="text-sm">{controlTitle(help, meta)}</p> : null}
      {workshops.map((workshop) => {
        const workshopLabels = world.labels_by_entity[workshop.id] ?? []
        const mode = labelText(workshopLabels, 'participation-mode')
        const available =
          control.control === 'workshop-sign-up' ? mode === 'sign-up' : mode === 'interest'
        if (!available) return null
        return (
          <ChoiceField
            key={workshop.id}
            className="flex min-h-11 items-center gap-3"
            type="checkbox"
            checked={current.has(workshop.id)}
            onChange={(event) => {
              if (event.target.checked)
                stage([labelSet(actor, familyId, target, labelKey, workshop.id, null)])
              else stage([labelClear(actor, familyId, target, labelKey, workshop.id)])
            }}
            label={<>{labelText(workshopLabels, 'title') || workshop.id}</>}
          />
        )
      })}
    </fieldset>
  )
}

function formatPhaseDate(value: string, meta: OccasionProfile['meta']): string {
  return new Intl.DateTimeFormat(meta.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ['timeZone']: meta.timezone,
  }).format(new Date(value))
}

/**
 * The notice for a section's governing phase (spec/architecture/phases.md §8). A Zieltermin
 * never reads as a cut-off; only a closed area names the organiser decision. Without a phase
 * view the static Zieltermin is shown.
 */
export function phaseNoticeText(
  section: FamilyPreferencesParams['sections'][number],
  meta: OccasionProfile['meta'],
  audience: FeatureAudience,
  phases?: readonly PhaseView[],
): string | null {
  if (!section.phase) return null
  const view = phases?.find(({ phase }) => phase === section.phase)
  const target =
    view?.target_at ??
    meta.phase_dates?.find(({ phase }) => phase === section.phase)?.target_at ??
    null
  const title = localized(section.title, meta.locale, meta.fallback_locale)
  if (view?.status === 'closed')
    return audience === 'organiser'
      ? `${title}: Festgelegt${view.closed ? ` am ${formatPhaseDate(view.closed.at, meta)}` : ''}. Änderungen hier erscheinen als Abweichung vom festgelegten Ergebnis.`
      : `${title}: Festgelegt. Für Änderungen wende dich bitte an das Organisationsteam.`
  if (view?.status === 'upcoming') return null
  if (!target) return null
  if (view?.status === 'late')
    return `Zieltermin: ${formatPhaseDate(target, meta)} (überschritten). Änderungen bleiben möglich, werden aber als verspätet markiert.${section.late_contact ? ` ${localized(section.late_contact, meta.locale, meta.fallback_locale)}` : ''}`
  return `Zieltermin: ${formatPhaseDate(target, meta)}. Änderungen bleiben danach möglich, werden aber als verspätet markiert.`
}

export function FamilyPreferenceSection({
  profile,
  family_id: familyId,
  persons,
  world,
  actor,
  stage,
  section,
  person_id: personId,
  trait_keys: traitKeys,
  defer_text: deferText,
  tri_state_no_answer: triStateNoAnswer,
  audience = 'family',
  phases,
}: FamilyPreferencesControlsProps & {
  section: FamilyPreferencesParams['sections'][number]
}) {
  const params = familyPreferencesConfig(profile)
  const definitions = useMemo(
    () => new Map(familyControlDefinitions(profile).map((item) => [item.key, item])),
    [profile],
  )
  const familyTarget: Target = { id: familyId, kind: 'family' }
  const notice = phaseNoticeText(section, profile.meta, audience, phases)
  const scopedPersons = personId ? persons.filter((person) => person.id === personId) : persons

  return (
    <Card className="bg-secondary-background">
      <CardHeader>
        <h3 className="text-xl">
          {localized(section.title, profile.meta.locale, profile.meta.fallback_locale)}
        </h3>
        {section.intro ? (
          <p>{localized(section.intro, profile.meta.locale, profile.meta.fallback_locale)}</p>
        ) : null}
        {notice ? <p role="note">{notice}</p> : null}
      </CardHeader>
      <CardContent className="grid gap-5">
        {section.traits
          .filter((traitKey) => !traitKeys || traitKeys.includes(traitKey))
          .map((traitKey) => {
            const trait = profile.traits[traitKey]
            if (!trait?.family_facing) return null
            const targets =
              trait.family_facing.scope === 'family'
                ? [familyTarget]
                : scopedPersons.map((person) => ({ id: person.id, kind: 'person' as const }))
            return targets.map((target) => (
              <TraitControl
                key={`${traitKey}-${target.id}`}
                trait_key={traitKey}
                trait={trait}
                target={target}
                family_id={familyId}
                labels={labelsFor(world, target)}
                persons={scopedPersons}
                world={world}
                actor={actor}
                stage={stage}
                meta={profile.meta}
                defer_text={deferText}
                tri_state_no_answer={triStateNoAnswer}
              />
            ))
          })}
        {params.module_controls
          .filter((control) => control.section === section.key)
          .map((control) => {
            const definition = definitions.get(control.key)
            if (!definition) return null
            return scopedPersons.map((person) => (
              <WorkshopControls
                key={`${control.key}-${person.id}`}
                control={definition}
                params={params}
                target={{ id: person.id, kind: 'person' }}
                family_id={familyId}
                labels={labelsFor(world, { id: person.id, kind: 'person' })}
                world={world}
                actor={actor}
                stage={stage}
                meta={profile.meta}
                person_name={
                  `${labelText(labelsFor(world, { id: person.id, kind: 'person' }), 'given-name')} ${labelText(labelsFor(world, { id: person.id, kind: 'person' }), 'family-name')}`.trim() ||
                  person.id
                }
              />
            ))
          })}
      </CardContent>
    </Card>
  )
}

export function FamilyPreferencesControls({
  profile,
  section_keys: sectionKeys,
  ...props
}: FamilyPreferencesControlsProps) {
  const params = familyPreferencesConfig(profile)
  const sections = params.sections.filter(
    (section) =>
      (!sectionKeys || sectionKeys.includes(section.key)) &&
      (!props.effective_features ||
        sectionOffered(
          section,
          props.audience ?? 'family',
          profile.modules,
          props.effective_features,
        )),
  )
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <FamilyPreferenceSection key={section.key} profile={profile} section={section} {...props} />
      ))}
    </div>
  )
}
