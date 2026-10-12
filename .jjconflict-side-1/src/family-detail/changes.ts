import type { World } from '../events/fold.js'
import type { EventDraft, JsonValue } from '../events/types.js'
import type { FamilyChange } from './model.js'

/** Shared intent semantics; only the organiser adapter and Worker import this module. */
export function familyChangeEvents(
  change: FamilyChange,
  world: World,
  familyId: string,
  actor: string,
  at: string,
  newPersonId?: string,
): EventDraft[] {
  const base = { actor, at }
  const label = (
    entityId: string,
    key: string,
    value: JsonValue | null,
    strength: 'required' | 'preferred' | null = null,
  ): EventDraft => ({
    ...base,
    subject: entityId,
    type: value === null ? 'LabelCleared' : 'LabelSet',
    payload:
      value === null
        ? { entity_id: entityId, key, value: null }
        : { entity_id: entityId, key, value, strength, note: null },
  })
  if (change.type === 'family') {
    const labels = world.labels_by_entity[familyId] ?? []
    const oldName = String(labels.find((item) => item.key === 'display-name')?.value ?? '')
    const oldEmail = String(labels.find((item) => item.key === 'email')?.value ?? '')
    const events: EventDraft[] = []
    if (oldName !== change.display_name)
      events.push({
        ...base,
        subject: familyId,
        type: 'FamilyDisplayNameChanged',
        payload: {
          family_id: familyId,
          old_display_name: oldName,
          new_display_name: change.display_name,
        },
      })
    if (change.email !== undefined && change.email !== oldEmail)
      events.push({
        ...base,
        subject: familyId,
        type: 'FamilyEmailChanged',
        payload: { family_id: familyId, old_email: oldEmail, new_email: change.email },
      })
    return events
  }
  if (change.type === 'person-create')
    return [
      {
        ...base,
        subject: familyId,
        type: 'PersonAdded',
        payload: { person_id: newPersonId!, family_id: familyId, ...change.person },
      },
    ]
  if (change.type === 'person-update')
    return [
      {
        ...base,
        subject: familyId,
        type: 'PersonUpdated',
        payload: { person_id: change.person_id, family_id: familyId, ...change.person },
      },
    ]
  if (change.type === 'person-remove')
    return [
      {
        ...base,
        subject: change.person_id,
        type: 'PersonWithdrawn',
        payload: { person_id: change.person_id, reason: null },
      },
    ]
  if (change.type === 'preference') {
    const events = [label(change.target_id, change.key, null)]
    if (
      world.labels_by_entity[change.target_id]?.some(
        (item) => item.key === `response-${change.key}`,
      ) ||
      (change.answer.answered && !change.answer.values.length)
    )
      events.push(label(change.target_id, `response-${change.key}`, null))
    for (const entry of change.answer.values)
      events.push(label(change.target_id, change.key, entry.value as JsonValue, entry.strength))
    if (change.answer.answered && !change.answer.values.length)
      events.push(label(change.target_id, `response-${change.key}`, true))
    return events
  }
  if (change.type === 'ranking')
    return [
      label(change.person_id, 'prefers-workshop', null),
      ...change.workshop_ids.map((workshopId, index) =>
        label(change.person_id, 'prefers-workshop', { workshop_id: workshopId, rank: index + 1 }),
      ),
    ]
  const key = change.type === 'signup' ? 'signed-up-for' : 'interested-in'
  const exists = (world.labels_by_entity[change.person_id] ?? []).some(
    (item) => item.key === key && item.value === change.workshop_id,
  )
  if (exists === change.selected) return []
  return change.selected
    ? [label(change.person_id, key, change.workshop_id)]
    : [
        {
          ...base,
          subject: change.person_id,
          type: 'LabelCleared',
          payload: { entity_id: change.person_id, key, value: change.workshop_id },
        },
      ]
}
