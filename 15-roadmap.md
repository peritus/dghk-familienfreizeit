# 15 — Roadmap

This is the single source for implementation order, specification coverage,
delivery gates, cut lines, and deferred work. Detailed domain contracts remain in
the documents linked from each milestone.

The milestones are ordered by dependency. A milestone is complete only when its
implementation, fixtures, tests, and operational requirements listed here are
complete. Cross-cutting requirements are repeated in the milestones they affect
and summarized in the final hardening milestone.

## M0 — Repository and runtime foundation

Specification coverage: [D1](17-decisions.md#d1--cloudflare-workers-paid--d1),
[D8](17-decisions.md#d8-react-for-every-screen),
[D9](17-decisions.md#d9-vite-with-the-cloudflare-plugin),
[deployment](13-deployment.md) §§1, 8–9, and [frontend](12-frontend.md) §§1–3.

- Create the Vite, React, Worker, Hono, Tailwind, Wrangler, Vitest, and D1
  configuration.
- Establish the one-build Worker and browser bundle boundary.
- Add the application shell, route loading, development configuration, one CI
  target, and one development-preview server task.
- Initialize the design-system component registry and the shared shell.
- Verify the Vite, Workers pool, React, and Cloudflare plugin versions together.

Acceptance: the repository builds, the Worker serves one API route and the
application shell, and a Worker test runs through the project configuration.
The shared CI target builds and tests locally and is configured in GitHub Actions;
the development-preview server is defined as a VS Code/Station task. Executing
the GitHub workflow and launching or remotely deploying the preview are not M0
acceptance gates. Hosted preview configuration remains part of the deployment
contract and must be supplied before a hosted deployment.

## M1 — Event kernel and operational storage

Specification coverage: [architecture](01-architecture.md), [data model](02-data-model.md)
§§1–3, [events](03-events.md) §§1–4 and 11, [authentication](11-authentication.md)
§§3–5, and [deployment](13-deployment.md) §§2 and 4.

- Implement the event envelope, append-only event table, sequence-guarded append,
  batch semantics, and replay validation.
- Implement family and person identity, invitations, email changes, person
  updates, withdrawal, and the kernel fold.
- Implement sessions, magic links, rate limits, organiser allowlisting, and the
  request authorisation boundary.
- Add migrations for the event log and operational tables only.
- Add the KDL event-log loader, canonical parsing rules, and the development-only
  text event source.

Acceptance: valid events append atomically, stale heads are rejected, replay is
deterministic, operational records do not enter the domain world, and the
authentication threat-model tests pass.

## M2 — Profile and module composition

Specification coverage: [occasion profiles](16-occasion-profiles.md), [modules](20-modules.md)
§§1–4 and 6–7, [decisions D11–D12](17-decisions.md), and [testing](14-testing.md)
§§2 and 5.

- Implement `defineOccasionProfile`, typed tag builders, localized copy, tag
  validation, evaluator restrictions, and defaulted module parameters.
- Implement module registration, dependency and enhancement validation, duplicate
  contribution checks, and selected-module composition.
- Inject the exact commit `build_revision` and hardcoded `compatibility_revision` into
  the Worker and browser bundle.
- Add profile-builder tests for tag shapes, vocabulary naming, module roles,
  dependencies, and evaluator determinism.
- Load the active Familienfreizeit profile as the first profile fixture.

Acceptance: a profile cannot select invalid modules or tag roles, configuration
hashes are stable, and an unselected module contributes no domain surface.

## M3 — Generic labels, resolver, and derived world

Specification coverage: [data model](02-data-model.md) §§4–6, [labels and
constraints](04-labels-and-constraints.md), [architecture](01-architecture.md)
§§2–5, [events](03-events.md) §§5–10, and [testing](14-testing.md) §§1–2 and 5.

- Implement generic labels, typed entity identity, cardinality, scopes, values,
  strengths, sensitivity, and notes.
- Implement fixed resolver operators, reference
  validation, append-time validation, and replay validation.
- Implement `derive(events, config)`, world summaries, world checks, `diff`, and
  the pending-event derivation path.
- Implement deterministic canonical sorting and the common diagnostic contract.
- Add shuffle-invariance, replay, privacy, cardinality, and resolver fixtures.

Acceptance: every read model is derived in memory from events and configuration;
no domain projection table or event-payload lookup path is introduced.

## M4 — Inventory and real occasion data

Specification coverage: [room inventory](20.1-room-inventory.md), the inventory
parts of [reports](19-reports.md), [profile configuration](profiles/familienfreizeit-2027.md)
§§2 and 9, and the inventory parts of [organiser view](09-organiser-view.md).

- Implement buildings, rooms, beds, places, designations, capacity, retirement,
  room labels, and inventory world summaries.
- Implement inventory events, invariants, authorisation, and event fixtures.
- Enter and validate the 38-room, 162-bed occasion inventory as KDL fixtures.
- Implement the organiser inventory screen and inventory report contribution.
- Add capacity, cost, designation, retired-place, and invalid-reference tests.

Acceptance: the real inventory replays from KDL, generates stable places, excludes
staff and blocked rooms from family placement, and produces the documented counts.

## M5 — Deterministic solver contract

Specification coverage: [solver contract](05-solver-contract.md), solver portions
of [architecture](01-architecture.md), and [testing](14-testing.md) §§1–4.

- Implement frozen and explicitly sorted solver input.
- Implement the seven determinism rules, integer scoring, canonical JSON, plan
  identity, rule identity, and decision traces.
- Implement stage ordering, stage outputs, preflight checks, diagnostics, and
  plan section assembly.
- Implement `solve(solverInput, config) -> plan` without I/O, clocks, randomness,
  or mutable external state.
- Add golden plans, property tests, required trace assertions, and hash fixtures.

Acceptance: identical inputs produce byte-identical plans; shuffled source input
does not change output; every rule and diagnostic has a stable explanation.

## M6 — Whole-family room assignment

Specification coverage: [room assignment](20.3-room-assignment.md), room-related
parts of [labels and constraints](04-labels-and-constraints.md), and D5–D7.

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

Specification coverage: [organiser view](09-organiser-view.md), [frontend](12-frontend.md)
§§3–7, [UI-00](ui/00-design-system.md), [UI-05](ui/05-organiser-dashboard.md),
[UI-06](ui/06-families.md), [UI-07](ui/07-family-detail.md), [UI-08](ui/08-inventory.md),
and [UI-13](ui/13-constraints.md).

- Implement organiser navigation, dashboard, family table, family detail, and
  inventory screens.
- Implement pending events, local derivation, apply/discard, undo, compare-and-
  swap, stale-head responses, and organiser decision forms.
- Implement keyboard and touch paths for organiser actions.
- Add organiser privacy, authorisation, accessibility, and pending-state tests.

Acceptance: organisers can inspect the derived world, create and clear decisions,
understand their effect locally, and apply one validated event batch.

## M8 — Family authentication and preference controls

Specification coverage: [family view](10-family-view.md), [family preferences](20.9-family-preferences.md),
[UI-01](ui/01-login.md), [UI-02](ui/02-login-link-invalid.md),
[UI-03](ui/03-family-preferences.md), [UI-04](ui/04-family-assignment.md),
[occasion profiles](16-occasion-profiles.md) §§3 and 6, and [translation guidelines](18-german-translation-guidelines.md).

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

Specification coverage: [workshops](20.4-workshops.md), workshop portions of
[release control](06-release-control.md) §5, [UI-12](ui/12-workshops.md), and
the workshop parts of [reports](19-reports.md).

- Implement slots, workshops, programme modes, capacity, age bounds, leaders,
  locations, cancellation, reinstatement, and programme history.
- Implement communicated-programme admission, sign-up and interest labels,
  capacity races, slot reservations, mode transitions, and eligibility checks.
- Implement the organiser workshop screen and family participation controls.
- Implement programme diagnostics and shared programme/roster report inputs.
- Add replay-at-event-cut, last-place race, cancellation, slot-change, and
  eligibility fixtures.

Acceptance: live participation uses the effective communicated programme, draft
changes do not change admission, and concurrent last-place requests cannot both win.

## M10 — Workshop rankings and assignment

Specification coverage: [workshop rankings](20.5-workshop-rankings.md), [workshop
assignment](20.6-workshop-assignment.md), workshop solver sections of [solver
contract](05-solver-contract.md), and workshop tests in [testing](14-testing.md).

- Implement structured ordered-choice rankings, no-preference values, rank
  validation, and communicated-programme rules.
- Implement eligibility, reservations, fixed resolver
  decisions, previous-plan retention, balanced-opportunity ledger, ranked
  allocation, manual cancellation, fill, and workshop plan output.
- Implement the preference heatmap, ranking controls, workshop findings, rosters,
  and allocation diffs.
- Add fairness, capacity, separation, age, cancellation, and deterministic
  workshop fixtures.

Acceptance: each person receives at most one assigned workshop per slot; valid
previous assignments are retained when possible; unavoidable movement is bounded
and explained; balanced-opportunity objectives are applied lexicographically to
unresolved contests; and every allocation decision is traced.

## M11 — Food and materials coordination

Specification coverage: [food preferences](20.7-food-preferences.md), [materials](20.8-materials.md),
the food/materials portions of [profile](profiles/familienfreizeit-2027.md),
[reports](19-reports.md) §3, and family/organiser surfaces in the module specs.

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

Specification coverage: [release control](06-release-control.md), [D16](17-decisions.md#d16-release-control-determines-which-arrangements-families-see),
[UI-11](ui/11-release-control.md), [events](03-events.md) §§11–12, and release
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

Specification coverage: [reports](19-reports.md), [D21](17-decisions.md#d21-print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
report contributions from all selected modules, and [UI-00](ui/00-design-system.md).

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

Specification coverage: [change notifications](20.10-change-notifications.md),
notification sections of [release control](06-release-control.md) §8, [authentication](11-authentication.md)
§2, and [deployment](13-deployment.md) §§5–6.

- Implement invitation, reminder, communication, and change messages.
- Implement recipient preview, affected-family attribution, deduplication,
  delivery claims, retries, suppression, unknown-send handling, and idempotency.
- Implement operational `email_log`, provider configuration, and delivery status
  separate from domain visibility.
- Add recipient/body agreement, unchanged-content, failure, retry, and privacy tests.

Acceptance: recipient previews equal sends for the reviewed `input_seq` and scopes;
delivery failure never rolls back communication or widens visibility.

## M15 — Deployment, security, and launch hardening

Specification coverage: [deployment](13-deployment.md), [authentication](11-authentication.md)
§§6–7, [testing](14-testing.md) §§5–8, [translation guidelines](18-german-translation-guidelines.md),
and cross-cutting requirements in [frontend](12-frontend.md).

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

Specification coverage: [sleeping parties](deferred-ideas/sleeping-parties.md),
[child rooms](deferred-ideas/child-rooms.md), [party review](deferred-ideas/party-review.md),
and [D5](17-decisions.md#d5-sleeping-parties-and-child-rooms-are-outside-the-active-placement-model).

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
| `01-architecture.md` | M1–M3, M12–M15 |
| `02-data-model.md` | M1–M3 |
| `03-events.md` | M1, M3–M4, M12 |
| `04-labels-and-constraints.md` | M3, M6, M9–M10 |
| `05-solver-contract.md` | M5–M6, M10, M15 |
| `06-release-control.md` | M9, M12, M14 |
| `09-organiser-view.md` | M7, M13 |
| `10-family-view.md` | M8, M12–M13 |
| `11-authentication.md` | M1, M7–M8, M15 |
| `12-frontend.md` | M0, M7–M8, M13, M15 |
| `13-deployment.md` | M0–M1, M14–M15 |
| `14-testing.md` | M0–M15 |
| `16-occasion-profiles.md` | M2, M8–M11, M15 |
| `17-decisions.md` | Governing constraints for M0–M15 |
| `18-german-translation-guidelines.md` | M8, M13, M15 |
| `19-reports.md` | M4, M7, M9, M11, M13 |
| `20-modules.md` | M2, M5, M9–M14 |
| `20.1`–`20.10` module specifications | M4, M6, M9–M14 |
| `deferred-ideas/*` | M16 |
| `ui/*` | M0, M7–M8, M9–M10, M12–M13 |
