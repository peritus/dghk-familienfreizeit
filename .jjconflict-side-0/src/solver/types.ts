import type { Entity, World } from '../events/fold.js'
import type { ResolvedRequirement } from '../events/resolver.js'
import type { JsonValue } from '../events/types.js'

export type SolverLabel = {
  entity_id: string
  key: string
  value: JsonValue
  strength: 'required' | 'preferred' | null
  set_seq: number
}

export type SolverFamily = Entity & { person_ids: readonly string[] }

export type SolverPerson = Entity & { family_id: string }

export type SolverInputContribution = {
  id: string
  build: (world: World) => unknown
}

export type SolverInput = Readonly<{
  input_seq: number
  families: readonly SolverFamily[]
  persons: readonly SolverPerson[]
  labels: readonly SolverLabel[]
  capabilities: ReadonlyMap<string, ReadonlySet<string>>
  constraints: readonly {
    key: string
    holder_id: string
    value: string
    strength: 'required' | 'preferred' | null
    set_seq: number
  }[]
  requirements: readonly ResolvedRequirement[]
  rules: readonly Rule[]
  module_inputs: Readonly<Record<string, unknown>>
  previous_plan?: Plan | null
}>

export type SolverConfig = Readonly<{
  build_revision: string
  compatibility_revision: number
  event_date: string
  profile: unknown
  seed: number | null
}>

export type StageOutputs = Readonly<Record<string, unknown>>

export type TraceEntry = {
  stage: string
  step: string
  subject: string
  text: string
  detail?: {
    chosen?: { target: string; score: number; terms: readonly [string, number][] }
    runners_up?: readonly {
      target: string
      score: number
      terms: readonly [string, number][]
    }[]
    rejected?: readonly { target: string; rule: string }[]
  }
}

export type PreflightFinding = {
  check: string
  severity: 'error' | 'warning' | 'info'
  subjects: readonly string[]
  text: string
}

export type StageResult<Output = unknown> = {
  output: Output
  trace: readonly TraceEntry[]
  diagnostics: readonly PreflightFinding[]
}

export type SolverStage<Output = unknown> = {
  id: string
  after: readonly string[]
  before: readonly string[]
  reads: readonly string[]
  run: (input: SolverInput, upstream: StageOutputs, config: SolverConfig) => StageResult<Output>
}

export type Rule<Candidate = unknown, Target = unknown, Context = unknown> = {
  id: string
  evaluate(candidate: Candidate, target: Target, context: Context): number | 'infeasible'
  describe(candidate: Candidate, target: Target, context: Context): string | null
}

export type PreflightCheck = {
  id: string
  severity: PreflightFinding['severity']
  run: (input: SolverInput, config: SolverConfig) => readonly PreflightFinding[]
}

export type SolverContributions = {
  solver_input?: readonly SolverInputContribution[]
  stages?: readonly SolverStage[]
  rules?: readonly Rule[]
  preflight_checks?: readonly PreflightCheck[]
}

export type Plan = {
  meta: {
    input_seq: number
    build_revision: string
    compatibility_revision: number
    event_date: string
  }
  preflight: readonly PreflightFinding[]
  sections: Readonly<Record<string, unknown>>
  trace: readonly TraceEntry[]
}

export type PlanDiff = {
  changes: readonly {
    kind: string
    subject: string
    before?: string
    after?: string
    reason: string
  }[]
}
