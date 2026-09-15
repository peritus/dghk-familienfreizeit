# Repository guidance

- Do not mention specification revision numbers, comparisons to earlier
  revisions, replacements, or document history in specification documents.
  Version control provides that context.
- Keep typed tables for durable identity and entity boundaries: family, person,
  building, room, bed, place, slot, and workshop are valid examples.
- Keep domain properties in the generic label projection. This includes names,
  dates, booleans, enums, quantities, capabilities, preferences, and references
  to other entities.
- Model domain relationships only as labels and resolve them through the
  configured constraint resolver. Do not add relational foreign keys for domain
  relationships or let application queries become a second relationship engine.
- Event-specific configuration defines entity kinds, label schemas, fixed
  resolver operators, validation, cardinality, and UI metadata. It must not
  contain executable rules supplied at runtime.
- Solver-output projections may use relational tables and uniqueness indexes as
  assertions. They are derived and never authoritative domain state.

Use `jj`, never git commands, for repository work. Before modifying files, use
the workspace-init and jj-vcs skills; use the development workflow for
non-trivial changes. Modified-file runs must be finalized with a bookmark, a
clean fresh working copy, and the mandatory collaborator export.
