import type {
  Plan,
  PreflightFinding,
  SolverConfig,
  SolverContributions,
  SolverInput,
  SolverStage,
  StageOutputs,
  TraceEntry,
} from './types.js'

export function solve(
  input: SolverInput,
  contributions: SolverContributions,
  config: SolverConfig,
): Plan {
  const preflight = (contributions.preflight_checks ?? [])
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((check) => check.run(input, config))
  const sections: Record<string, unknown> = {}
  const trace: TraceEntry[] = []
  const diagnostics: PreflightFinding[] = []
  const outputs: Record<string, unknown> = {}
  for (const stage of orderStages(contributions.stages ?? [])) {
    const result = stage.run(input, outputsFor(stage, outputs), config)
    const moduleId = stage.id.split('.', 1)[0]!
    sections[moduleId] = result.output
    outputs[stage.id] = result.output
    trace.push(...result.trace)
    diagnostics.push(...result.diagnostics)
  }
  return {
    meta: {
      input_seq: input.input_seq,
      build_revision: config.build_revision,
      compatibility_revision: config.compatibility_revision,
      event_date: config.event_date,
    },
    preflight: sortFindings([...preflight, ...diagnostics]),
    sections: Object.freeze(sections),
    trace: Object.freeze(trace),
  }
}

export function orderStages(stages: readonly SolverStage[]): readonly SolverStage[] {
  const byId = new Map(stages.map((stage) => [stage.id, stage]))
  const edges = new Map<string, Set<string>>(stages.map((stage) => [stage.id, new Set()]))
  const addEdge = (from: string, to: string): void => {
    if (from !== to && byId.has(from) && byId.has(to)) edges.get(from)!.add(to)
  }
  for (const stage of stages) {
    for (const dependency of stage.after) addEdge(dependency, stage.id)
    for (const successor of stage.before) addEdge(stage.id, successor)
    for (const dependency of stage.reads) addEdge(dependency, stage.id)
  }
  const indegree = new Map(stages.map((stage) => [stage.id, 0]))
  for (const successors of edges.values())
    for (const successor of successors) indegree.set(successor, indegree.get(successor)! + 1)
  const ready = stages
    .filter((stage) => indegree.get(stage.id) === 0)
    .map((stage) => stage.id)
    .sort()
  const ordered: SolverStage[] = []
  while (ready.length > 0) {
    const id = ready.shift()!
    const stage = byId.get(id)!
    ordered.push(stage)
    for (const successor of edges.get(id)!) {
      const next = indegree.get(successor)! - 1
      indegree.set(successor, next)
      if (next === 0) ready.push(successor)
    }
    ready.sort()
  }
  if (ordered.length !== stages.length) throw new Error('solver stage dependency cycle')
  return Object.freeze(ordered)
}

function outputsFor(stage: SolverStage, outputs: Readonly<Record<string, unknown>>): StageOutputs {
  return Object.freeze(
    Object.fromEntries(stage.reads.filter((id) => id in outputs).map((id) => [id, outputs[id]])),
  )
}

function sortFindings(findings: readonly PreflightFinding[]): readonly PreflightFinding[] {
  return Object.freeze(
    findings
      .map((finding) => ({ ...finding, subjects: Object.freeze(finding.subjects.slice().sort()) }))
      .sort(
        (left, right) =>
          left.check.localeCompare(right.check) ||
          left.severity.localeCompare(right.severity) ||
          left.subjects.join('\u0000').localeCompare(right.subjects.join('\u0000')) ||
          left.text.localeCompare(right.text),
      ),
  )
}
