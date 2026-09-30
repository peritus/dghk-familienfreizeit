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

KDL fixtures in `test/fixtures/derived-world/` exercise replay, resolver, cardinality, privacy,
and shuffle-stable derivation. Run `npm test` for the domain suite.
