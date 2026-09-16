# Repository guidance

- Do not mention specification revision numbers, comparisons to earlier
  revisions, replacements, or document history in specification documents.
  Version control provides that context.
- The event log is the only persisted domain state. Every read model is derived
  in memory by `derive(events, config)`. Do not add tables that store folded
  domain state, and do not reconstruct domain state by querying event payloads.
- Keep typed identity for durable entity boundaries: family, person, building,
  room, bed, place, slot, and workshop are valid entity kinds. Identity is
  carried by event payloads and exposed as typed entities in the derived world.
- Keep domain properties as generic labels. This includes names, dates,
  booleans, enums, quantities, capabilities, preferences, and references to
  other entities.
- Model domain relationships only as labels and resolve them through the
  configured constraint resolver. Do not add relational foreign keys or
  per-screen lookups that let application code become a second relationship
  engine.
- Event-specific configuration defines entity kinds, label schemas, fixed
  resolver operators, validation, cardinality, and UI metadata. It must not
  contain executable rules supplied at runtime.
- Operational tables (sessions, magic links, rate limits, delivery receipts) may
  be persisted. They are not domain state and the solver never reads them.
- Decisions in [17-decisions.md](17-decisions.md) are mandatory. Do not work
  around one or quietly implement an alternative it rejects. When the work
  gives a reason to change a decision, put it up for review instead: state
  which decision, what changed, the alternatives, and a recommendation, and
  wait for the user's call before changing the specification or the decision.
  An accepted revision updates the decision entry and every document that
  depends on it in the same change.

Use `jj`, never git commands, for repository work. Before modifying files, use
the workspace-init and jj-vcs skills; use the development workflow for
non-trivial changes. Modified-file runs must be finalized with a bookmark, a
clean fresh working copy, and the mandatory collaborator export.
