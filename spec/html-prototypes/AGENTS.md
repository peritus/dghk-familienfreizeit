# HTML prototype rules

These rules govern every file below `spec/html-prototypes/`.

## Status and authority

- An HTML prototype is an illustrative design artifact. It is not an
  implemented feature, an approved requirement, a domain rule, persisted state,
  or evidence that the application supports what it displays.
- A prototype may suggest information hierarchy, wording, visual treatment,
  interaction hypotheses, responsive behavior, or accessibility concerns. It
  does not define entity kinds, labels, relationships, constraints, lifecycle,
  authorization, privacy boundaries, persistence, solver behavior, or release
  policy.
- Normative requirements belong in the relevant `spec/` contract. Verified
  behavior belongs in `docs/`. Runtime behavior belongs in the application
  code. Prototype text must not be copied into any of those places as if it
  were already authoritative.
- The presence of a prototype, a visually complete screen, or a working
  browser interaction is never permission to promote an idea.

## Explicit, one-concept promotion

Importing or tracking a prototype does not authorize extracting ideas from it.
Every promotion from a prototype requires explicit permission in the
conversation that names the exact concept or idea to promote. Approval of a
screen, prototype, or broad work item is not approval for all of its contents.

Promote exactly one concept at a time:

1. Identify the source artifact and the precise concept boundary, including
   the relevant section, selector, state, or interaction.
2. Obtain explicit permission for that named concept before changing the spec,
   docs, or code because of it. A plan approval counts only when it names the
   concept.
3. Write concept-specific acceptance criteria and identify the intended
   `spec/`, `docs/`, and code destinations. Keep unrelated prototype ideas out
   of the change, even when they appear on the same screen.
4. Check the existing specification, documentation, component catalogue, and
   implementation for an existing concept or component before adding anything.
5. Promote only the approved concept, verify it independently, and record the
   source, permission, catalogue check, destinations, and verification in the
   change summary.

A promotion change may touch every necessary destination for its one concept,
but it must not bundle multiple concepts or perform a screen-wide extraction.
If a follow-up concept is discovered, stop and request permission for that
concept separately.

## Component promotion

Prototype markup is not a component API. Before introducing a component based
on a prototype:

- Search the existing component catalogue and implementation for duplicates or
  near-duplicates. Reuse or extend the canonical component when it is suitable;
  do not create a second name or parallel styling system.
- Give the component a stable, purpose-based name that describes its reusable
  responsibility rather than its prototype location, visual novelty, or
  current page.
- Define its responsibility, inputs and outputs, states, semantic HTML,
  keyboard and focus behavior, accessible naming, responsive behavior, and
  translation/configuration boundaries before factoring it out.
- Add it to the canonical component catalogue and implement it in the normal
  component location before adding consumers. Record why an existing component
  was not reused when a new one is necessary.
- Use the canonical component from every approved consumer. Do not leave copied
  markup, styles, or an unused extracted component beside it. Do not migrate
  unrelated consumers without separate approval.
- Keep domain rules and relationship resolution outside presentational
  components. A component must not turn prototype data or screen-local lookup
  code into a second domain or relationship engine.

## Specification, documentation, and implementation

- A prototype-derived idea may be specified without being implemented. The
  specification must retain only the outstanding contract and must identify
  unresolved questions rather than treating the prototype as an answer.
- Once the approved concept is implemented and verified, update `docs/` with
  the observed behavior and remove only the fulfilled portion from `spec/` in
  the same change. Do not claim implementation merely because a prototype
  renders it.
- Documentation must describe the verified application behavior, not the
  prototype's placeholder data, calculations, links, or controls.
- Prototype links, forms, controls, and JavaScript may remain local design
  affordances. They must not be treated as production routes, APIs, event
  types, or persistence mechanisms without an explicitly approved concept and
  an independent implementation contract.

## Artifact integrity and data safety

- Imported prototypes are snapshots. Preserve their source content and
  provenance; do not silently reformat, repair, rename, or redesign an
  artifact while importing it. A changed source is a separate, explicitly
  requested artifact update.
- Use only synthetic fixture data. Never add real participant names, contact
  details, health information, credentials, or event data. Treat any
  phone-like, contact-like, or health-like text as sensitive even when the
  source says it is fabricated.
- Keep prototypes self-contained where possible. Do not add generated build
  output, dependency caches, secrets, or unrelated assets to this directory.
- A prototype may be opened locally for inspection, but it must not be wired
  into production navigation or presented as a deployable application surface.

## Review and verification

Reviewers must be able to answer all of these questions for a promotion:

- What one concept was explicitly authorized, and where is it in the source?
- Which existing specifications, docs, and components were checked?
- What is the canonical name and location of the promoted concept or
  component?
- Which approved consumers use the canonical implementation?
- What was independently verified, and which prototype behavior remains only
  illustrative?

For changes to this catalogue or its links, run the repository documentation
checks through the flake. For a promoted concept, also run the relevant code,
accessibility, responsive, and component tests; visual similarity alone is not
verification.
