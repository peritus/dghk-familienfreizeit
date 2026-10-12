/* eslint-disable @typescript-eslint/naming-convention -- Cloudflare and Chrome external schemas. */
import { chromeTrace, type TraceSlice } from './trace.ts'

/** Cloudflare telemetry API `events` response; retains only names, timing and hierarchy. */
export function cloudflareTrace(value: unknown): string {
  const envelope = value as { result?: { events?: unknown }; events?: unknown }
  const collection = Array.isArray(value) ? value : (envelope?.result?.events ?? envelope?.events)
  const events = Array.isArray(collection)
    ? collection
    : (collection as { events?: unknown })?.events
  if (!Array.isArray(events)) throw new Error('expected a telemetry events array')
  const slices: TraceSlice[] = []
  const tracks = new Map<string, number>()
  const lanes = new Map<number, { start: number; end: number }[]>()
  for (const event of events) {
    const span = event as {
      source?:
        | string
        | {
            name?: string
            startTime?: number
            endTime?: number
            event?: { 'performance.operation'?: string }
          }
      name?: string
      $metadata?: { traceId?: string; spanName?: string; startTime?: number; endTime?: number }
      $trace?: { traceId?: string; startTimeMs?: number; endTimeMs?: number }
      attributes?: { 'performance.operation'?: string }
    }
    const source = typeof span.source === 'object' ? span.source : undefined
    const trace = span.$trace ?? {
      traceId: span.$metadata?.traceId,
      startTimeMs: span.$metadata?.startTime ?? source?.startTime,
      endTimeMs: span.$metadata?.endTime ?? source?.endTime,
    }
    if (
      !trace ||
      typeof trace.traceId !== 'string' ||
      typeof trace.startTimeMs !== 'number' ||
      typeof trace.endTimeMs !== 'number' ||
      !Number.isFinite(trace.startTimeMs) ||
      !Number.isFinite(trace.endTimeMs) ||
      trace.endTimeMs < trace.startTimeMs
    )
      continue
    if (!tracks.has(trace.traceId)) tracks.set(trace.traceId, tracks.size + 1)
    const track = tracks.get(trace.traceId)!
    const name =
      span.attributes?.['performance.operation'] ??
      source?.event?.['performance.operation'] ??
      span.$metadata?.spanName ??
      source?.name ??
      span.name ??
      'span'
    slices.push({
      operation: name,
      started_ms: trace.startTimeMs,
      duration_ms: trace.endTimeMs - trace.startTimeMs,
      track,
      event_count: 0,
      outcome: 'ok',
    })
  }
  if (!slices.length) throw new Error('no valid timestamped spans found')
  const origin = Math.min(...slices.map((slice) => slice.started_ms))
  // Complete events on one Perfetto track must be properly nested. Put crossing
  // async intervals on separate lanes rather than inventing a parent hierarchy.
  for (const slice of slices.sort(
    (a, b) => a.started_ms - b.started_ms || b.duration_ms - a.duration_ms,
  )) {
    const original = slice.track
    let lane = original
    const start = slice.started_ms
    const end = start + slice.duration_ms
    while (
      (lanes.get(lane) ?? []).some(
        (interval) =>
          start < interval.end &&
          interval.start < end &&
          !(start >= interval.start && end <= interval.end),
      )
    )
      lane += tracks.size
    const intervals = lanes.get(lane) ?? []
    intervals.push({ start, end })
    lanes.set(lane, intervals)
    slice.track = lane
    slice.started_ms -= origin
  }
  return chromeTrace(slices, 'Cloudflare request spans (I/O clock)')
}

/** Chrome DevTools/V8 sampled CPU profile. This is sampled stack attribution. */
export function cpuProfileTrace(value: unknown): string {
  const profile = value as {
    nodes?: { id: number; callFrame: { functionName: string }; children?: number[] }[]
    samples?: number[]
    timeDeltas?: number[]
    startTime?: number
    endTime?: number
  }
  if (
    !Array.isArray(profile?.nodes) ||
    !profile.nodes.length ||
    !Array.isArray(profile.samples) ||
    !Array.isArray(profile.timeDeltas) ||
    profile.samples.length !== profile.timeDeltas.length ||
    typeof profile.startTime !== 'number' ||
    typeof profile.endTime !== 'number' ||
    !Number.isFinite(profile.startTime) ||
    !Number.isFinite(profile.endTime) ||
    profile.endTime < profile.startTime
  )
    throw new Error('invalid CPU profile')
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]))
  const parents = new Map<number, number>()
  if (nodes.size !== profile.nodes.length) throw new Error('duplicate CPU node')
  for (const node of profile.nodes) {
    if (!Number.isSafeInteger(node.id) || typeof node.callFrame?.functionName !== 'string')
      throw new Error('invalid CPU node')
    for (const child of node.children ?? []) {
      if (!nodes.has(child) || parents.has(child)) throw new Error('invalid CPU tree')
      parents.set(child, node.id)
    }
  }
  const stacks = new Map<number, number[]>()
  const stackFor = (id: number): number[] => {
    const cached = stacks.get(id)
    if (cached) return cached
    const path: number[] = []
    let current: number | undefined = id
    while (current !== undefined) {
      if (!nodes.has(current) || path.includes(current)) throw new Error('invalid CPU stack')
      path.push(current)
      current = parents.get(current)
    }
    path.reverse()
    stacks.set(id, path)
    return path
  }
  const slices: TraceSlice[] = []
  let active: { id: number; started: number }[] = []
  let timestamp = profile.startTime
  const close = (from: number, at: number) => {
    for (const frame of active.slice(from))
      if (at > frame.started)
        slices.push({
          operation: nodes.get(frame.id)!.callFrame.functionName || '(anonymous)',
          started_ms: (frame.started - profile.startTime!) / 1000,
          duration_ms: (at - frame.started) / 1000,
          track: 1,
          event_count: 0,
          outcome: 'ok',
        })
    active = active.slice(0, from)
  }
  for (const [index, id] of profile.samples.entries()) {
    const delta = profile.timeDeltas[index]!
    if (!Number.isSafeInteger(delta) || delta < 0) throw new Error('invalid CPU sample delta')
    timestamp += delta
    if (timestamp > profile.endTime) throw new Error('CPU sample exceeds capture')
    const stack = stackFor(id)
    let common = 0
    while (common < active.length && common < stack.length && active[common]!.id === stack[common])
      common++
    close(common, timestamp)
    active.push(...stack.slice(common).map((node) => ({ id: node, started: timestamp })))
  }
  close(0, profile.endTime)
  return chromeTrace(slices, 'Sampled CPU stacks')
}
