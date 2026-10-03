import { useMemo } from 'react'
import type { Entity, World, Label } from '../../../events/fold.js'
import type { EventDraft, JsonValue } from '../../../events/types.js'
import type {
  FamilyControlDefinition,
  FamilyPreferencesParams,
  OccasionProfile,
  Trait,
} from '../../../config/define.js'
import { familyControlDefinitions, familyPreferencesConfig } from '../index.js'
import { Card, CardContent, CardHeader } from '../../../app/components/shared/ui/card.js'

type Stage = (events: readonly EventDraft[]) => void

type FamilyPreferencesControlsProps = {
  profile: Pick<OccasionProfile, 'meta' | 'traits' | 'modules'>
  family_id: string
  persons: readonly Entity[]
  world: World
  actor: string
  stage: Stage
}

type Target = { id: string; kind: 'family' | 'person' }

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

function controlLabelKey(control: FamilyControlDefinition): string {
  if (control.control === 'workshop-sign-up') return 'signed-up-for'
  if (control.control === 'workshop-interest') return 'interested-in'
  return control.key
}

function controlTitle(
  title: string | Readonly<Record<string, string>>,
  meta: OccasionProfile['meta'],
): string {
  return localized(title, meta.locale, meta.fallback_locale)
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

  if (facing.control === 'tri-state') {
    const selected = current?.strength ?? 'indifferent'
    const choices = [
      ...(facing.strengths?.includes('required')
        ? [{ value: 'required', label: facing.invert ? 'Auf keinen Fall' : 'Unbedingt' }]
        : []),
      ...(facing.strengths?.includes('preferred')
        ? [{ value: 'preferred', label: facing.invert ? 'Lieber nicht' : 'Gerne' }]
        : []),
      { value: 'indifferent', label: facing.invert ? 'Gerne' : 'Egal' },
    ] as const
    return (
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="font-bold">{title}</legend>
        {help ? <p className="text-sm">{help}</p> : null}
        {disabledReason ? <p role="note">{disabledReason}</p> : null}
        <div className="flex flex-wrap gap-3">
          {choices.map((choice) => (
            <label key={choice.value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name={`${target.id}-${traitKey}`}
                checked={selected === choice.value}
                onChange={() => {
                  if (choice.value === 'indifferent') {
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
              />
              {choice.label}
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (facing.control === 'toggle') {
    const checked = current?.value === true
    return (
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.checked) {
              if (!checked) stage([labelSet(actor, familyId, target, traitKey, true, null)])
            } else if (checked) stage([labelClear(actor, familyId, target, traitKey)])
          }}
        />
        <span>
          <span className="block font-bold">{title}</span>
          {help ? <span className="block text-sm">{help}</span> : null}
          {disabledReason ? <span className="block text-sm">{disabledReason}</span> : null}
        </span>
      </label>
    )
  }

  if (facing.control === 'free-text') {
    return (
      <label className="grid gap-1">
        <span className="font-bold">{title}</span>
        {help ? <span className="text-sm">{help}</span> : null}
        <textarea
          className="min-h-24 rounded border-2 border-border px-3 py-2"
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
      </label>
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
            <label key={family.id} className="flex min-h-11 items-center gap-3">
              <input
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
              />
              {labelText(familyLabels, 'display-name') || family.id}
            </label>
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
            <label key={person.id} className="flex min-h-11 items-center gap-3">
              <input
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
              />
              {personName || person.id}
            </label>
          )
        })}
      </fieldset>
    )
  }

  return (
    <label className="grid gap-1">
      <span className="font-bold">{title}</span>
      {help ? <span className="text-sm">{help}</span> : null}
      <select
        className="min-h-11 rounded border-2 border-border px-3"
        value={typeof current?.value === 'string' ? current.value : ''}
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value
          if (!value) {
            if (current) stage([labelClear(actor, familyId, target, traitKey)])
          } else if (current?.value !== value) {
            stage([
              labelSet(actor, familyId, target, traitKey, value, facing.strengths?.[0] ?? null),
            ])
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
      </select>
      {disabledReason ? <span className="text-sm">{disabledReason}</span> : null}
    </label>
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
          <label key={rank} className="grid gap-1">
            <span>{rank}. Wunsch</span>
            <select
              className="min-h-11 rounded border-2 border-border px-3"
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
            </select>
          </label>
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
          <label key={workshop.id} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={current.has(workshop.id)}
              onChange={(event) => {
                if (event.target.checked)
                  stage([labelSet(actor, familyId, target, labelKey, workshop.id, null)])
                else stage([labelClear(actor, familyId, target, labelKey, workshop.id)])
              }}
            />
            {labelText(workshopLabels, 'title') || workshop.id}
          </label>
        )
      })}
    </fieldset>
  )
}

function deadlineNotice(
  section: FamilyPreferencesParams['sections'][number],
  params: FamilyPreferencesParams,
  meta: OccasionProfile['meta'],
): string | null {
  if (!section.deadline_scope) return null
  const deadline = meta.deadlines?.[section.deadline_scope]
  if (!deadline) return null
  const contact = params.deadline_contact[section.deadline_scope]
  const passed = Date.now() > Date.parse(deadline)
  return `${passed ? 'Frist vorbei' : `Frist bis ${new Intl.DateTimeFormat(meta.locale).format(new Date(deadline))}`}. ${localized(contact, meta.locale, meta.fallback_locale)}`
}

export function FamilyPreferencesControls({
  profile,
  family_id: familyId,
  persons,
  world,
  actor,
  stage,
}: FamilyPreferencesControlsProps) {
  const params = familyPreferencesConfig(profile)
  const definitions = useMemo(
    () => new Map(familyControlDefinitions(profile).map((item) => [item.key, item])),
    [profile],
  )
  const familyTarget: Target = { id: familyId, kind: 'family' }

  return (
    <div className="space-y-4">
      {params.sections.map((section) => (
        <Card key={section.key} className="bg-secondary-background">
          <CardHeader>
            <h3 className="text-xl">
              {localized(section.title, profile.meta.locale, profile.meta.fallback_locale)}
            </h3>
            {section.intro ? (
              <p>{localized(section.intro, profile.meta.locale, profile.meta.fallback_locale)}</p>
            ) : null}
            {deadlineNotice(section, params, profile.meta) ? (
              <p role="note">{deadlineNotice(section, params, profile.meta)}</p>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-5">
            {section.traits.map((traitKey) => {
              const trait = profile.traits[traitKey]
              if (!trait?.family_facing) return null
              const targets =
                trait.family_facing.scope === 'family'
                  ? [familyTarget]
                  : persons.map((person) => ({ id: person.id, kind: 'person' as const }))
              return targets.map((target) => (
                <TraitControl
                  key={`${traitKey}-${target.id}`}
                  trait_key={traitKey}
                  trait={trait}
                  target={target}
                  family_id={familyId}
                  labels={labelsFor(world, target)}
                  persons={persons}
                  world={world}
                  actor={actor}
                  stage={stage}
                  meta={profile.meta}
                />
              ))
            })}
            {params.module_controls
              .filter((control) => control.section === section.key)
              .map((control) => {
                const definition = definitions.get(control.key)
                if (!definition) return null
                return persons.map((person) => (
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
      ))}
    </div>
  )
}
