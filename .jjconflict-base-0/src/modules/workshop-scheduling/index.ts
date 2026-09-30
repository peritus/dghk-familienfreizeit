import { z } from 'zod'
import { defineModule } from '../define.js'
import type { Entity, KernelWorld, ModuleFoldCapability } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'
import type {
  PreflightFinding,
  SolverInput,
  SolverStage,
  StageResult,
  TraceEntry,
} from '../../solver/types.js'
import type { OfficialWorkshopsSummary, WorkshopRecord } from '../official-workshops/index.js'

export type WorkshopSchedulingParams = {
  placement_policy: 'automatic' | 'automatic-with-fixed-decisions'
}

export type WorkshopSlot = {
  id: string
  starts_at: string
  ends_at: string
  sort_key: number
}

export type SpaceSlotBlock = {
  id: string
  space_id: string
  slot_id: string
  reason: string | null
}

export type WorkshopSchedulingSummary = {
  slots: readonly WorkshopSlot[]
  space_slot_blocks: readonly SpaceSlotBlock[]
}

export type WorkshopPlacement = {
  workshop_id: string
  slot_id: string
  space_id: string
}

export type WorkshopSchedulingSection = {
  placements: readonly WorkshopPlacement[]
  unscheduled: readonly { workshop_id: string; reason: string }[]
}

type ScheduleSolverInput = WorkshopSchedulingSummary & {
  workshops: readonly WorkshopRecord[]
  spaces: readonly {
    id: string
    capacity: number
    availability_windows: readonly { starts_at: string; ends_at: string }[]
    capabilities: readonly string[]
  }[]
}

const slotId = z.string().regex(/^slot_[a-zA-Z0-9_-]+$/)
const blockId = z.string().regex(/^blk_[a-zA-Z0-9_-]+$/)
const spaceId = z.string().regex(/^wsp_[a-zA-Z0-9_-]+$/)
const slotPayload = z.object({
  slot_id: slotId,
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  sort_key: z.number().int(),
})
const slotReason = z.object({ slot_id: slotId, reason: z.string().nullable() })
const blockPayload = z.object({
  block_id: blockId,
  space_id: spaceId,
  slot_id: slotId,
  reason: z.string().nullable(),
})

function entity(world: KernelWorld, kind: string, id: string): Entity | undefined {
  return world.entities_by_kind[kind]?.find((candidate) => candidate.id === id)
}

function validateSlot(world: KernelWorld, payload: JsonValue, updating: boolean): string | null {
  const value = slotPayload.parse(payload)
  const current = entity(world, 'workshop-slot', value.slot_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} slot: ${value.slot_id}`
  if (globalThis.Date.parse(value.starts_at) >= globalThis.Date.parse(value.ends_at))
    return 'slot starts_at must be before ends_at'
  const overlaps = (world.entities_by_kind['workshop-slot'] ?? []).some((slot) => {
    if (slot.id === value.slot_id) return false
    const start = globalThis.Date.parse(
      String(
        world.labels_by_entity[slot.id]?.find((label) => label.key === 'starts-at')?.value ?? '',
      ),
    )
    const end = globalThis.Date.parse(
      String(
        world.labels_by_entity[slot.id]?.find((label) => label.key === 'ends-at')?.value ?? '',
      ),
    )
    return (
      globalThis.Date.parse(value.starts_at) <= end && start <= globalThis.Date.parse(value.ends_at)
    )
  })
  return overlaps ? `slot overlaps or touches another live slot: ${value.slot_id}` : null
}

function validateBlock(world: KernelWorld, payload: JsonValue, unblocking: boolean): string | null {
  const value = blockPayload.parse(payload)
  if (!entity(world, 'workshop-space', value.space_id))
    return `unknown workshop space: ${value.space_id}`
  if (!entity(world, 'workshop-slot', value.slot_id))
    return `unknown workshop slot: ${value.slot_id}`
  const current = entity(world, 'space-slot-block', value.block_id)
  if (unblocking ? !current : current)
    return `${unblocking ? 'unknown' : 'duplicate'} space-slot block: ${value.block_id}`
  return null
}

function setSlotLabels(
  capability: ModuleFoldCapability,
  id: string,
  startsAt: string,
  endsAt: string,
): void {
  capability.replaceLabels(id, [
    { key: 'starts-at', value: startsAt, strength: null, note: null },
    { key: 'ends-at', value: endsAt, strength: null, note: null },
  ])
}

function setBlockLabels(
  capability: ModuleFoldCapability,
  id: string,
  space: string,
  slot: string,
  reason: string | null,
): void {
  capability.replaceLabels(id, [
    { key: 'blocked-space', value: space, strength: null, note: null },
    { key: 'blocked-slot', value: slot, strength: null, note: null },
    { key: 'block-reason', value: reason, strength: null, note: null },
  ])
}

function summary(world: KernelWorld): WorkshopSchedulingSummary {
  const value = (id: string, key: string): JsonValue | undefined =>
    world.labels_by_entity[id]?.find((label) => label.key === key)?.value
  const slots = (world.entities_by_kind['workshop-slot'] ?? [])
    .map((item) => ({
      id: item.id,
      starts_at: String(value(item.id, 'starts-at') ?? ''),
      ends_at: String(value(item.id, 'ends-at') ?? ''),
      sort_key: item.sort_key,
    }))
    .sort(
      (a, b) =>
        a.starts_at.localeCompare(b.starts_at) ||
        a.sort_key - b.sort_key ||
        a.id.localeCompare(b.id),
    )
  const blocks = (world.entities_by_kind['space-slot-block'] ?? [])
    .map((item) => ({
      id: item.id,
      space_id: String(value(item.id, 'blocked-space') ?? ''),
      slot_id: String(value(item.id, 'blocked-slot') ?? ''),
      reason: (value(item.id, 'block-reason') as string | null | undefined) ?? null,
    }))
    .sort(
      (a, b) =>
        a.space_id.localeCompare(b.space_id) ||
        a.slot_id.localeCompare(b.slot_id) ||
        a.id.localeCompare(b.id),
    )
  return { slots, space_slot_blocks: blocks }
}

function solverInput(world: KernelWorld): ScheduleSolverInput {
  const base = summary(world)
  const official = world.summaries['official-workshops'] as OfficialWorkshopsSummary | undefined
  const value = (id: string, key: string): JsonValue | undefined =>
    world.labels_by_entity[id]?.find((label) => label.key === key)?.value
  const spaces = (world.entities_by_kind['workshop-space'] ?? []).map((item) => ({
    id: item.id,
    capacity: Number(value(item.id, 'space-capacity') ?? 0),
    availability_windows:
      (value(item.id, 'space-availability') as
        | { starts_at: string; ends_at: string }[]
        | undefined) ?? [],
    capabilities: world.capabilities
      .filter((capability) => capability.entity_id === item.id)
      .map((capability) => capability.key),
  }))
  return {
    ...base,
    workshops: official?.workshops ?? [],
    spaces,
  }
}

function placementStage(): SolverStage<WorkshopSchedulingSection> {
  return {
    id: 'workshop-scheduling.placement',
    after: [],
    before: [],
    reads: [],
    run: (input: SolverInput): StageResult<WorkshopSchedulingSection> => {
      const schedule = input.module_inputs['workshop-scheduling'] as ScheduleSolverInput
      const used = new Set<string>()
      const leaderSlots = new Set<string>()
      const placements: WorkshopPlacement[] = []
      const unscheduled: { workshop_id: string; reason: string }[] = []
      const trace: TraceEntry[] = []
      const diagnostics: PreflightFinding[] = []
      const workshops = schedule.workshops
        .slice()
        .sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id))
      for (const workshop of workshops) {
        let selected: WorkshopPlacement | null = null
        const rejected: { target: string; rule: string }[] = []
        for (const slot of schedule.slots) {
          for (const space of schedule.spaces) {
            const target = `${slot.id}/${space.id}`
            if (used.has(target)) {
              rejected.push({ target, rule: 'hard.space-occupied' })
              continue
            }
            if (space.capacity < workshop.capacity) {
              rejected.push({ target, rule: 'hard.space-capacity' })
              continue
            }
            if (
              !space.availability_windows.some(
                (window) => window.starts_at <= slot.starts_at && window.ends_at >= slot.ends_at,
              )
            ) {
              rejected.push({ target, rule: 'hard.space-unavailable' })
              continue
            }
            if (
              schedule.space_slot_blocks.some(
                (block) => block.space_id === space.id && block.slot_id === slot.id,
              )
            ) {
              rejected.push({ target, rule: 'hard.space-slot-blocked' })
              continue
            }
            if (workshop.needs.some((need) => !space.capabilities.includes(need))) {
              rejected.push({ target, rule: 'hard.missing-capability' })
              continue
            }
            if (workshop.leader_ids.some((leader) => leaderSlots.has(`${slot.id}/${leader}`))) {
              rejected.push({ target, rule: 'hard.leader-conflict' })
              continue
            }
            selected = { workshop_id: workshop.id, slot_id: slot.id, space_id: space.id }
            break
          }
          if (selected) break
        }
        if (!selected) {
          const reason = rejected[0]?.rule ?? 'hard.no-slot-or-space'
          unscheduled.push({ workshop_id: workshop.id, reason })
          diagnostics.push({
            check: 'workshop-scheduling.unscheduled',
            severity: 'error',
            subjects: [workshop.id],
            text: reason,
          })
          trace.push({
            stage: 'workshop-scheduling.placement',
            step: 'unscheduled',
            subject: workshop.id,
            text: `${workshop.id}: ${reason}`,
            detail: { rejected },
          })
          continue
        }
        placements.push(selected)
        used.add(`${selected.slot_id}/${selected.space_id}`)
        workshop.leader_ids.forEach((leader) => leaderSlots.add(`${selected!.slot_id}/${leader}`))
        trace.push({
          stage: 'workshop-scheduling.placement',
          step: 'automatic',
          subject: workshop.id,
          text: `${workshop.id} → ${selected.slot_id}/${selected.space_id}`,
          detail: {
            chosen: {
              target: `${selected.slot_id}/${selected.space_id}`,
              score: 0,
              terms: [['stable-order', 0]],
            },
            rejected,
          },
        })
      }
      return { output: { placements, unscheduled }, trace, diagnostics }
    },
  }
}

export const workshopScheduling = defineModule<WorkshopSchedulingParams>({
  id: 'workshop-scheduling',
  requires: ['official-workshops', 'workshop-space'],
  params: z.object({
    placement_policy: z
      .enum(['automatic', 'automatic-with-fixed-decisions'])
      .default('automatic-with-fixed-decisions'),
  }),
  contribute: (_params) => ({
    entity_kinds: [
      { id: 'workshop-slot', prefix: 'slot_' },
      { id: 'space-slot-block', prefix: 'blk_' },
    ],
    label_keys: [
      { key: 'starts-at', scopes: ['workshop-slot'], cardinality: 'exactly-one' },
      { key: 'ends-at', scopes: ['workshop-slot'], cardinality: 'exactly-one' },
      { key: 'blocked-space', scopes: ['space-slot-block'], cardinality: 'exactly-one' },
      { key: 'blocked-slot', scopes: ['space-slot-block'], cardinality: 'exactly-one' },
      { key: 'block-reason', scopes: ['space-slot-block'], cardinality: 'zero-or-one' },
    ],
    events: [
      {
        type: 'WorkshopSlotAdded',
        payload: slotPayload,
        validate: (payload, world) => validateSlot(world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = slotPayload.parse(event.payload)
          capability.createEntity('workshop-slot', value.slot_id, event.seq, value.sort_key)
          setSlotLabels(capability, value.slot_id, value.starts_at, value.ends_at)
        },
      },
      {
        type: 'WorkshopSlotUpdated',
        payload: slotPayload,
        validate: (payload, world) => validateSlot(world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = slotPayload.parse(event.payload)
          capability.setSortKey('workshop-slot', value.slot_id, value.sort_key)
          setSlotLabels(capability, value.slot_id, value.starts_at, value.ends_at)
        },
      },
      {
        type: 'WorkshopSlotRetired',
        payload: slotReason,
        validate: (payload, world) =>
          entity(world, 'workshop-slot', slotReason.parse(payload).slot_id)
            ? null
            : `unknown workshop slot: ${slotReason.parse(payload).slot_id}`,
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) =>
          capability.retireEntity('workshop-slot', slotReason.parse(event.payload).slot_id),
      },
      {
        type: 'SpaceSlotBlocked',
        payload: blockPayload,
        validate: (payload, world) => validateBlock(world, payload, false),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) => {
          const value = blockPayload.parse(event.payload)
          capability.createEntity('space-slot-block', value.block_id, event.seq)
          setBlockLabels(capability, value.block_id, value.space_id, value.slot_id, value.reason)
        },
      },
      {
        type: 'SpaceSlotUnblocked',
        payload: blockPayload,
        validate: (payload, world) => validateBlock(world, payload, true),
        authorize: (principal) => principal.kind === 'organiser',
        fold: (capability, event) =>
          capability.retireEntity('space-slot-block', blockPayload.parse(event.payload).block_id),
      },
    ],
    solver_input: [{ id: 'workshop-scheduling', build: solverInput }],
    stages: [placementStage()],
    world_summaries: [{ id: 'workshop-scheduling', summarize: summary }],
    screens: [
      {
        id: 'organiser-workshop-programme',
        route: '/organiser/workshops/programme',
        label: 'Programm',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-slots',
        route: '/organiser/workshops/slots',
        label: 'Slots',
        audience: 'organiser',
      },
    ],
  }),
})

export function workshopSchedulingWorld(world: KernelWorld): WorkshopSchedulingSummary {
  const value = world.summaries['workshop-scheduling']
  if (!value) throw new Error('workshop-scheduling is not selected in this profile')
  return value as WorkshopSchedulingSummary
}
