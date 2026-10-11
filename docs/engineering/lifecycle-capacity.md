# Lifecycle capacity lab

This lab measures an assumed occasion lifecycle across family counts. It reports
families, people, generated events, UTF-8 log bytes, allocation completeness and
operation latency together. The lifecycle distribution is explicit synthetic
input, not an observed distribution from a deployed occasion.

## Routine 100-family check

The accepted practical target is **100 families** in both lifecycle scenarios,
with p95 budgets of 500 ms for calculation and 1,000 ms for each append route.
Run this fixed shape repeatedly to track performance as code changes:

```sh
nix develop -c sh -c 'DGHK_CAPACITY_FAMILIES=100 pnpm run bench:capacity'
nix develop -c sh -c 'DGHK_CAPACITY_FAMILIES=100 pnpm run bench:capacity:requests'
nix develop -c pnpm run perf:report
nix develop -c pnpm run perf:capacity
```

History compares each operation with recent matching workload, shape and
runtime/machine observations, and reports median or p95 regressions. The accepted
target is a local lab envelope; hosted and browser checks belong to
[launch hardening](../../spec/roadmap.md#m15--deployment-security-and-launch-hardening).

## Run the sweep

Use the repository Nix environment. The defaults are 50, 100, 150, 200, 300 and
500 families, with `normal` and `contention` cases at each size:

```sh
nix develop -c pnpm run bench:capacity
nix develop -c pnpm run bench:capacity:requests
nix develop -c pnpm run perf:capacity
```

The computation runner executes cases sequentially, with seven repetitions after
one warmup and a fifteen-minute deadline per case. The HTTP runner builds the
Worker and uses the same materialized lifecycle fixtures in isolated local D1.
Fixture import uses bounded batches of parameterized D1 inserts in a private
setup isolate, including the larger closing payloads. That isolate is disposed
before the measured Worker starts. It measures organiser log, organiser
and family memberships, organiser append, family REST reads and person PATCH. Setup, migrations, fixture construction and closing
history construction are excluded from timing loops. HTTP timing includes
response transfer and JSON decoding.

History and Perfetto traces use the existing durable store described in
[performance tracking](performance-tracking.md#results-over-time). Source
revision, runtime, machine, scenario, seed, family/entity counts and bytes are
recorded. Allocation observations and closing bytes are numeric metadata;
domain payloads are absent from measurement history and exported timing traces.

## What the lifecycle contains

The [generator](../../test/bench/lifecycle.ts) emits reproducible actions and
records their phase and event batch size. Event count follows from those actions;
there is no target event count and no padding loop.

- **Venue/programme:** three buildings; 1.2 rooms per family, rounded up; rooms
  with two to six sleeping places, including double beds; twelve workshop
  spaces, eight slots and thirty workshops. Ten external leaders are available
  for the three scheduled slots. Capacity grows with participants; timetable
  and workshop count remain fixed. The normal case deliberately has spare
  inventory so an undersupplied venue does not masquerade as a compute limit.
- **Registration:** households of two to six people, varying ages, one/two
  adults, children and some infants. One invitation per family and one creation
  event per person. A creation event can populate several derived labels.
- **Preferences:** three accommodation response controls per family, selected
  requirements/preferred traits, some keep-apart relationships and family
  notes; diet for every person, food notes for a subset and infant bed flags.
  Tri-state controls emit their actual clear/clear/write batches.
- **Workshop choices:** three eligible choices per non-infant person, spread
  across three scheduled slots. Each added choice clears the previous list and
  writes the complete current list, matching the current picker. These are
  deliberate user actions, not a synthetic single-event ranking shortcut.
- **Corrections:** one name correction for every tenth person, a diet change
  for every twentieth person, one ranking reorder for every fifth eligible
  person, and a room-preference revision for every tenth family. Three workshop
  descriptions are corrected. No unbounded editing is generated.
- **Closing/reopening:** when allocations are complete, the real closing code
  produces accommodation and workshop payloads, acknowledges advisories when
  required, and reopens both areas for measured editing. These few events contain
  larger structured payloads. Their event count and byte size are recorded.

The [materializer](../../test/bench/lifecycle-world.ts) derives and solves the
fixture to construct closing history. A fixture with incomplete allocations does
not receive fabricated successful closing events.

### Contention case

The contention case retains the same broad lifecycle and programme. It makes
accessible rooms less plentiful, increases accessibility requirements, and
concentrates half of participants' first choices on popular eligible workshops.
Later choices remain distributed. Both scenarios retain explicit household,
programme and correction assumptions. They cover these assumptions, not every
possible constraint graph or venue layout.

## Capacity assessment

The user-selected defaults are **500 ms p95 for `organiser.edit`** and
**1,000 ms p95 for each authenticated append route**. Organiser edit includes
prospective replay, solver input, full solve and attention. Request timings use
a host clock around real local HTTP requests.

`perf:capacity` reports computation and requests separately. For each source,
environment, scenario and seed it shows:

- Each measured family count, person count, natural event count and log bytes.
- Measured p95 and the configured limit for each required operation.
- Latency `pass`, `fail` or `incomplete`.
- Allocation `complete`, `needs-attention` or `unknown`.
- The tested passing prefix and the first unsupported tested row.
- A midpoint family count to refine an observed boundary.

A supported observation needs a completed run, at least three samples for every
required operation, and complete allocations: no unplaced families, sleeping-place
shortfall, unscheduled workshops or eligible people with fewer than two assigned
workshops. Fast rejection or missing measurement cannot establish capacity.
Missing HTTP evidence is reported explicitly. A higher passing row after a lower
failure does not extend the passing prefix.

Seven samples make an indicative sample p95, usually the largest sample. Repeat
near the boundary and vary seeds before making an operational capacity claim.
A passing prefix describes the tested points; it does not prove every intermediate
population. If all cases pass, the largest tested row is a lower bound on what
was demonstrated, not the system's maximum.

The combined capacity statement must satisfy both scopes for the same scenario,
seed, source and machine, and state the calculation/request budgets. The CLI's
separate scope reports do not establish hosted, concurrent-user or browser-render
capacity.

## Configuration and refinement

| Variable | Default | Meaning |
|---|---|---|
| `DGHK_CAPACITY_FAMILIES` | `50,100,150,200,300,500` in capacity commands | Explicit family counts, `1..2000` |
| `DGHK_CAPACITY_SCENARIOS` | `normal,contention` | Lifecycle cases |
| `DGHK_CAPACITY_SEED` | `2027` | Reproducible household seed, unsigned 32-bit integer |
| `DGHK_CAPACITY_CALCULATION_MS` | `500` | Report p95 organiser-edit budget |
| `DGHK_CAPACITY_APPEND_MS` | `1000` | Report p95 budget for each append route |
| `DGHK_BENCH_MIN_SAMPLES` | `7` in `bench:capacity` | Computation repetitions after warmup |
| `DGHK_BENCH_MAX_SAMPLES` | `25` | Computation sample ceiling |
| `DGHK_BENCH_SAMPLE_MS` | `0` in `bench:capacity` | Extra computation sampling window |
| `DGHK_PERF_REQUEST_SAMPLES` | `7` | HTTP repetitions after warmup |
| `DGHK_BENCH_TIMEOUT_MS` | `900000` | Computation deadline per case |

To refine, for example, a boundary between 150 and 200 families:

```sh
nix develop -c sh -c 'DGHK_CAPACITY_FAMILIES=175 pnpm run bench:capacity'
nix develop -c sh -c 'DGHK_CAPACITY_FAMILIES=175 pnpm run bench:capacity:requests'
```

To measure another seed or assess different budgets:

```sh
nix develop -c sh -c 'DGHK_CAPACITY_SEED=42 DGHK_CAPACITY_FAMILIES=150,175,200 pnpm run bench:capacity'
nix develop -c sh -c 'DGHK_CAPACITY_CALCULATION_MS=500 DGHK_CAPACITY_APPEND_MS=1000 pnpm run perf:capacity'
nix develop -c pnpm run perf:capacity --fail-on-limit
```

`--fail-on-limit` checks every lifecycle row in the selected history. A sweep
beyond the accepted target can intentionally fail that gate. The weekly performance
workflow retains these observations and a text report; elapsed-time budgets do
not block ordinary CI on shared runners. Existing exact 20k/50k history and
population fixtures remain separate stress controls.

## Measured results

[Curated evidence](lifecycle-capacity-evidence.json) records 36 completed runs:
nine family counts in two scenarios, each measured as computation and HTTP.
All use the same source, seed 2027, Linux/arm64 machine fingerprint and Node
22.23.2; HTTP uses Wrangler 4.135.0. Cases ran sequentially after one warmup,
with seven samples per operation. The shared lab host was not an exclusive
benchmark machine. The final calculation pass selected `edit,attention`;
representative traces include draft preparation, replay, solver input/stages
and individual attention checks. The default suite measures other roots and
phases separately as well.

### Accepted 100-family envelope

Both cases have **389 people**, including ten infants, 120 rooms, thirty
workshops and ten external leaders. Normal produces **6,862 events / 1,619,016
UTF-8 bytes**; contention produces **6,837 events / 1,613,369 bytes**. Both
complete all allocations, construct real closing results and reopen for editing.

| Case | Calculation p95 | Organiser append p95 | Family append p95 |
|---|---:|---:|---:|
| Normal | 236 ms | 411 ms | 446 ms |
| Contention | 192 ms | 377 ms | 424 ms |

This meets the selected local budgets for the accepted 100-family lifecycle
shape. It is not a statement that every 100-family event log, venue or constraint
graph meets those budgets. The implementation source ancestor, measured source,
run UUIDs, allocation counts, bytes and sample counts are preserved in the evidence.

### Larger tested shapes

The slowest append column is the larger p95 of the two append routes. All normal
cases have complete allocations. Values are rounded milliseconds; JSON retains
unrounded timings. Log size uses MiB (1,048,576 bytes).

| Normal families | People | Events | Log MiB | Calculation p95 | Slowest append p95 |
|---|---:|---:|---:|---:|---:|
| 50 | 189 | 3,413 | 0.77 | 92 ms | 251 ms |
| 100 | 389 | 6,862 | 1.54 | 236 ms | 446 ms |
| 125 | 492 | 8,617 | 1.94 | 271 ms | 545 ms |
| 150 | 595 | 10,389 | 2.34 | 400 ms | 665 ms |
| 175 | 697 | 12,143 | 2.74 | 436 ms | 797 ms |
| 200 | 791 | 13,797 | 3.11 | 525 ms | 875 ms |
| 300 | 1203 | 20,831 | 4.71 | 1043 ms | 1341 ms |
| 500 | 1963 | 34,188 | 7.75 | 2516 ms | 2423 ms |
| 750 | 2971 | 51,571 | 11.71 | 4853 ms | 4538 ms |

| Contention families | Events | Calculation p95 | Slowest append p95 | People with fewer than two assignments |
|---|---:|---:|---:|---:|
| 50 | 3,400 | 95 ms | 242 ms | 0 |
| 100 | 6,837 | 192 ms | 424 ms | 0 |
| 125 | 8,587 | 262 ms | 560 ms | 0 |
| 150 | 10,347 | 344 ms | 671 ms | 2 |
| 175 | 12,094 | 437 ms | 764 ms | 6 |
| 200 | 13,743 | 518 ms | 894 ms | 3 |
| 300 | 20,756 | 984 ms | 1305 ms | 0 |
| 500 | 34,059 | 2596 ms | 2312 ms | 4 |
| 750 | 51,379 | 4855 ms | 4070 ms | 3 |

The tested passing prefixes reach **175 families / 12,143 events** for normal
and **125 families / 8,587 events** for contention under both latency budgets
and complete-allocation criteria. Normal first fails calculation latency at
200 families. Contention first fails allocation completeness at 150; its
calculation latency still passes there. The complete 300-family contention
allocation illustrates why later passing allocation rows do not erase lower
shortfalls. These are tested points, not an inferred maximum.

Natural 20k and 50k cases complete, but exceed the chosen latency budgets.
The practical accepted target remains 100 families. Exact-size history/population
controls and their measured costs remain in [stress evidence](performance-scale.md).

## What a result supports

A capacity claim names the workload and environment: for example, the tested
family/person count, generated event count, payload bytes, seed and both latency
budgets. Event count and family count are not interchangeable. This lab does not
invent a realistic 50k history for a small occasion; an event count is reported
only when the generated lifecycle actually produces it.

For an operational limit, follow the [hosted runbook](performance-analysis.md)
and measure provider CPU limits, cold requests, representative client hardware,
initial usable UI latency and concurrent requests. The local Worker/D1 path and
Node calculation timings cover only their stated scopes.

## Family REST request evidence

The [family REST evidence](family-rest-evidence.json) contains two completed
100-family HTTP runs, seed 2027, with one warmup and seven samples. These use
real person PATCH with its displayed ETag; family reads include the complete
allowlisted widget envelope and tags. Membership requests now resolve both roles.
The source snapshots, environment fingerprints and all route timings are retained
in the evidence. Setup and fixture construction are excluded; the host clock
includes transfer and JSON decoding. Shared-host scheduling can affect samples.

| Scenario | Family read p95 | Family REST write p95 | Organiser append p95 |
|---|---:|---:|---:|
| Normal | 380 ms | 321 ms | 484 ms |
| Contention | 206 ms | 266 ms | 370 ms |

Both current append routes meet the 1,000 ms request budget for this local shape.
The historical append observations above retain their original operation names.
The current capacity gate requires `request.family-write`; a historical event
append observation cannot prove the REST path's current capacity. These HTTP runs
make no new calculation, concurrent-user, browser-speed or hosted capacity claim.
