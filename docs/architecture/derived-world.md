# Derived world

`derive(events, config)` is the in-memory read model for the event log. It produces
typed entities, active and historical generic labels, normalized constraints and
capabilities, diagnostics, and module-contributed summaries and checks. No derived
domain state is persisted.

The fixed resolver keys `needs`, `provides`, `excludes`, `groups-with`, and
`separates-from` retain multiple values per entity by default. An explicit label
schema can narrow a key's cardinality; `LabelCleared` with a value removes only
that value. Repeating a value updates its strength, note, and sequence metadata.

Profile traits compile their sensitivity, validity evaluator, resolver role, and
capability derivation into the kernel configuration. A capability is either assigned
through `provides` or derived from labels; a derived capability cannot also be
assigned. Kernel diagnostics cover dangling references, contradictory required
relations, scope violations, invalid values, invalid-for labels, and unknown traits.

`deriveDraftWorld(committed, drafts, config)` derives an organiser's prospective world
from ordinary unpersisted events. Every organiser action uses this local-first
derivation before persistence. Immediate mode starts the ordinary apply request after
the local derivation; drafting mode waits for explicit application. The two policies share
the same draft buffer, event payloads, append endpoint, and server validation.
`diff(before, after)` compares two worlds without consulting event payloads. Both
functions are pure and deterministic.

Family and shared projections are derived from the organiser world. Restricted labels
are omitted from shared output and from every family other than the entity owner's;
the full world and draft events remain organiser-only.

## Derivation cost

`derive` folds the whole log on every call. No derived domain state is persisted.
Measured replay is close to linear for the fixed-population history fixture;
growing the live population also adds resolver and summary work. See
[scale evidence](../engineering/performance-scale.md) for the two workload shapes.

An event validator receives a `ValidationWorld`, not a `World`. Its accessor
surface exposes live entity lookup, labels and scalar label-tuple existence.
It never reads resolver output or a module summary. The fold maintains
identity/label indexes and lazy scalar-tuple indexes as labels change and
entities retire. Scoped room/bed uniqueness uses those transient indexes;
place synchronization reads only the owning bed's indexed bucket.
A validator that needs resolver output is a change to review.

`normalizeEvents` returns the state it folded while running validators, and
`derive` resolves and completes that state. Inventory summaries group places,
capacity and capabilities once instead of scanning them for every bed.
`foldEventLog`, `resolveFoldedWorld` and `completeDerivedWorld` expose pure
phases for the profiling adapter without adding clocks to domain computations.

The remaining large-population cost is full deterministic room search, whose
work tracks candidate pairs rather than log length. See
[room assignment](../modules/room-assignment.md#placement-cost) and
[issue 041](../../spec/issues/open/041-incremental-derivation.md) for the measured
limit and the outstanding acceptance decision.

KDL fixtures in `test/fixtures/derived-world/` exercise replay, resolver, cardinality, privacy,
and shuffle-stable derivation. Run `pnpm test` for the domain suite, and
`pnpm run bench` for the cost sweep described in the
[testing documentation](../engineering/testing.md#derivation-benchmarks).
