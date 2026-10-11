import { expect, test } from 'vitest'
import { cloudflareTrace, cpuProfileTrace } from '../../src/performance/import-trace.js'

test('portable span import splits crossing async spans and removes private attributes', () => {
  const api = JSON.parse(
    cloudflareTrace({
      result: {
        events: {
          events: [
            {
              $metadata: {
                traceId: 'private',
                spanName: 'events.derive',
                startTime: 100,
                endTime: 101,
              },
              source: { event: { email: 'private' } },
            },
          ],
        },
      },
    }),
  )
  expect(api.traceEvents.find((event: { ph: string }) => event.ph === 'X')).toMatchObject({
    name: 'events.derive',
    ts: 0,
    dur: 1000,
  })
  const trace = JSON.parse(
    cloudflareTrace({
      result: {
        events: [
          {
            name: 'parent',
            $trace: { traceId: 'secret-trace-id', startTimeMs: 1000, endTimeMs: 1020 },
            attributes: { email: 'private' },
          },
          {
            name: 'child',
            $trace: { traceId: 'secret-trace-id', startTimeMs: 1005, endTimeMs: 1015 },
          },
          {
            name: 'crossing',
            $trace: { traceId: 'secret-trace-id', startTimeMs: 1010, endTimeMs: 1025 },
          },
        ],
      },
    }),
  )
  const slices = trace.traceEvents.filter((event: { ph: string }) => event.ph === 'X')
  expect(slices.map((event: { ts: number }) => event.ts)).toEqual([0, 5000, 10000])
  expect(slices[0].tid).toBe(slices[1].tid)
  expect(slices[2].tid).not.toBe(slices[0].tid)
  expect(JSON.stringify(trace)).not.toMatch(/private|secret-trace-id/)
  expect(() => cloudflareTrace({ events: [] })).toThrow()
})

test('CPU samples become nested microsecond slices and preserve unsampled gaps', () => {
  const input = {
    nodes: [
      { id: 1, callFrame: { functionName: '(root)' }, children: [2] },
      { id: 2, callFrame: { functionName: 'derive' }, children: [3] },
      { id: 3, callFrame: { functionName: 'resolve' } },
    ],
    samples: [2, 3, 2],
    timeDeltas: [10, 10, 10],
    startTime: 1000,
    endTime: 1040,
  }
  const slices = JSON.parse(cpuProfileTrace(input)).traceEvents.filter(
    (event: { ph: string }) => event.ph === 'X',
  )
  expect(
    slices.map((event: { name: string; ts: number; dur: number }) => [
      event.name,
      event.ts,
      event.dur,
    ]),
  ).toEqual([
    ['(root)', 10, 30],
    ['derive', 10, 30],
    ['resolve', 20, 10],
  ])
  expect(() => cpuProfileTrace({ ...input, timeDeltas: [-1, 10, 10] })).toThrow()
  expect(() => cpuProfileTrace({ ...input, samples: [999] })).toThrow()
})
