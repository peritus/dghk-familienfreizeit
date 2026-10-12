import { syntheticLog, syntheticScale, syntheticLogSize } from './log.ts'
import { lifecycleLog, type LifecycleScenario } from './lifecycle.ts'

export function positiveList(value: string): number[] {
  const values = value.split(',').map(Number)
  if (!values.length || values.some((entry) => !Number.isSafeInteger(entry) || entry < 1))
    throw new Error('invalid benchmark counts')
  return values
}

/** Node CLI and computation bench select exactly the same seeded input. */
export function benchmarkCases(env: Readonly<Record<string, string | undefined>> = process.env) {
  if (env.DGHK_CAPACITY_FAMILIES !== undefined) {
    const scenarios = (env.DGHK_CAPACITY_SCENARIOS ?? 'normal,contention').split(',')
    if (scenarios.some((scenario) => !['normal', 'contention'].includes(scenario)))
      throw new Error('invalid lifecycle scenarios')
    return positiveList(env.DGHK_CAPACITY_FAMILIES).flatMap((families) =>
      scenarios.map((scenario) => {
        const fixture = lifecycleLog(
          families,
          scenario as LifecycleScenario,
          Number(env.DGHK_CAPACITY_SEED ?? '2027'),
        )
        return {
          ...fixture,
          lifecycle: true as const,
          workload: `luebben2027-lifecycle-computation-v1:${scenario}`,
        }
      }),
    )
  }
  const scenarios = (env.DGHK_BENCH_SCENARIOS ?? 'history,population').split(',')
  if (scenarios.some((scenario) => !['history', 'population'].includes(scenario)))
    throw new Error('invalid stress scenarios')
  const fixtures = env.DGHK_BENCH_EVENTS
    ? positiveList(env.DGHK_BENCH_EVENTS).flatMap((size) =>
        scenarios.map((scenario) => syntheticLogSize(size, scenario as 'history' | 'population')),
      )
    : positiveList(env.DGHK_BENCH_FACTORS ?? '1,2,4').map((factor) => ({
        events: syntheticLog(syntheticScale(factor)),
        scale: syntheticScale(factor),
        scenario: 'population',
      }))
  return fixtures.map((fixture) => ({
    ...fixture,
    lifecycle: false as const,
    workload: `luebben2027-synthetic-v1:${fixture.scenario}`,
  }))
}
