import { z } from 'zod'
import { defineModule } from '../define.js'
import type { KernelWorld } from '../../events/fold.js'
import type { JsonValue } from '../../events/types.js'
import type { SolverInput, SolverStage, StageResult } from '../../solver/types.js'

export type WorkshopRankingsParams = {
  ranking_trait: string
  max_rank: number
  allow_no_preference: boolean
}

export type WorkshopChoice = { workshop_id: string | null; rank: number | null }
export type WorkshopRanking = { person_id: string; choices: readonly WorkshopChoice[] }
export type WorkshopDemand = Readonly<Record<string, number>>

const rankingValue = z
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
  })

function rankingValueValid(value: JsonValue): string | null {
  const result = rankingValue.safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'invalid workshop ranking')
}

function buildRankings(world: KernelWorld): readonly WorkshopRanking[] {
  const rankings = new Map<string, WorkshopChoice[]>()
  for (const label of world.labels.filter((item) => item.key === 'prefers-workshop')) {
    const parsed = rankingValue.parse(label.value)
    const choices = rankings.get(label.entity_id) ?? []
    choices.push(parsed)
    rankings.set(label.entity_id, choices)
  }
  return [...rankings.entries()]
    .map(([person_id, choices]) => ({
      person_id,
      choices: choices
        .slice()
        .sort(
          (a, b) =>
            (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
            (a.workshop_id ?? '').localeCompare(b.workshop_id ?? ''),
        ),
    }))
    .sort((a, b) => a.person_id.localeCompare(b.person_id))
}

function demandStage(): SolverStage<{
  rankings: readonly WorkshopRanking[]
  demand: WorkshopDemand
}> {
  return {
    id: 'workshop-rankings.demand',
    after: [],
    before: [],
    reads: [],
    run: (
      input: SolverInput,
    ): StageResult<{ rankings: readonly WorkshopRanking[]; demand: WorkshopDemand }> => {
      const rankings = input.module_inputs['workshop-rankings'] as readonly WorkshopRanking[]
      const demand: Record<string, number> = {}
      for (const ranking of rankings)
        for (const choice of ranking.choices)
          if (choice.workshop_id) demand[choice.workshop_id] = (demand[choice.workshop_id] ?? 0) + 1
      return {
        output: { rankings, demand },
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
    solver_input: [{ id: 'workshop-rankings', build: (world) => buildRankings(world) }],
    stages: [demandStage()],
  }),
})

export function workshopRankingsFromWorld(
  world: KernelWorld,
  params: WorkshopRankingsParams,
): readonly WorkshopRanking[] {
  return buildRankings(world).map((ranking) => ({
    ...ranking,
    choices: ranking.choices.filter(
      (choice) => choice.rank === null || choice.rank <= params.max_rank,
    ),
  }))
}
