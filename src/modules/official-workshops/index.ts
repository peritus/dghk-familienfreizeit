import { z } from 'zod'
import { defineModule } from '../define.js'
import type { Entity, World, ModuleFoldCapability, ValidationWorld } from '../../events/fold.js'
import type { Diagnostic } from '../../events/resolver.js'
import type { JsonValue } from '../../events/types.js'
import {
  fixedWorkshopIdFromToken,
  isFixedWorkshopAttendanceToken,
} from './fixed-attendance-token.js'

export { workshopEligibilityFailure } from './eligibility.js'

export {
  fixedWorkshopAttendanceToken,
  fixedWorkshopIdFromToken,
  isFixedWorkshopAttendanceToken,
} from './fixed-attendance-token.js'

export const workshopModes = ['assigned', 'sign-up', 'interest'] as const

export type WorkshopMode = (typeof workshopModes)[number]

export type OfficialWorkshopsParams = {
  audience_values: readonly string[]
  available_modes: readonly WorkshopMode[]
  excluded_roles: readonly string[]
}

export type WorkshopRecord = {
  id: string
  title: string
  description: string
  audience: string
  age_min: number
  age_max: number
  capacity: number
  mode: WorkshopMode
  leader_ids: readonly string[]
  needs: readonly string[]
  cancelled: boolean
  cancellation_reason: string | null
  sort_key: number
}

export type ExternalLeader = {
  id: string
  name: string
  phone: string | null
  availability: readonly string[]
  sort_key: number
}

export type OfficialWorkshopsSummary = {
  workshops: readonly WorkshopRecord[]
  cancelled: readonly WorkshopRecord[]
  external_leaders: readonly ExternalLeader[]
}

const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}[a-zA-Z0-9_-]+$`))
const nonEmpty = z.string().trim().min(1)
const workshopId = id('wks_')
const externalLeaderId = id('ext_')
const mode = z.enum(workshopModes)
const workshopPayload = z.object({
  workshop_id: workshopId,
  title: nonEmpty,
  description: z.string(),
  audience: nonEmpty,
  age_min: z.number().int().min(0).max(120),
  age_max: z.number().int().min(0).max(120),
  capacity: z.number().int().min(0),
  participation_mode: mode,
  leader_ids: z.array(z.string()).max(32).default([]),
  needs: z.array(nonEmpty).max(32).default([]),
  sort_key: z.number().int(),
})
const workshopReason = z.object({ workshop_id: workshopId, reason: z.string().nullable() })
const externalLeaderPayload = z.object({
  external_leader_id: externalLeaderId,
  name: nonEmpty,
  phone: z.string().trim().nullable(),
  availability: z.array(z.string()).max(64).default([]),
  sort_key: z.number().int(),
})
const externalLeaderReason = z.object({
  external_leader_id: externalLeaderId,
  reason: z.string().nullable(),
})
function entity(world: ValidationWorld, kind: string, idValue: string): Entity | undefined {
  return world.findEntity(kind, idValue)
}

function labelValue(world: World, idValue: string, key: string): JsonValue | undefined {
  return world.labels_by_entity[idValue]?.find((label) => label.key === key)?.value
}

/**
 * Live participants of one workshop. Reads the two attendance keys directly:
 * scanning every entity's labels made a capacity check cost the whole label
 * store, on an event type organisers fire repeatedly.
 */
function liveAttendance(world: ValidationWorld, workshopId: string): number {
  const participants = new Set(
    world
      .labelsByKey('signed-up-for')
      .filter(
        (label) =>
          label.value === workshopId && world.findEntity('person', label.entity_id) !== undefined,
      )
      .map((label) => label.entity_id),
  )
  const provided = new Set(
    world
      .labelsByKey('provides')
      .filter(
        (label) =>
          label.entity_id === workshopId &&
          typeof label.value === 'string' &&
          isFixedWorkshopAttendanceToken(label.value),
      )
      .map((label) => label.value as string),
  )
  const fixedPeople = new Set(
    world
      .labelsByKey('needs')
      .filter(
        (label) =>
          world.findEntity('person', label.entity_id) &&
          typeof label.value === 'string' &&
          fixedWorkshopIdFromToken(label.entity_id, label.value) === workshopId &&
          provided.has(label.value),
      )
      .map((label) => label.entity_id),
  )
  for (const personId of fixedPeople) participants.add(personId)
  return participants.size
}

function validateWorkshop(
  params: OfficialWorkshopsParams,
  world: ValidationWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = workshopPayload.parse(payload)
  const current = entity(world, 'workshop', value.workshop_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} workshop: ${value.workshop_id}`
  if (!params.audience_values.includes(value.audience))
    return `invalid workshop audience: ${value.audience}`
  if (!params.available_modes.includes(value.participation_mode))
    return `participation mode is not configured: ${value.participation_mode}`
  if (value.age_min > value.age_max) return 'workshop age range is reversed'
  if (updating) {
    const attendance = liveAttendance(world, value.workshop_id)
    if (value.capacity < attendance)
      return `capacity reduction would strand ${attendance} current participant(s); rejected per D30`
  }
  for (const leaderId of value.leader_ids)
    if (!entity(world, 'person', leaderId) && !entity(world, 'external-leader', leaderId))
      return `unknown workshop leader: ${leaderId}`
  if (value.leader_ids.length !== new Set(value.leader_ids).size)
    return `duplicate workshop leader: ${value.workshop_id}`
  return null
}

function validateExternalLeader(
  world: ValidationWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = externalLeaderPayload.parse(payload)
  const current = entity(world, 'external-leader', value.external_leader_id)
  return updating
    ? current
      ? null
      : `unknown external leader: ${value.external_leader_id}`
    : current
      ? `duplicate external leader: ${value.external_leader_id}`
      : null
}

function validateReason(world: ValidationWorld, payload: JsonValue, kind: string): string | null {
  const entityId =
    kind === 'workshop'
      ? workshopReason.parse(payload).workshop_id
      : externalLeaderReason.parse(payload).external_leader_id
  return entity(world, kind === 'workshop' ? 'workshop' : 'external-leader', entityId)
    ? null
    : `unknown ${kind}: ${entityId}`
}

function setLabels(
  capability: ModuleFoldCapability,
  entityId: string,
  keys: readonly string[],
  values: readonly { key: string; value: JsonValue }[],
): void {
  for (const key of keys) capability.clearLabel(entityId, key)
  for (const { key, value } of values) capability.setLabel(entityId, key, value, null, null)
}

function summary(world: World): OfficialWorkshopsSummary {
  const toWorkshop = (item: Entity): WorkshopRecord => {
    const labels = world.labels_by_entity[item.id] ?? []
    const values = (key: string) =>
      labels.filter((label) => label.key === key).map((label) => label.value)
    return {
      id: item.id,
      title: String(labelValue(world, item.id, 'title') ?? ''),
      description: String(labelValue(world, item.id, 'description') ?? ''),
      audience: String(labelValue(world, item.id, 'audience') ?? ''),
      age_min: Number(labelValue(world, item.id, 'age-min') ?? 0),
      age_max: Number(labelValue(world, item.id, 'age-max') ?? 120),
      capacity: Number(labelValue(world, item.id, 'capacity') ?? 0),
      mode: String(labelValue(world, item.id, 'participation-mode') ?? 'assigned') as WorkshopMode,
      leader_ids: values('leader').filter((value): value is string => typeof value === 'string'),
      needs: values('need').filter((value): value is string => typeof value === 'string'),
      cancelled: values('cancelled').some((value) => value === true),
      cancellation_reason:
        (labelValue(world, item.id, 'cancellation-reason') as string | null | undefined) ?? null,
      sort_key: item.sort_key,
    }
  }
  const all = (world.entities_by_kind.workshop ?? [])
    .map(toWorkshop)
    .sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id))
  const externalLeaders = (world.entities_by_kind['external-leader'] ?? [])
    .map((item) => ({
      id: item.id,
      name: String(labelValue(world, item.id, 'external-leader-name') ?? ''),
      phone:
        (labelValue(world, item.id, 'external-leader-phone') as string | null | undefined) ?? null,
      availability: (world.labels_by_entity[item.id] ?? [])
        .filter((label) => label.key === 'external-leader-availability')
        .map((label) => String(label.value)),
      sort_key: item.sort_key,
    }))
    .sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id))
  return {
    workshops: all.filter((item) => !item.cancelled),
    cancelled: all.filter((item) => item.cancelled),
    external_leaders: externalLeaders,
  }
}

function diagnostics(world: World): readonly Diagnostic[] {
  return summary(world)
    .workshops.filter((workshop) => workshop.capacity === 0)
    .map((workshop) => ({
      id: 'official-workshops.zero-capacity',
      severity: 'warning' as const,
      subject_id: workshop.id,
      message: 'workshop has no participant capacity',
    }))
}

export const officialWorkshops = defineModule<OfficialWorkshopsParams>({
  id: 'official-workshops',
  params: z.object({
    audience_values: z.array(nonEmpty).min(1).default(['children', 'adults']),
    available_modes: z
      .array(mode)
      .min(1)
      .default([...workshopModes]),
    excluded_roles: z.array(nonEmpty).default(['infant']),
  }),
  contribute: (params) => ({
    entity_kinds: [
      { id: 'workshop', prefix: 'wks_' },
      { id: 'external-leader', prefix: 'ext_' },
    ],
    label_keys: [
      { key: 'title', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'description', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'audience', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'age-min', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'age-max', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'capacity', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'participation-mode', scopes: ['workshop'], cardinality: 'exactly-one' },
      { key: 'leader', scopes: ['workshop'], cardinality: 'zero-or-more' },
      { key: 'need', scopes: ['workshop'], cardinality: 'zero-or-more' },
      { key: 'cancelled', scopes: ['workshop'], cardinality: 'zero-or-one' },
      { key: 'cancellation-reason', scopes: ['workshop'], cardinality: 'zero-or-one' },
      { key: 'signed-up-for', scopes: ['person'], cardinality: 'zero-or-more' },
      { key: 'interested-in', scopes: ['person'], cardinality: 'zero-or-more' },
      {
        key: 'external-leader-name',
        scopes: ['external-leader'],
        cardinality: 'exactly-one',
        sensitivity: 'restricted',
      },
      {
        key: 'external-leader-phone',
        scopes: ['external-leader'],
        cardinality: 'zero-or-one',
        sensitivity: 'restricted',
      },
      {
        key: 'external-leader-availability',
        scopes: ['external-leader'],
        cardinality: 'zero-or-more',
        sensitivity: 'restricted',
      },
    ],
    family_controls: [
      { key: 'workshop-sign-up', control: 'workshop-sign-up' },
      { key: 'workshop-interest', control: 'workshop-interest' },
    ],
    events: [
      {
        type: 'WorkshopAdded',
        payload: workshopPayload,
        validate: (payload, world) => validateWorkshop(params, world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = workshopPayload.parse(event.payload)
          capability.createEntity('workshop', value.workshop_id, event.seq, value.sort_key)
          setLabels(
            capability,
            value.workshop_id,
            [
              'title',
              'description',
              'audience',
              'age-min',
              'age-max',
              'capacity',
              'participation-mode',
              'leader',
              'need',
              'cancelled',
              'cancellation-reason',
            ],
            [
              { key: 'title', value: value.title },
              { key: 'description', value: value.description },
              { key: 'audience', value: value.audience },
              { key: 'age-min', value: value.age_min },
              { key: 'age-max', value: value.age_max },
              { key: 'capacity', value: value.capacity },
              { key: 'participation-mode', value: value.participation_mode },
              ...value.leader_ids.map((leader) => ({ key: 'leader', value: leader })),
              ...value.needs.map((need) => ({ key: 'need', value: need })),
            ],
          )
        },
      },
      {
        type: 'WorkshopUpdated',
        payload: workshopPayload,
        validate: (payload, world) => validateWorkshop(params, world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = workshopPayload.parse(event.payload)
          capability.setSortKey('workshop', value.workshop_id, value.sort_key)
          setLabels(
            capability,
            value.workshop_id,
            [
              'title',
              'description',
              'audience',
              'age-min',
              'age-max',
              'capacity',
              'participation-mode',
              'leader',
              'need',
            ],
            [
              { key: 'title', value: value.title },
              { key: 'description', value: value.description },
              { key: 'audience', value: value.audience },
              { key: 'age-min', value: value.age_min },
              { key: 'age-max', value: value.age_max },
              { key: 'capacity', value: value.capacity },
              { key: 'participation-mode', value: value.participation_mode },
              ...value.leader_ids.map((leader) => ({ key: 'leader', value: leader })),
              ...value.needs.map((need) => ({ key: 'need', value: need })),
            ],
          )
        },
      },
      {
        type: 'WorkshopCancelled',
        payload: workshopReason,
        validate: (payload, world) => validateReason(world, payload, 'workshop'),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = workshopReason.parse(event.payload)
          setLabels(
            capability,
            value.workshop_id,
            ['cancelled', 'cancellation-reason'],
            [
              { key: 'cancelled', value: true },
              { key: 'cancellation-reason', value: value.reason },
            ],
          )
        },
      },
      {
        type: 'WorkshopRetired',
        payload: workshopReason,
        validate: (payload, world) => validateReason(world, payload, 'workshop'),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = workshopReason.parse(event.payload)
          capability.retireEntity('workshop', value.workshop_id)
        },
      },
      {
        type: 'ExternalLeaderAdded',
        payload: externalLeaderPayload,
        validate: (payload, world) => validateExternalLeader(world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = externalLeaderPayload.parse(event.payload)
          capability.createEntity(
            'external-leader',
            value.external_leader_id,
            event.seq,
            value.sort_key,
          )
          setLabels(
            capability,
            value.external_leader_id,
            ['external-leader-name', 'external-leader-phone', 'external-leader-availability'],
            [
              { key: 'external-leader-name', value: value.name },
              { key: 'external-leader-phone', value: value.phone },
              ...value.availability.map((slot) => ({
                key: 'external-leader-availability',
                value: slot,
              })),
            ],
          )
        },
      },
      {
        type: 'ExternalLeaderUpdated',
        payload: externalLeaderPayload,
        validate: (payload, world) => validateExternalLeader(world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = externalLeaderPayload.parse(event.payload)
          capability.setSortKey('external-leader', value.external_leader_id, value.sort_key)
          setLabels(
            capability,
            value.external_leader_id,
            ['external-leader-name', 'external-leader-phone', 'external-leader-availability'],
            [
              { key: 'external-leader-name', value: value.name },
              { key: 'external-leader-phone', value: value.phone },
              ...value.availability.map((slot) => ({
                key: 'external-leader-availability',
                value: slot,
              })),
            ],
          )
        },
      },
      {
        type: 'ExternalLeaderRetired',
        payload: externalLeaderReason,
        validate: (payload, world) => validateReason(world, payload, 'external-leader'),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = externalLeaderReason.parse(event.payload)
          capability.retireEntity('external-leader', value.external_leader_id)
        },
      },
    ],
    world_summaries: [{ id: 'official-workshops', summarize: summary }],
    solver_input: [{ id: 'official-workshops', build: (world) => summary(world) }],
    world_checks: [diagnostics],
    screens: [
      {
        id: 'organiser-workshops',
        route: '/organiser/workshops',
        label: 'Workshops',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-leaders',
        route: '/organiser/workshops/leitungen',
        label: 'Leitungen',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-external-leaders',
        route: '/organiser/workshops/externe',
        label: 'Externe Leitungen',
        audience: 'organiser',
      },
    ],
  }),
})

export function officialWorkshopsWorld(world: World): OfficialWorkshopsSummary {
  const value = world.summaries['official-workshops']
  if (!value) throw new Error('official-workshops is not selected in this profile')
  return value as OfficialWorkshopsSummary
}
