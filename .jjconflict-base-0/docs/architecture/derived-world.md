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

`derivePending(committed, pending, config)` derives an organiser's prospective world
from ordinary unpersisted events. `diff(before, after)` compares two worlds without
consulting event payloads. Both functions are pure and deterministic.

Family and shared projections are derived from the organiser world. Restricted labels
are omitted from shared output and from every family other than the entity owner's;
the full world and pending events remain organiser-only.

KDL fixtures in `test/fixtures/m3/` exercise replay, resolver, cardinality, privacy,
and shuffle-stable derivation. Run `npm test` for the domain suite.
