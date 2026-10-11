# Performance tracking

The performance lab measures the current event-log architecture, including cold
replay and complete solver runs. Operational telemetry is separate from the
event log. No folded domain state is persisted to speed up reads.

## Heavy computations

The [operation catalogue](performance-operations.json) is the complete,
machine-readable list of registered names for the selected profile. Run
`nix develop -c pnpm run perf:catalogue` after changing profile contributions.
A normal unit test checks that the documented list matches the registry.

| Operation | Functions and inner work | Local coverage | Operational coverage |
|---|---|---|---|
| `events.derive` | `derive`, `foldEventLog`/`normalizeEvents`/event application, `resolveFoldedWorld`/`resolve`, `completeDerivedWorld` | Total, phases, every summary and world check | Worker calls/spans; browser elapsed |
| `events.prepare`, `events.parse` | `prepareEventBatch`/`admitProfileProposal`, `parseDraftBatch`/`parseEvent`, prospective replay and append invariants | Batch plus phases; HTTP append | Worker calls/spans; browser elapsed |
| `events.authorize` | `authorizeEventBatch`, typed ownership and offered-label checks | Work counts, elapsed, HTTP append | Worker calls/spans |
| `auth.principal`, `events.read`, `events.append` | `currentPrincipal`, session operations, `readEvents`, payload parsing, `appendCanonicalEvents` | Authenticated HTTP paths with local D1 | Coarse Worker I/O elapsed; invocation CPU/wall |
| `solver.input` | `buildSolverInput`, every registered input builder, including room assignment, workshop scheduling/rankings/attendance | Total and each contribution | Browser elapsed; closing Worker calls/spans |
| `solver.solve` | `solve`, preflight checks, ordered solver stages | Total, all checks and stages, work counts, plan digest | Browser elapsed; closing Worker calls/spans |
| `attention.evaluate` | `profileAttention`/`composeAttention`, every registered check's `collect` | Total, each stable check code, work counts, output digest | Browser elapsed; closing Worker calls/spans |
| `attention.closed`, `phase.status` | `closedAttentionContext`, `derivePhaseStatus` | Elapsed | Browser elapsed |
| `projection.shared`, `projection.family` | `projectSharedWorld`, `projectFamilyWorld` | Elapsed | Currently no production caller |
| `closing.fill` | `fillClosingPayloads`, prospective replay, input construction, solve, attention and closing result | Includes the expected rejection of an unready synthetic occasion | Worker calls/spans |
| `organiser.edit` | Prospective world, solver input, solve and attention | Complete composed calculation | Individual browser calculations; no combined React-render latency claim |
| `request.*` | Organiser log, organiser/family principal, organiser apply and family append handlers | Real HTTP, local Worker/D1, response decoding | Selected request invocation CPU/wall |

Inner names are `world.summary:<id>`, `world.check:<index>`,
`solver.input:<id>`, `solver.check:<id>`, `solver.stage:<id>` and
`attention.check:<code>`. Profiling adapters decorate registered callbacks;
adding a contribution includes it automatically. World checks currently have
no declared ID, so their ordinal is interpreted together with the build
revision. Individual per-event validators and per-candidate rules use
deterministic cost gates rather than thousands of spans. The fold span covers
their aggregate replay cost.

Clocks and trace sinks live in adapters. The kernel, resolver, attention
engine and solver continue to receive ordinary deterministic inputs. The
profiler preserves return values and exceptions. Repeated nested wrappers of
the same operation produce one operational measurement.

## Lifecycle capacity lab

Use the [lifecycle capacity guide](lifecycle-capacity.md) to measure family
counts with natural action histories, allocation completeness, payload bytes
and explicit latency budgets. The exact-size cases below remain stress controls.

## Local computation lab

```sh
nix develop -c pnpm run bench:scale
nix develop -c pnpm run perf:report
nix develop -c pnpm run perf:report -- --fail-on-regression
```

`bench:scale` runs four cases sequentially: exactly 20,000 and 50,000 events,
each with two deliberately different shapes:

- **History:** a fixed live population, with additional valid label restatements.
  This isolates event-log length from live entity count.
- **Population:** increasing families, persons, rooms, beds and workshops. The
  programme's slot/space grid remains fixed. This exposes repeated entity and
  candidate scans hidden by a history-only test.

The [generator](../../test/bench/log.ts) creates valid synthetic data with both
required room traits. Counts are saved with each run. All dates, audiences and
solver inputs used by the computation bench are reproducible. Setup and
representative tracing are excluded from the timing loops.

`bench` also supports the smaller default factors `1,2,4`. Configuration:

| Variable | Default | Meaning |
|---|---|---|
| `DGHK_BENCH_EVENTS` | `20000,50000` in `bench:scale` | Exact event counts |
| `DGHK_BENCH_SCENARIOS` | `history,population` | Fixture shapes |
| `DGHK_BENCH_FACTORS` | `1,2,4` in `bench` | Used when exact counts are unset |
| `DGHK_BENCH_STAGES` | All listed computation stages | `derive,buildSolverInput,solve,attention,prepareEventBatch,authorizeEventBatch,projectSharedWorld,projectFamilyWorld,edit,closing` |
| `DGHK_BENCH_MIN_SAMPLES` | `3` | Minimum repetitions after one warmup |
| `DGHK_BENCH_MAX_SAMPLES` | `25` | Maximum repetitions |
| `DGHK_BENCH_SAMPLE_MS` | `2000` | Per-operation sampling window, subject to the minimum/maximum |
| `DGHK_BENCH_TIMEOUT_MS` | `900000` | Per-case process deadline in `bench:scale` |
| `DGHK_PERF_REGRESSION_THRESHOLD` | `0.2` | Relative median or p95 warning threshold |

For a focused replay measurement:

```sh
nix develop -c sh -c 'DGHK_BENCH_EVENTS=20000,50000 DGHK_BENCH_STAGES=derive pnpm run bench:scale'
```

A deadline stops the owned child process group. It does not erase completed
measurements. Checkpoints identify the pending operation and its start time.
An interrupted run is reported as partial, never as a successful scale pass.

## Local authenticated request lab

```sh
nix develop -c pnpm run bench:requests
```

This builds the Worker, creates a private temporary D1 database, applies its
migrations and imports only synthetic events and sessions. It starts a Worker
bound to `127.0.0.1` on an unused port. Production credentials, the normal local
preview database and hosted services are not used. The child process group and
temporary state are removed on exit. `DGHK_PERF_KEEP_LAB=1` retains that synthetic
state for examination.

The same exact-size/shape variables select cases. `DGHK_PERF_REQUEST_SAMPLES`
defaults to `7` and accepts `1..25`. Each route has one warmup followed by the
configured repetitions. Authenticated organiser/family reads and both append
paths are exercised. Appends advance the head and use the preceding response's
head; fixture import, startup and build time are excluded. Host-clock timing
includes HTTP, Worker/D1 work, response transfer and JSON decoding. These are
local warmed requests, not hosted network or cold-isolate guarantees.

The request trace has HTTP intervals. Use the computation bench for detailed
pure-function slices and the hosted runbook for provider request spans.

## Results over time

Results are appended to
`$XDG_STATE_HOME/dghk-familienfreizeit/performance/runs.jsonl`, or
`~/.local/state/dghk-familienfreizeit/performance/runs.jsonl` when unset. This is
outside workspaces, so workspace cleanup does not remove history. Each run has
a UUID, timestamp, source change/commit and parent, machine fingerprint,
platform/architecture/runtime, fixture name/version/counts, sample count,
median, p95, output hash and completion state. HTTP runs also record the
Wrangler version. A fresh empty working copy records its parent source revision.
CI records `GITHUB_SHA`.

There is no automatic local expiry. Back up the directory to retain it across
machine replacement. Files use mode 600 and new directories mode 700. Checkpoint
rows are append-only; reading history keeps the last row for each run UUID.
Trace files are named `<run-id>.trace.json` alongside the JSONL file and contain
timing/count/outcome rather than domain output.

`perf:report` compares each latest workload/shape with the last ten matching
machine/runtime/platform/architecture observations. Different environments or
fixture versions are excluded. Median and p95 are both compared; the default
20% threshold reports a warning. `--fail-on-regression` makes that warning a
nonzero exit for an explicitly controlled local run. Repeat a warning before
concluding that code regressed. Three samples give an indicative median and a
p95 equal to the largest observation, not a reliable tail estimate.

Growth exponents are reported only for matching workloads, environments and
source revisions across event counts. They are descriptive, not CI gates.
For population fixtures, growth includes live entity/search growth as well as
log length. Do not compare those exponents with history-only runs.

The separate [performance workflow](../../.github/workflows/performance.yml)
is scheduled weekly and can be dispatched manually. It uploads JSONL and
traces, including partial runs, with 90-day artifact retention. Download them
before expiry for longer retention. Ordinary CI gates count work and verify
output digests; noisy shared-runner timings do not block merges. Hosted workflow
execution is separate evidence from local verification.

## Visual drill-down

Open a `.trace.json` file in [Perfetto UI](https://ui.perfetto.dev/). The project
exports [Chrome Trace Event JSON](https://perfetto.dev/docs/getting-started/other-formats),
with complete microsecond slices, thread metadata, stable names and nested
computation phases. Perfetto is an examination tool, not a runtime dependency.
Parent timings include their children; do not add them together.

```sh
nix develop -c pnpm run perf:export -- cloudflare /tmp/trace-events.json /tmp/request.trace.json
nix develop -c pnpm run perf:export -- cpu-profile /tmp/local.cpuprofile /tmp/cpu.trace.json
```

The Cloudflare converter accepts a telemetry API event response, its nested
`events.events` collection, or an extracted event array. It removes arbitrary
attributes, headers and correlation identifiers. Concurrent crossing intervals
use separate tracks instead of claiming a synchronous nesting relationship.
Inspect names before sharing an imported trace. Millisecond precision and
zero-duration CPU-only spans remain limitations of the source data.

The CPU converter accepts a Chrome DevTools/V8 profile with nodes, samples and
microsecond `timeDeltas`. It coalesces sampled call stacks into nested slices,
rejects invalid trees/times and leaves the unsampled initial gap empty. It does
not imply exact function-call latency. Local Worker DevTools can capture this
format. Cloudflare's production profiler exports **pprof**, which belongs in
the provider flamegraph or a pprof-compatible viewer; aggregated pprof samples
are not turned into an invented Perfetto timeline.

## Operational metrics

The production templates enable `DGHK_PERFORMANCE=on`, bind `PERFORMANCE` to
the `dghk_performance` Analytics Engine dataset and attach a separate Tail
collector. The local/preview application configuration leaves collection off.
The deployment helper stages and deploys the collector in the configured
external account before deploying the application. Its name is the first 48
characters of the application Worker name plus `-performance`. The collector
has no D1 binding and no tail consumer of its own.

The selected request paths and individual organiser browser calculations are
sampled at 5%. Application sampling is independent of the provider's 5% trace
head sampling. Detailed custom spans are emitted by the sampled adapter;
both samples must coincide to retain those inner spans. Each measurement batch
has at most 192 rows. Repeated names/outcomes are aggregated per batch. The Tail
collector caps writes across its invocation at 250 and records dropped rows.
Browser ingestion requires an organiser session, trusted origin, current build,
allowlisted names, exact fields, finite/bounded numbers and a maximum 48 KiB body;
it allows at most 120 accepted batches per organiser per hour. Failed delivery
does not block calculations. Browser durations are client-reported observations.

### Clock meanings

Cloudflare [JavaScript timers advance after I/O](https://developers.cloudflare.com/workers/runtime-apis/performance/).
Consequently, synchronous Worker stages produce **call counts**, not fake CPU
durations of zero. Custom spans show code boundaries but cannot recover precise
CPU phase durations from this clock. The Tail collector reads provider
invocation `cpuTime`/`wallTime` independently of those timers. It reads only the
sanitized performance marker and discards unrelated logs, URLs, headers and
exceptions. Handled HTTP errors are marked as errors alongside provider failures.
A request that is killed before its marker is emitted is absent
from this sampled dataset; use provider invocation/error analytics for that case.

| `measurement_kind` | Meaning |
|---|---|
| `elapsed` | Browser elapsed time |
| `io-elapsed` | Coarse Worker interval containing I/O; includes CPU elapsed before the last clock advancement |
| `calls` | Execution count; duration is intentionally zero and excluded from latency queries |
| `cpu` | Provider total CPU milliseconds for the sampled invocation |
| `wall` | Provider total wall milliseconds for the sampled invocation |

### Dataset schema and queries

| Column | Value |
|---|---|
| `blob1` | Schema version `1` |
| `blob2` | `worker` or `browser` |
| `blob3` | Stable operation |
| `blob4` | `ok` or `error` |
| `blob5` | Full build revision; `collector` for the collector-wide dropped-row sentinel |
| `blob6` | Measurement kind |
| `double1` | Duration milliseconds |
| `double2` | Maximum event count observed for the operation in the batch |
| `double3` | Call count in the batch |
| `double4` | Application sample interval, `20` |
| `index1` | Source plus stable operation category; no per-request ID |

Analytics Engine [retains data for three months](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
and [adaptively samples rows](https://developers.cloudflare.com/analytics/analytics-engine/sampling/).
Export aggregates before retention expires when a longer production history is
needed. Expect up to `0.05 × request volume × 194` server points before collector
caps, plus bounded accepted browser batches. Review volume/cost and dropped
counts after deployment. This bounds each invocation; it is not a global daily
quota or guaranteed delivery service.

Example latency panel for Cloudflare SQL or a Grafana query:

```sql
SELECT
  toStartOfHour(timestamp) AS hour,
  blob2 AS source, blob3 AS operation, blob4 AS outcome,
  blob5 AS build_revision, blob6 AS kind,
  intDiv(double2, 10000) * 10000 AS event_bucket,
  quantileExactWeighted(0.5)(double1 / double3, _sample_interval) AS p50_ms,
  quantileExactWeighted(0.95)(double1 / double3, _sample_interval) AS p95_ms,
  SUM(_sample_interval * double3 * double4) AS estimated_calls
FROM dghk_performance
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob6 IN ('elapsed', 'io-elapsed', 'cpu', 'wall')
GROUP BY hour, source, operation, outcome, build_revision, kind, event_bucket
ORDER BY hour
```

With repeated calls, the plotted duration is a batch mean, not a reconstructed
per-call distribution. Invocation CPU/wall and the browser calculation roots
normally have one call per batch. Keep kind/source separate, filter deployment
and event bucket when comparing, and never add inclusive parent/child durations.
For errors and volume, include `calls` and group by `blob4`, using
`SUM(_sample_interval * double3 * double4)`. The constant application weight
cancels in a grouped percentile; platform sampling still needs `_sample_interval`.

## Scale evidence and remaining limits

See [scale evidence](performance-scale.md) for measurements, sample counts and
verification boundaries. A long event history with a fixed live population and
a log containing thousands of simultaneously live families have very different
solver costs. A successful 50k replay does not establish interactive editing or
an acceptable production CPU budget for every population shape.
