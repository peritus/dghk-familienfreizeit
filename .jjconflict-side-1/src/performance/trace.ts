import type { Measurement } from './results.js'

export type TraceSlice = Measurement & { started_ms: number; track: number }

/** Adapter for synchronous computations. Clock and sink never enter the domain core. */
export function traceRecorder(clock: () => number) {
  const slices: TraceSlice[] = []
  return {
    slices,
    measure<T>(operation: string, eventCount: number, run: () => T): T {
      const started = clock()
      let outcome: Measurement['outcome'] = 'ok'
      try {
        return run()
      } catch (error) {
        outcome = 'error'
        throw error
      } finally {
        slices.push({
          operation,
          event_count: eventCount,
          started_ms: started,
          duration_ms: Math.max(0, clock() - started),
          outcome,
          track: 1,
        })
      }
    },
  }
}

/** Chrome Trace Event JSON, readable by Perfetto without a viewer dependency. */
export function chromeTrace(slices: readonly TraceSlice[], name: string): string {
  const tracks = [...new Set(slices.map((slice) => slice.track))]
  const events: unknown[] = tracks.map((track) => ({
    ph: 'M',
    name: 'thread_name',
    pid: 1,
    tid: track,
    args: { name: `${name} / ${track}` },
  }))
  for (const slice of slices
    .slice()
    .sort(
      (left, right) => left.started_ms - right.started_ms || right.duration_ms - left.duration_ms,
    )) {
    if (
      !Number.isFinite(slice.started_ms) ||
      !Number.isFinite(slice.duration_ms) ||
      slice.duration_ms < 0
    )
      throw new Error('invalid trace timing')
    events.push({
      ph: 'X',
      name: slice.operation,
      cat: 'performance',
      pid: 1,
      tid: slice.track,
      ts: slice.started_ms * 1000,
      dur: slice.duration_ms * 1000,
      args: { event_count: slice.event_count, outcome: slice.outcome },
    })
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Chrome Trace Event schema.
  return JSON.stringify({ traceEvents: events, displayTimeUnit: 'ms' })
}
