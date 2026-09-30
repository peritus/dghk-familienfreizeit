import { activeProfile } from '../../../config/index.js'
import type { PropertyTrait, Trait, LocalizedText } from '../../../config/define.js'
import type { Label } from '../../../events/fold.js'
import type { EventDraft, JsonValue } from '../../../events/types.js'

export type TraitInput = string | number | boolean | null

export type RoomTraitValues = Readonly<Record<string, TraitInput>>

export type RoomPropertyDefinition = {
  key: string
  trait: PropertyTrait
}

export const roomPropertyDefinitions: readonly RoomPropertyDefinition[] = Object.entries(
  activeProfile.traits,
).flatMap(([key, trait]) =>
  trait.kind === 'property' && trait.scopes.includes('room') ? [{ key, trait }] : [],
)

export function roomTraitDefaults(): Record<string, TraitInput> {
  return Object.fromEntries(
    roomPropertyDefinitions.map(({ key, trait }) => [
      key,
      (trait.default ?? (trait.value.kind === 'bool' ? false : '')) as TraitInput,
    ]),
  )
}

export function roomTraitValuesFromLabels(labels: readonly Label[]): Record<string, TraitInput> {
  const defaults = roomTraitDefaults()
  for (const { key } of roomPropertyDefinitions) {
    const value = labels.find((label) => label.key === key)?.value
    if (value !== undefined) defaults[key] = value as TraitInput
  }
  return defaults
}

export function roomTraitLabelChanges(
  entityId: string,
  values: RoomTraitValues,
  currentLabels: readonly Label[] = [],
): readonly Pick<EventDraft, 'type' | 'payload'>[] {
  const currentKeys = new Set(currentLabels.map((label) => label.key))
  const changes: Pick<EventDraft, 'type' | 'payload'>[] = []
  for (const { key, trait } of roomPropertyDefinitions) {
    const value = normalizeTraitValue(trait, values[key] ?? null)
    if (value === null) {
      if (currentKeys.has(key))
        changes.push({
          type: 'LabelCleared',
          payload: { entity_id: entityId, key, value: null },
        })
      continue
    }
    changes.push({
      type: 'LabelSet',
      payload: { entity_id: entityId, key, value, strength: null, note: null },
    })
  }
  return changes
}

export function validateRoomTraitValues(values: RoomTraitValues): string | null {
  for (const { key, trait } of roomPropertyDefinitions)
    if (
      trait.cardinality === 'exactly-one' &&
      normalizeTraitValue(trait, values[key] ?? null) === null
    )
      return `${labelText(trait.title)} ist erforderlich.`
  return null
}

export function normalizeTraitValue(trait: Trait, raw: TraitInput): JsonValue | null {
  if (raw === null || (typeof raw === 'string' && raw.trim() === '')) return null
  if (trait.kind !== 'property') return null
  if (trait.value.kind === 'bool') return raw === true || raw === 'true'
  if (trait.value.kind === 'integer' || trait.value.kind === 'decimal') {
    const number = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(number) ? number : null
  }
  return String(raw)
}

export function labelText(copy: LocalizedText): string {
  if (typeof copy === 'string') return copy
  return copy[activeProfile.meta.locale] ?? copy[activeProfile.meta.fallback_locale] ?? ''
}

export function traitOptions(
  trait: PropertyTrait,
): readonly { value: string; label: string }[] | null {
  if (trait.value.kind !== 'enum') return null
  return trait.value.values.map((value) => ({
    value,
    label: trait.copy?.[value] ? labelText(trait.copy[value]) : value,
  }))
}

/**
 * Places per bed follow from the bed type alone (D18/D19): 'single' sleeps
 * one, 'double' and 'bunk' sleep two. There is no independent "Schlafplätze"
 * input, so a bed can no longer claim a place count its type doesn't allow.
 */
export function sleepsForBedType(bedType: string): 1 | 2 {
  return bedType === 'single' ? 1 : 2
}
