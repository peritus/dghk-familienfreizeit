import { z } from 'zod'
import { defineModule } from '../define.js'
import type { Entity, World, ModuleFoldCapability, ValidationWorld } from '../../events/fold.js'
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
  fixed_placements: readonly FixedWorkshopPlacement[]
}

export type WorkshopPlacement = {
  workshop_id: string
  slot_id: string
  space_id: string
}

export type FixedWorkshopPlacement = WorkshopPlacement & {
  note: string | null
}

export type FixedWorkshopPlacementViolation = FixedWorkshopPlacement & {
  reasons: readonly string[]
}

export type WorkshopSchedulingSection = {
  placements: readonly WorkshopPlacement[]
  unscheduled: readonly { workshop_id: string; reason: string }[]
  automatic_placements: readonly WorkshopPlacement[]
  automatic_unscheduled: readonly { workshop_id: string; reason: string }[]
  fixed: readonly FixedWorkshopPlacement[]
  fixed_violations: readonly FixedWorkshopPlacementViolation[]
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
const fixedPlacementValue = z.object({ slot_id: slotId, space_id: spaceId })
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

function validateFixedPlacement(value: JsonValue): string | null {
  return fixedPlacementValue.safeParse(value).success
    ? null
    : 'fixed-placement must contain a valid slot_id and space_id'
}

function entity(world: ValidationWorld, kind: string, id: string): Entity | undefined {
  return world.findEntity(kind, id)
}

function validateSlot(
  world: ValidationWorld,
  payload: JsonValue,
  updating: boolean,
): string | null {
  const value = slotPayload.parse(payload)
  const current = entity(world, 'workshop-slot', value.slot_id)
  if (updating ? !current : current)
    return `${updating ? 'unknown' : 'duplicate'} slot: ${value.slot_id}`
  if (globalThis.Date.parse(value.starts_at) >= globalThis.Date.parse(value.ends_at))
    return 'slot starts_at must be before ends_at'
  const overlaps = world.entities('workshop-slot').some((slot) => {
    if (slot.id === value.slot_id) return false
    const start = globalThis.Date.parse(
      String(world.labels(slot.id).find((label) => label.key === 'starts-at')?.value ?? ''),
    )
    const end = globalThis.Date.parse(
      String(world.labels(slot.id).find((label) => label.key === 'ends-at')?.value ?? ''),
    )
    return (
      globalThis.Date.parse(value.starts_at) <= end && start <= globalThis.Date.parse(value.ends_at)
    )
  })
  return overlaps ? `slot overlaps or touches another live slot: ${value.slot_id}` : null
}

function validateBlock(
  world: ValidationWorld,
  payload: JsonValue,
  unblocking: boolean,
): string | null {
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

function summary(world: World): WorkshopSchedulingSummary {
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
  const fixedPlacements = (world.entities_by_kind.workshop ?? [])
    .flatMap((workshop) => {
      const label = world.labels_by_entity[workshop.id]?.find(
        (candidate) => candidate.key === 'fixed-placement',
      )
      const parsed = label ? fixedPlacementValue.safeParse(label.value) : null
      if (!label || !parsed?.success) return []
      return [
        {
          workshop_id: workshop.id,
          slot_id: parsed.data.slot_id,
          space_id: parsed.data.space_id,
          note: label.note,
        },
      ]
    })
    .sort(
      (a, b) =>
        a.workshop_id.localeCompare(b.workshop_id) ||
        a.slot_id.localeCompare(b.slot_id) ||
        a.space_id.localeCompare(b.space_id),
    )
  return { slots, space_slot_blocks: blocks, fixed_placements: fixedPlacements }
}

function solverInput(world: World): ScheduleSolverInput {
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

type PlacementRejection = { target: string; rule: string }

function placementRejections(
  workshop: WorkshopRecord,
  slot: WorkshopSlot | undefined,
  space: ScheduleSolverInput['spaces'][number] | undefined,
  schedule: ScheduleSolverInput,
  used: ReadonlySet<string>,
  leaderSlots: ReadonlySet<string>,
): readonly PlacementRejection[] {
  if (!slot) return [{ target: 'unknown-slot', rule: 'hard.slot-unavailable' }]
  if (!space) return [{ target: 'unknown-space', rule: 'hard.space-unavailable' }]
  const target = `${slot.id}/${space.id}`
  const rejected: PlacementRejection[] = []
  if (used.has(target)) rejected.push({ target, rule: 'hard.space-occupied' })
  if (space.capacity < workshop.capacity) rejected.push({ target, rule: 'hard.space-capacity' })
  if (
    !space.availability_windows.some(
      (window) => window.starts_at <= slot.starts_at && window.ends_at >= slot.ends_at,
    )
  )
    rejected.push({ target, rule: 'hard.space-unavailable' })
  if (
    schedule.space_slot_blocks.some(
      (block) => block.space_id === space.id && block.slot_id === slot.id,
    )
  )
    rejected.push({ target, rule: 'hard.space-slot-blocked' })
  if (workshop.needs.some((need) => !space.capabilities.includes(need)))
    rejected.push({ target, rule: 'hard.missing-capability' })
  if (workshop.leader_ids.some((leader) => leaderSlots.has(`${slot.id}/${leader}`)))
    rejected.push({ target, rule: 'hard.leader-conflict' })
  return rejected
}

function unscheduledReason(
  rejected: readonly PlacementRejection[],
  candidateCount: number,
): string | undefined {
  const targetsByRule = new Map<string, Set<string>>()
  const ruleOrder: string[] = []
  for (const { target, rule } of rejected) {
    let targets = targetsByRule.get(rule)
    if (!targets) {
      targets = new Set()
      targetsByRule.set(rule, targets)
      ruleOrder.push(rule)
    }
    targets.add(target)
  }

  const universal = ruleOrder.find((rule) => targetsByRule.get(rule)?.size === candidateCount)
  if (universal) return universal

  let mostFrequent: string | undefined
  let mostFrequentCount = 0
  for (const rule of ruleOrder) {
    const count = targetsByRule.get(rule)?.size ?? 0
    if (count > mostFrequentCount) {
      mostFrequent = rule
      mostFrequentCount = count
    }
  }
  return mostFrequent
}

function placementStage(includeComparison = true): SolverStage<WorkshopSchedulingSection> {
  return {
    id: 'workshop-scheduling.placement',
    after: [],
    before: [],
    reads: [],
    run: (input: SolverInput, _upstream, config): StageResult<WorkshopSchedulingSection> => {
      const schedule = input.module_inputs['workshop-scheduling'] as ScheduleSolverInput
      const used = new Set<string>()
      const leaderSlots = new Set<string>()
      const placements: WorkshopPlacement[] = []
      const unscheduled: { workshop_id: string; reason: string }[] = []
      const trace: TraceEntry[] = []
      const diagnostics: PreflightFinding[] = []
      const fixed = schedule.fixed_placements
        .slice()
        .sort((left, right) => left.workshop_id.localeCompare(right.workshop_id))
      const fixedViolations: WorkshopSchedulingSection['fixed_violations'][number][] = []
      const fixedWorkshopIds = new Set(fixed.map((placement) => placement.workshop_id))
      const workshopsById = new Map(schedule.workshops.map((workshop) => [workshop.id, workshop]))
      const slotsById = new Map(schedule.slots.map((slot) => [slot.id, slot]))
      const spacesById = new Map(schedule.spaces.map((space) => [space.id, space]))
      const workshops = schedule.workshops
        .slice()
        .sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id))

      for (const decision of fixed) {
        const workshop = workshopsById.get(decision.workshop_id)
        const slot = slotsById.get(decision.slot_id)
        const space = spacesById.get(decision.space_id)
        const rejected = workshop
          ? placementRejections(workshop, slot, space, schedule, used, leaderSlots)
          : [{ target: decision.workshop_id, rule: 'hard.workshop-unavailable' }]
        if (rejected.length > 0 || !workshop || !slot || !space) {
          const reasons = rejected.map(({ rule }) => rule)
          const violation = { ...decision, reasons: Object.freeze(reasons) }
          fixedViolations.push(violation)
          unscheduled.push({
            workshop_id: decision.workshop_id,
            reason: reasons[0] ?? 'hard.fixed-invalid',
          })
          diagnostics.push({
            check: 'workshop-scheduling.fixed-invalid',
            severity: 'error',
            subjects: [decision.workshop_id, decision.slot_id, decision.space_id],
            text: `${decision.workshop_id} fixed in ${decision.slot_id}/${decision.space_id}: ${reasons.join(', ')}`,
          })
          trace.push({
            stage: 'workshop-scheduling.placement',
            step: 'fixed-invalid',
            subject: decision.workshop_id,
            text: `${decision.workshop_id}: fixed placement invalid`,
            detail: {
              chosen: {
                target: `${decision.slot_id}/${decision.space_id}`,
                score: 0,
                terms: [['fixed-invalid', 0]],
              },
              rejected,
            },
          })
          continue
        }
        const placement = {
          workshop_id: decision.workshop_id,
          slot_id: decision.slot_id,
          space_id: decision.space_id,
        }
        placements.push(placement)
        used.add(`${placement.slot_id}/${placement.space_id}`)
        workshop.leader_ids.forEach((leader) => leaderSlots.add(`${placement.slot_id}/${leader}`))
        trace.push({
          stage: 'workshop-scheduling.placement',
          step: 'fixed',
          subject: workshop.id,
          text: `${workshop.id} fixed → ${placement.slot_id}/${placement.space_id}`,
          detail: {
            chosen: {
              target: `${placement.slot_id}/${placement.space_id}`,
              score: 0,
              terms: [['fixed', 0]],
            },
            rejected: [],
          },
        })
      }

      for (const workshop of workshops) {
        if (fixedWorkshopIds.has(workshop.id)) continue
        let selected: WorkshopPlacement | null = null
        const rejected: PlacementRejection[] = []
        for (const slot of schedule.slots) {
          for (const space of schedule.spaces) {
            const candidateRejections = placementRejections(
              workshop,
              slot,
              space,
              schedule,
              used,
              leaderSlots,
            )
            if (candidateRejections.length > 0) {
              rejected.push(...candidateRejections)
              continue
            }
            selected = { workshop_id: workshop.id, slot_id: slot.id, space_id: space.id }
            break
          }
          if (selected) break
        }
        if (!selected) {
          const reason =
            unscheduledReason(rejected, schedule.slots.length * schedule.spaces.length) ??
            'hard.no-slot-or-space'
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
      const automaticOnly = includeComparison
        ? placementStage(false).run(
            {
              ...input,
              module_inputs: {
                ...input.module_inputs,
                ['workshop-scheduling']: { ...schedule, fixed_placements: [] },
              },
            },
            {},
            config,
          ).output
        : null
      return {
        output: {
          placements,
          unscheduled,
          automatic_placements: automaticOnly?.placements ?? placements,
          automatic_unscheduled: automaticOnly?.unscheduled ?? unscheduled,
          fixed,
          fixed_violations: Object.freeze(fixedViolations),
        },
        trace,
        diagnostics,
      }
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
      {
        key: 'fixed-placement',
        scopes: ['workshop'],
        cardinality: 'zero-or-one',
        validate: validateFixedPlacement,
      },
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
        id: 'organiser-workshop-programme-unplaced',
        route: '/organiser/workshops/programme/unplaced',
        label: 'Nicht eingeplant',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-programme-overlaps',
        route: '/organiser/workshops/programme/overlaps',
        label: 'Überschneidungen',
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

export function workshopSchedulingWorld(world: World): WorkshopSchedulingSummary {
  const value = world.summaries['workshop-scheduling']
  if (!value) throw new Error('workshop-scheduling is not selected in this profile')
  return value as WorkshopSchedulingSummary
}
