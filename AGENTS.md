# Repository guidance

- Do not mention specification revision numbers, comparisons to earlier
  revisions, replacements, or document history in specification documents.
  Version control provides that context.
- The event log is the only persisted domain state. Every read model is derived
  in memory by `derive(events, config)`. Do not add tables that store folded
  domain state, and do not reconstruct domain state by querying event payloads.
- Keep typed identity for durable entity boundaries. The kernel owns family and
  person; a selected module contributes its own kinds, currently building, room,
  bed, place, slot, workshop, material-request, and material-commitment. Identity
  is carried by event payloads and exposed as typed entities in the derived world.
- Keep domain properties as generic labels. This includes names, dates,
  booleans, enums, quantities, capabilities, preferences, and references to
  other entities.
- Model domain relationships only as labels and resolve them through the
  configured constraint resolver. Do not add relational foreign keys or
  per-screen lookups that let application code become a second relationship
  engine.
- Occasion-specific configuration defines entity kinds, label schemas, fixed
  resolver operators, validation, cardinality, and UI metadata. It must not
  contain executable rules supplied at runtime.
- Operational tables (sessions, magic links, rate limits, delivery receipts) may
  be persisted. They are not domain state and the solver never reads them.
- Decisions in [decisions.md](decisions.md) are mandatory. Do not work
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

## Documentation and specification

- `docs/` describes behavior present and verified in this repository, including
  limitations and working development procedures. Implemented does not mean
  deployed; hosted verification and deployment require their own evidence.
- `spec/` contains outstanding requirements and illustrative designs. Split
  partially implemented topics by section. When delivering a requirement, update
  `docs/` and remove its fulfilled portion from `spec/` in the same change; retain
  outstanding portions with links to the working foundation. Do not keep duplicate
  authoritative descriptions or completed-plan archives.
- Organize by topic, with matching `docs/` and `spec/` paths where useful. Create
  directories as needed, use kebab-case filenames without ordering prefixes, and
  define reading order in indexes. Preserve decision IDs and UI screen IDs.
- `spec/deferred-ideas/` is not approved implementation scope. Promoting an idea
  requires an explicit user scope decision, review of affected binding decisions,
  and updates to the active specification and roadmap.
- Illustrative TypeScript belongs in `spec/` as `*.example.ts`, marked with its
  missing dependencies and runtime/typecheck status. Keep relevant lint coverage.
  When implemented and verified, move runtime configuration into `profiles/` (or
  its normal source directory), document it in `docs/`, and retain only outstanding
  requirements in `spec/`.
- Run `npm run test:docs` for documentation changes. CI must check local Markdown
  destinations and heading anchors; update links and tooling paths when moving
  files. Automated link checks do not prove implementation status.
- Before reorganizing, inventory affected sections. Account for each as retained
  requirements, verified implemented documentation, or a duplicate consolidated
  into a named destination. Preserve acceptance criteria, unresolved questions and
  binding decisions; a move must not silently resolve or weaken them. Keep the
  section mapping in review notes, not specification history.

See [D22](decisions.md#d22--documentation-follows-implementation-status) for the
rationale and [documentation workflow](docs/engineering/documentation.md) for the
review procedure. These rules apply to every agent and contributor.
