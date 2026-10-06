import { z } from 'zod'
import { defineModule } from '../define.js'
import type { World } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'
import type { SolverInput, SolverStage, StageResult } from '../../solver/types.js'

/** `WorkshopChoiceOpened` carries no payload: the event itself is the organiser decision. */
const workshopChoiceOpenedPayload = z.object({}).strict()

export type WorkshopRankingsParams = {
  ranking_trait: string
  max_rank: number
  allow_no_preference: boolean
}

export type WorkshopChoice = { workshop_id: string | null; rank: number | null }

export type WorkshopRanking = { person_id: string; choices: readonly WorkshopChoice[] }

export type WorkshopDemand = Readonly<Record<string, number>>

/** Read-only ranked choices for organiser projections such as programme conflict review. */
export type WorkshopRankingsSummary = { rankings: readonly WorkshopRanking[] }

export type WorkshopRankingsDemand = {
  rankings: readonly WorkshopRanking[]
  demand: WorkshopDemand
  max_rank: number
}

// Accepts either the object form { workshop_id, rank } or a compact
// "wks_id:rank" string (e.g. from a KDL fixture, where a LabelSet value
// can only be a scalar) — the compact form is transformed into the object
// form before validation, so both remain equivalent to every consumer.
const rankingValue = z.preprocess(
  (raw) => {
    if (typeof raw !== 'string') return raw
    const [workshopId, rankText] = raw.split(':')
    const rank = Number(rankText)
    return { workshop_id: workshopId ?? null, rank: Number.isFinite(rank) ? rank : null }
  },
  z
    .object({
      workshop_id: z
        .string()
        .regex(/^wks_[a-zA-Z0-9_-]+$/)
        .nullable(),
      rank: z.number().int().positive().nullable(),
    })
    .superRefine((value, context) => {
      if ((value.workshop_id === null) !== (value.rank === null))
        context.addIssue({
          code: 'custom',
          message: 'workshop and rank must both be null or present',
        })
    }),
)

function rankingValueValid(value: JsonValue): string | null {
  const result = rankingValue.safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'invalid workshop ranking')
}

function buildRankings(world: World): readonly WorkshopRanking[] {
  const rankings = new Map<string, WorkshopChoice[]>()
  for (const label of world.labels.filter((item) => item.key === 'prefers-workshop')) {
    const parsed = rankingValue.parse(label.value)
    const choices = rankings.get(label.entity_id) ?? []
    choices.push(parsed)
    rankings.set(label.entity_id, choices)
  }
  return [...rankings.entries()]
    .map((entry) => {
      const personId = entry[0]
      const choices = entry[1]
      return {
        person_id: personId,
        choices: choices
          .slice()
          .sort(
            (a, b) =>
              (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
              (a.workshop_id ?? '').localeCompare(b.workshop_id ?? ''),
          ),
      }
    })
    .sort((a, b) => a.person_id.localeCompare(b.person_id))
}

function demandStage(maxRank: number): SolverStage<WorkshopRankingsDemand> {
  return {
    id: 'workshop-rankings.demand',
    after: [],
    before: [],
    reads: [],
    run: (input: SolverInput): StageResult<WorkshopRankingsDemand> => {
      const rankings = input.module_inputs['workshop-rankings'] as readonly WorkshopRanking[]
      const demand: Record<string, number> = {}
      for (const ranking of rankings)
        for (const choice of ranking.choices)
          if (choice.workshop_id) demand[choice.workshop_id] = (demand[choice.workshop_id] ?? 0) + 1
      return {
        output: { rankings, demand, max_rank: maxRank },
        trace: rankings.map((ranking) => ({
          stage: 'workshop-rankings.demand',
          step: 'count',
          subject: ranking.person_id,
          text: `${ranking.person_id}: ${ranking.choices.length} choices`,
        })),
        diagnostics: [],
      }
    },
  }
}

export const workshopRankings = defineModule<WorkshopRankingsParams>({
  id: 'workshop-rankings',
  requires: ['official-workshops'],
  params: z.object({
    ranking_trait: z.string().min(1),
    max_rank: z.number().int().min(1).default(3),
    allow_no_preference: z.boolean().default(true),
  }),
  contribute: (params) => ({
    label_keys: [
      {
        key: params.ranking_trait,
        scopes: ['person'],
        cardinality: 'zero-or-more',
        validate: rankingValueValid,
      },
    ],
    family_controls: [{ key: params.ranking_trait, control: 'ranking' }],
    events: [
      {
        type: 'WorkshopChoiceOpened',
        payload: workshopChoiceOpenedPayload,
        authorize: (principal) => principal.kind === 'organiser',
        fold: () => {},
      },
    ],
    phases: [
      {
        id: 'workshop-rankings.choice',
        area: 'workshops',
        opens: { kind: 'event', event: 'WorkshopChoiceOpened' },
        target: true,
        closed_by_area: true,
      },
    ],
    features: [
      {
        id: 'workshop-rankings.family-workshop-wishes',
        audience: 'family',
        subject_kind: 'person',
        requires_features: [],
        requires_phases: [],
        activation_mode: 'all',
        organiser_counterpart: 'workshop-rankings.organiser-workshop-wishes',
      },
      {
        id: 'workshop-rankings.organiser-workshop-wishes',
        audience: 'organiser',
        subject_kind: 'person',
        requires_features: [],
        requires_phases: [],
        activation_mode: 'all',
      },
    ],
    solver_input: [
      { id: 'workshop-rankings', build: (world) => workshopRankingsFromWorld(world, params) },
    ],
    stages: [demandStage(params.max_rank)],
    world_summaries: [
      {
        id: 'workshop-rankings',
        summarize: (world) => ({ rankings: buildRankings(world) }),
      },
    ],
    screens: [
      {
        id: 'organiser-workshop-participation',
        route: '/organiser/workshops/participation',
        label: 'Teilnahme',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-allocation',
        route: '/organiser/workshops/allocation',
        label: 'Wünsche',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-allocation-demand',
        route: '/organiser/workshops/allocation/demand',
        label: 'Nachfrage',
        audience: 'organiser',
      },
      {
        id: 'organiser-workshop-allocation-trace',
        route: '/organiser/workshops/allocation/trace',
        label: 'Verlauf',
        audience: 'organiser',
      },
    ],
  }),
})

export function workshopRankingsWorld(world: World): WorkshopRankingsSummary {
  const value = world.summaries['workshop-rankings']
  if (!value) throw new Error('workshop-rankings is not selected in this profile')
  return value as WorkshopRankingsSummary
}

export function workshopRankingsFromWorld(
  world: World,
  params: WorkshopRankingsParams,
): readonly WorkshopRanking[] {
  return buildRankings(world).map((ranking) => ({
    ...ranking,
    choices: ranking.choices.filter(
      (choice) => choice.rank === null || choice.rank <= params.max_rank,
    ),
  }))
}
