# Roadmap

This is the single source for implementation order, specification coverage,
delivery gates, cut lines, and deferred work. Detailed domain contracts remain in
the documents linked from each milestone.

The milestones are ordered by dependency. A milestone is complete only when its
implementation, fixtures, tests, and operational requirements listed here are
complete. Cross-cutting requirements are repeated in the milestones they affect
and summarized in the final hardening milestone.

The prerequisite runtime foundation is documented in
[implemented architecture](../docs/architecture/overview.md),
[development](../docs/engineering/development.md), and
[testing](../docs/engineering/testing.md). The milestones below cover outstanding
work; their acceptance criteria remain required.

## M4 — Inventory and real occasion data

Specification coverage: [room inventory](modules/room-inventory.md), the inventory
parts of [reports](application/reports.md), [profile configuration](profiles/familienfreizeit-2027.md)
§§2 and 9, and the inventory parts of [organiser view](application/organiser-view.md).

- Implement buildings, rooms, beds, places, capacity, retirement,
  room labels, and inventory world summaries.
- Implement inventory events, invariants, authorisation, and event fixtures.
- Enter and validate the 38-room, 162-bed occasion inventory as KDL fixtures.
- Implement the organiser inventory screen and inventory report contribution.
- Add capacity, cost, retired-place, and invalid-reference tests.

Acceptance: the real inventory replays from KDL, generates stable places, makes
every live room available to family placement subject to its hard rules, and
produces the documented counts.

## M5 — Deterministic solver contract

Specification coverage: [solver contract](architecture/solver-contract.md), solver portions
of [architecture](architecture/overview.md), and [testing](engineering/testing.md) §§1–4.

- Implement frozen and explicitly sorted solver input.
- Implement the seven determinism rules, integer scoring, canonical JSON, plan
  identity, rule identity, and decision traces.
- Implement stage ordering, stage outputs, preflight checks, diagnostics, and
  plan section assembly.
- Implement `solve(solverInput, config) -> plan` without I/O, clocks, randomness,
  or mutable external state.
- Add golden plans, property tests, required trace assertions, and hash fixtures.

M5 extends the M3 `World` with solver execution and plan output. It may add or
refine world fields as needed for the solver contract, while preserving the M3
event, label, resolver, diagnostic, and privacy boundaries.

Acceptance: identical inputs produce byte-identical plans; shuffled source input
does not change output; every rule and diagnostic has a stable explanation.

## M6 — Whole-family room assignment

Specification coverage: [room assignment](modules/room-assignment.md), room-related
parts of [labels and constraints](architecture/labels-and-constraints.md), and D5–D7.

- Implement family placement units, bed demand, requirements, capabilities,
  exclusions, separation, structural room checks, and organiser decisions.
- Implement placement phases 0–4, bounded repair, stable tie-breaking, and the
  room-assignment plan section.
- Implement requirement arithmetic, contradiction, unplaced-family, and trace
  diagnostics.
- Add real-inventory fixtures, infeasible requirement fixtures, decision fixtures,
  and moved-assignment tests.

Acceptance: whole-family placement is deterministic, capacity and hard constraints
are enforced, preferred terms are explained, and no organiser action writes an
assignment directly.

## M7 — Organiser application and family identity surfaces

Specification coverage: [organiser view](application/organiser-view.md), [frontend](ui/frontend.md)
§§3–7, [UI-00](ui/design-system.md), [UI-05](ui/screens/organiser-dashboard.md),
[UI-06](ui/screens/families.md), [UI-07](ui/screens/family-detail.md), [UI-08](ui/screens/inventory.md),
and [UI-13](ui/screens/constraints.md).

- Implement organiser navigation, dashboard, family table, family detail, and
  inventory screens.
- Implement pending events, local derivation, apply/discard, undo, compare-and-
  swap, stale-head responses, and organiser decision forms.
- Implement keyboard and touch paths for organiser actions.
- Add organiser privacy, authorisation, accessibility, and pending-state tests.

Acceptance: organisers can inspect the derived world, create and clear decisions,
understand their effect locally, and apply one validated event batch.

## M8 — Family authentication and preference controls

Specification coverage: [family view](application/family-view.md), [family preferences](modules/family-preferences.md),
[UI-01](ui/screens/login.md), [UI-02](ui/screens/login-link-invalid.md),
[UI-03](ui/screens/family-preferences.md), [UI-04](ui/screens/family-assignment.md),
[occasion profiles](profiles/contract.md) §§3 and 6, and [translation guidelines](ui/german-translation-guidelines.md).

- Implement the family login path, invitation and reminder messages, family
  authorisation, and own-family privacy projection.
- Implement profile-driven sections and the closed family-control union.
- Implement save-on-change, current-response confirmations, scoped advisory deadline
  notices, validation explanations, and family assignment cards.
- Implement German family copy, English fallback, responsive layout, and browser
  print styles for the family surface.
- Add control, privacy, advisory-deadline, language, and cross-runtime agreement tests.

Acceptance: a family can inspect current own information, save permitted controls,
see communicated arrangements, and never receive organiser-only or hidden content.

## M9 — Workshop programme and live participation

Specification coverage: [workshop space](modules/workshop-space.md), [workshops](modules/workshops.md), workshop portions of
[release control](application/release-control.md) §5, [UI-12](ui/screens/workshops.md), and
the workshop parts of [reports](application/reports.md).

- Complete the Issue 026 workshop-space foundation: typed physical spaces,
  event-backed capacity and availability, resolver capabilities, deterministic
  input, organiser maintenance, and physical-space inventory reporting. This
  foundation is independent of accommodation `room-inventory`.
- Implement slots, workshops, programme modes, capacity, age bounds, leaders,
  cancellation, reinstatement, and programme history. Communicated locations
  are not established by workshop setup events.
- Implement communicated-programme admission, sign-up and interest labels,
  capacity races, slot reservations, mode transitions, and eligibility checks.
- Implement the organiser workshop screen and family participation controls.
- Implement programme diagnostics and shared programme/roster report inputs.
- Add replay-at-event-cut, last-place race, cancellation, slot-change, and
  eligibility fixtures.

Acceptance: live participation uses the effective communicated programme, draft
changes do not change admission, and concurrent last-place requests cannot both win.

## M10 — Workshop proposals, scheduling, rankings, and attendance

Specification coverage: [programme core](modules/programme-core.md), [call for papers](modules/call-for-papers.md),
[official workshops](modules/official-workshops.md), [self-organized sessions](modules/self-organized-sessions.md),
[workshop scheduling](modules/workshop-scheduling.md), [workshop rankings](modules/workshop-rankings.md),
[workshop attendance](modules/workshop-assignment.md), the workshop solver sections of
[solver contract](architecture/solver-contract.md), and workshop tests in [testing](engineering/testing.md).

- Implement the cooperating modules and their typed contribution boundary. The
  workshop-space module remains an independent inventory of physical facts.
- Implement proposal review, immutable candidate rounds, official and
  self-organised session paths, and programme-session/offering identity.
- Implement eligibility-filtered pre-schedule rankings, no-preference values,
  deterministic demand summary, configured-slot/space scheduling, conflicts,
  and schedule release.
- Implement attendance eligibility, reservations, fixed resolver decisions,
  previous-plan retention, balanced-opportunity ledger, ranked allocation,
  manual cancellation, fill, and attendance release.
- Implement the proposal, candidate, demand, schedule, ranking, attendance,
  heatmap, roster, finding, and allocation-diff surfaces.
- Add proposal, ranking-before-schedule, demand, fairness, capacity, separation,
  age, cancellation, unscheduled, and deterministic lifecycle fixtures.

Acceptance: official proposals can be ranked before scheduling; selected sessions
are placed or reported as blocking unscheduled outcomes; each person receives at
most one assigned offering per overlapping period; valid previous assignments are
retained when possible; unavoidable movement is bounded and explained;
balanced-opportunity objectives are applied lexicographically to
unresolved contests; and every allocation decision is traced.

## M11 — Food and materials coordination

Specification coverage: [food preferences](modules/food-preferences.md), [materials](modules/materials.md),
the food/materials portions of [profile](profiles/familienfreizeit-2027.md),
[reports](application/reports.md) §3, and family/organiser surfaces in the module specs.

- Implement diet, allergy text, food summaries, sensitivity, and organiser food
  reports.
- Implement material requests, commitments, fulfilment, withdrawal, workshop and
  person links, privacy, and live coordination summaries.
- Implement family and organiser materials surfaces and unresolved-material
  findings.
- Add fulfilment, reopening, invalid-link, privacy, and no-release-backlog tests.

Acceptance: food and materials remain live derived information, are not solver
state, do not create release backlog, and cannot disclose hidden programme details.

## M12 — Release control and communication

Specification coverage: [release control](application/release-control.md), [D16](../decisions.md#d16--release-control-determines-which-arrangements-families-see),
[UI-11](ui/screens/release-control.md), [events](architecture/events.md) §§11–12, and release
acceptance scenarios.

- Implement accommodation, programme, and per-slot allocation scopes.
- Implement semantic scope accessors, outstanding-change report, detailed preview,
  reviewed-input/build/compatibility guards, blocking-finding checks, and atomic
  `Communicated` append.
- Implement historical scope composition, reproducibility mismatch handling,
  current privacy projection, and family/shared responses.
- Add all release-control scenarios, concurrent confirmation, reverted-change,
  dependency, cancellation, and revision-mismatch fixtures.

Acceptance: only selected coherent scopes become visible; previews and resulting
family views agree; hidden or unreproducible historical content is not guessed.

## M13 — Reports and browser printing

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
report contributions from all selected modules, and [UI-00](ui/design-system.md).

- Implement shared, family, and organiser report routes and audience projections.
- Implement materials, programme, workshop roster, family information,
  accommodation, food, open-issues, release, plan-comparison, and cost reports.
- Implement responsive report layouts, print stylesheets, repeated headings,
  page breaks, greyscale status, confidentiality labels, and browser print output.
- Add empty, incomplete, full, changed, restricted, mobile, and print fixtures.

Acceptance: reports never persist domain state, bypass configured resolution, or
offer downloads, exports, or print buttons; browser printing produces the required
paper output.

## M14 — Notifications and operational email

Specification coverage: [change notifications](modules/change-notifications.md),
notification sections of [release control](application/release-control.md) §8, [authentication](application/authentication.md)
§2, and [deployment](engineering/deployment.md) §§5–6.

- Implement invitation, reminder, communication, and change messages.
- Implement recipient preview, affected-family attribution, deduplication,
  delivery claims, retries, suppression, unknown-send handling, and idempotency.
- Implement operational `email_log`, provider configuration, and delivery status
  separate from domain visibility.
- Load and validate the full Familienfreizeit profile with every selected module
  contribution as an integration fixture.
- Add recipient/body agreement, unchanged-content, failure, retry, and privacy tests.

Acceptance: recipient previews equal sends for the reviewed `input_seq` and scopes;
delivery failure never rolls back communication or widens visibility, and the full
active profile validates with all selected module contributions.

## M15 — Deployment, security, and launch hardening

Specification coverage: [deployment](engineering/deployment.md), [authentication](application/authentication.md)
§§6–7, [testing](engineering/testing.md) §§5–8, [translation guidelines](ui/german-translation-guidelines.md),
and cross-cutting requirements in [frontend](ui/frontend.md).

- Implement production migrations, secrets, bindings, backups, recovery, preview
  environments, health checks, and the pre-occasion runbook.
- Run dependency, naming, determinism, restricted-import, accessibility, privacy,
  security, performance, and cross-runtime checks.
- Run profile/config/code identity verification and real exported-log rehearsal.
- Complete German copy review, responsive checks, keyboard/focus/contrast/reduced
  motion checks, and deliverability checks.
- Record the final cut-line decisions in this roadmap before deployment.

Acceptance: the deployment can be reproduced from one revision, recovery and
identity mismatch procedures are documented, and the complete active profile passes
the repository test and operational gates.

## M16 — Deferred sleeping modules

This is a conditional plan, not approved implementation scope. Promotion requires
an explicit user scope decision and review of affected binding decisions under
[repository policy](../AGENTS.md#documentation-and-specification).

Specification coverage: [sleeping parties](deferred-ideas/sleeping-parties.md),
[child rooms](deferred-ideas/child-rooms.md), [party review](deferred-ideas/party-review.md),
and [D5](../decisions.md#d5--sleeping-parties-and-child-rooms-are-outside-the-active-placement-model).

- Add the sleeping-party and child-room modules together.
- Add party residue, co-room merges, child groups, provenance, merge guards,
  fallback, minimum occupancy, party diagnostics, and review UI.
- Migrate whole-family fixtures, reports, family controls, and assignment output.

These modules are not part of the active profile until their combined contract,
privacy model, fixtures, and migration are accepted.

## Cross-cutting acceptance and cut lines

Every milestone must preserve:

- append-only domain state and in-memory derivation;
- typed durable entity identity and generic labels;
- configured resolver ownership of relationships;
- deterministic solver input, output, and trace;
- privacy projections before content leaves the Worker;
- no executable rules supplied through occasion data;
- no persisted folded domain state or hidden per-screen relationship engine;
- browser-only printing with no export or download path.

The only acceptable cut lines are documented reductions that preserve those
properties. Removing a report, screen, module contribution, or email kind requires
marking its specification coverage as deferred here and removing its selected
profile contribution where necessary.

## Specification coverage index

| Specification | Primary milestone(s) |
|---|---|
| `spec/architecture/overview.md` | M1–M3, M12–M15 |
| `spec/architecture/data-model.md` | M1–M3 |
| `spec/architecture/events.md` | M1, M3–M4, M12 |
| `spec/architecture/labels-and-constraints.md` | M3, M6, M9–M10 |
| `spec/architecture/solver-contract.md` | M5–M6, M10, M15 |
| `spec/application/release-control.md` | M9, M12, M14 |
| `spec/application/organiser-view.md` | M7, M13 |
| `spec/application/family-view.md` | M8, M12–M13 |
| `spec/application/authentication.md` | M1, M7–M8, M15 |
| `spec/ui/frontend.md` | M7–M8, M13, M15 |
| `spec/engineering/deployment.md` | M1, M14–M15 |
| `spec/engineering/testing.md` | M15 |
| `spec/profiles/contract.md` | M2, M8–M11, M15 |
| `decisions.md` | Governing constraints for M15 |
| `spec/ui/german-translation-guidelines.md` | M8, M13, M15 |
| `spec/application/reports.md` | M4, M7, M9, M11, M13 |
| `spec/modules/contract.md` | M2, M5, M9–M14 |
| `spec/modules/` topic specifications | M4, M6, M9–M14 |
| `spec/deferred-ideas/*` | M16 |
| `spec/ui/*` | M7–M8, M9–M10, M12–M13 |
