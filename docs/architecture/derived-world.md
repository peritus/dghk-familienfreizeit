# Derived world

`derive(events, config)` is the in-memory read model for the event log. It produces
typed entities, active and historical generic labels, normalized constraints and
capabilities, diagnostics, and module-contributed summaries and checks. No derived
domain state is persisted.

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

`derive` folds the whole log on every call; nothing is cached or persisted.
Its measured cost is close to linear in the log's length, which is a property of
two deliberate choices rather than an accident.

An event validator receives a `ValidationWorld`, not a `World`. It is a narrow
accessor surface — live entity lookup, one entity's labels, one label key's
labels — because a validator checks invariants against live identity and labels
and never reads resolver output or a module summary. The fold maintains those
three indexes incrementally, so a validator's question costs one lookup rather
than a scan of the whole store, and `normalizeEvents` builds one view for the
entire log instead of one derived world per event. Widening that type would
restore a per-event resolver pass, so a validator that needs a constraint,
requirement, capability, diagnostic or summary is a change to review, not a
change to make quietly.

`normalizeEvents` returns the state it folded while running those validators,
and `derive` projects that state instead of folding a second time.

Known residual costs, all measured by `npm run bench` rather than reasoned
about:

- Uniqueness validators in `room-inventory` scan a whole entity kind per event:
  a room's number within its building, and a bed's label within its room. These
  are quadratic in rooms and in beds, not in events, and they dominate the fold
  once an inventory passes a few hundred rooms.
- `solve` costs orders of magnitude more than `derive` and grows faster. Its
  stages are greedy searches over families against rooms, and workshops against
  slots and spaces, so cost tracks the product of those populations rather than
  the length of the log.

Both are recorded in
[issue 041](../../spec/issues/open/041-incremental-derivation.md) together with
the incremental-derivation options that would address the remaining growth.

KDL fixtures in `test/fixtures/derived-world/` exercise replay, resolver, cardinality, privacy,
and shuffle-stable derivation. Run `npm test` for the domain suite, and
`npm run bench` for the cost sweep described in the
[testing documentation](../engineering/testing.md#derivation-benchmarks).
