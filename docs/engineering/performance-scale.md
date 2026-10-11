# Performance scale evidence

These measurements cover synthetic local computation and authenticated local
HTTP requests. They establish working instrumentation and expose the remaining
large-population solver cost. They do not establish hosted CPU limits,
cold-isolate behavior or latency on an organiser's computer.

The [evidence file](performance-evidence.json) preserves run UUIDs, source
revisions, environment fingerprints, fixture counts, sample counts, medians,
p95s and completion state. Full local history and drill-down traces are kept
outside the workspace as described in [performance tracking](performance-tracking.md).
Source commit IDs identify the measured working revisions; later commit-stack
rebasing can change those IDs without changing the measured source.

## Workload shapes

| Shape | Events | Families | Persons | Rooms | Beds | Workshops |
|---|---:|---:|---:|---:|---:|---:|
| History | 20,000 | 30 | 90 | 25 | 75 | 15 |
| History | 50,000 | 30 | 90 | 25 | 75 | 15 |
| Population | 20,000 | 1,020 | 3,060 | 850 | 2,550 | 510 |
| Population | 50,000 | 2,550 | 7,650 | 2,125 | 6,375 | 1,275 |

All cases have four buildings, twelve workshop spaces and eight slots. History
adds valid restatements to a fixed population. Population increases the live
entities while retaining that programme grid. The latter deliberately stresses
room search and workshop conflicts; it is not a claim about a typical occasion.

## Measure, fix, measure

Measurements used Linux/arm64, Node 22.23.2 and the repository's Nix environment.
Timing loops exclude fixture setup and representative trace capture. Values are
medians after one warmup. The completed computation suite used three samples per
operation with the sampling window disabled, to bound the largest case's runtime.
With three samples, p95 is just the largest observation. The shared lab host was
not an exclusive controlled benchmark machine.

| Computation | Fixture | Before | After |
|---|---|---:|---:|
| Complete replay | Population, 20k | 3,382 ms | 483 ms |
| Complete replay | Population, 50k | 22,304 ms | 1,347 ms |
| Complete solve | Population, 20k | 43,056 ms | 4,823 ms |
| Attention | Population, 50k, before attention indexing | 5,182 ms | 234 ms |

The replay and inventory changes use transient label indexes, owning-bed place
buckets and grouped capacity/capability reads. The solver shares evaluated
candidate sweeps and placement indexes. Attention groups rejection traces,
assignment counts, membership and workshop demand.

The 20k population baseline was partial after recording replay, solve and
attention. The 50k population baseline recorded replay but did not reach solve
before its deadline. There is **no measured 50k pre-optimization solver result**.
The attention comparison uses a later partial run with replay and solver fixes
already present. Partial runs remain partial in the evidence file.

## Completed computation suite

All four cases completed with every configured root and nested operation. The
50k population case took about 11.6 minutes including setup, repeated solves and
tracing, within its fifteen-minute case deadline.

| Fixture | Replay | Solve | Attention | Organiser edit | Closing calculation |
|---|---:|---:|---:|---:|---:|
| History, 20k | 148 ms | 11 ms | 6 ms | 157 ms | 161 ms |
| History, 50k | 355 ms | 13 ms | 5 ms | 353 ms | 350 ms |
| Population, 20k | 483 ms | 4,823 ms | 99 ms | 5,643 ms | 5,861 ms |
| Population, 50k | 1,347 ms | 31,934 ms | 234 ms | 37,496 ms | 36,833 ms |

An organiser edit composes prospective replay, input construction, solve and
attention. Closing uses the real closing calculation and records its expected
readiness rejection for this synthetic occasion; a timed rejection is not a
successful domain close. Separate sampling means child medians must not be
summed to reconstruct a parent median.

## Authenticated local HTTP

The request lab builds and runs an isolated Worker with local D1, synthetic
sessions, one warmup and three measured requests per route. Each timing includes
response transfer and JSON decoding. Append routes advance the event head.
Wrangler 4.135.0 was used. These routes do not run the complete organiser draft
solver, so their results must not be substituted for organiser-edit computation.

| Fixture | Organiser log | Organiser principal | Family principal | Organiser apply | Family append |
|---|---:|---:|---:|---:|---:|
| History, 20k | 267 ms | 18 ms | 330 ms | 494 ms | 774 ms |
| History, 50k | 619 ms | 16 ms | 803 ms | 1,140 ms | 1,886 ms |
| Population, 20k | 314 ms | 16 ms | 635 ms | 1,648 ms | 1,577 ms |
| Population, 50k | 754 ms | 17 ms | 1,636 ms | 4,257 ms | 4,036 ms |

## Regression gates and verification boundaries

Deterministic tests enforce bounded uniqueness lookups, scoped place reads,
attention array passes, solver rule evaluations and candidate sweeps. At factors
one/two, room search uses 6,400/25,600 rule evaluations and 128/256 placement
sweeps. The whole-plan reference digest remains
`d95045f55764d135475904b6a3effcc08833dd3a7cfb6cf90a90e1a5a4ce05cd`.
The attention reference digest remains
`5d4e29523bebd6bceabd3df4e71a69398196bb285457d68dbf87e92bdbab3139`.
Adapter equivalence, event validation/index lifecycle, real Worker handlers,
telemetry schema/privacy/limits, history persistence and trace conversion have
local tests. An organiser batch also has a replay-count gate.

The production collector, bindings and deployment helper are locally built and
checked with offline configuration tests. They have not been deployed or queried
in the hosted account by this work. Production memory, cold requests, provider
CPU limits, actual sampling volumes and dashboards still require hosted evidence.
The scheduled performance workflow is configured; local success is not evidence
that a hosted workflow run has completed.

[Issue 040](../../spec/issues/archived/040-historical-code-path-metrics.md) is
resolved by the tracking mechanism and verified local procedures.
[Issue 041](../../spec/issues/open/041-incremental-derivation.md) retains the
required decision about the worst-case live-population solver: roughly 32 seconds
for a complete solve and 37 seconds for an organiser edit are not an established
interactive latency envelope. Its M10 acceptance gate remains in force.
