# Roadmap

This is the single source for implementation order, specification coverage,
delivery gates, cut lines, and deferred work. Detailed domain contracts remain
in the documents linked from each milestone.

The prerequisite runtime foundation is documented in [implemented architecture](../docs/architecture/overview.md),
[development](../docs/engineering/development.md), and [testing](../docs/engineering/testing.md).
The milestones below cover outstanding work; a feature milestone is complete
only when its domain behavior, derived views, UI, report contribution, fixtures,
tests, and operational requirements listed here are complete.

## M5 — Reports and browser-printing host

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
and report portions of [UI-00](ui/design-system.md).

- Implement shared, family, and organiser report routes, audience projections,
  report contribution registration, and the first host-rendered report.
- Implement responsive report layout primitives, print stylesheets, repeated
  headings, page breaks, greyscale status, and confidentiality labels.
- Keep reports derived in memory; provide no download, export, or print button.
- Add empty, restricted, mobile, and browser-print fixtures.

Acceptance: a selected module's report contribution renders through a real
browser route and prints correctly. Later feature slices own their report data
and acceptance fixtures; this milestone owns the shared host.

## M6 — Accommodation inventory

Specification coverage: [room inventory](modules/room-inventory.md), inventory
parts of [reports](application/reports.md), [profile configuration](profiles/familienfreizeit-2027.md),
and [UI-08](ui/screens/inventory.md).

- Implement buildings, rooms, beds, places, capacity, retirement, room labels,
  inventory events, authorisation, and world summaries.
- Enter and validate the 38-room, 162-bed occasion inventory as KDL fixtures.
- Deliver the organiser inventory screen and capacity/cost report through the
  M4/M5 hosts.
- Add capacity, cost, retired-place, invalid-reference, replay, and print tests.

Acceptance: the real inventory replays from KDL, generates stable places, makes
every live room available to family placement subject to hard rules, and is
usable from both the organiser route and report route.

## M7 — Deterministic room assignment

Specification coverage: [solver contract](architecture/solver-contract.md),
[room assignment](modules/room-assignment.md), room-related [labels and constraints](architecture/labels-and-constraints.md),
and D5–D7.

- Implement frozen/sorted solver input, deterministic stage ordering, preflight,
  integer scoring, canonical plan identity, traces, and diagnostics.
- Implement whole-family placement, bed demand, requirements, capabilities,
  exclusions, separation, organiser decisions, bounded repair, and board UI.
- Deliver assignment, unplaced-family, and diagnostic reports through the report host.
- Add real-inventory, infeasible, decision, moved-assignment, trace, shuffle,
  and golden-plan fixtures.

Acceptance: whole-family placement is deterministic, hard constraints are
enforced, organiser actions remain event-backed, the board is usable, and every
assignment decision has an explanatory trace.

<a id="m8--family-authentication-and-preference-controls"></a>
## M8 — Family authentication and preferences

Specification coverage: [authentication](application/authentication.md), [family view](application/family-view.md),
[family preferences](modules/family-preferences.md), [UI-01](ui/screens/login.md),
[UI-02](ui/screens/login-link-invalid.md), [UI-03](ui/screens/family-preferences.md),
[UI-04](ui/screens/family-assignment.md), and D14/D24.

- Implement invite-only family magic-link authentication and real email delivery,
  including single-use tokens, canonical identities, sessions, rate limits, and
  privacy projections.
- Implement profile-driven preference sections, organiser-equivalent family
  controls, save-on-change responses, deadline notices, and assignment cards.
- Deliver family information and accommodation reports through the M5 host.
- Add German copy, English fallback, responsive/print behavior, privacy, and
  cross-runtime agreement tests.

Acceptance: a family can request and redeem a real login email, inspect its own
derived information, save permitted controls, and never receive organiser-only
or hidden content.

<a id="m9--workshop-programme-and-live-participation"></a>
## M9 — Organiser-authored workshop programme

Specification coverage: [programme core](modules/programme-core.md), [official workshops](modules/official-workshops.md),
[workshop space](modules/workshop-space.md), [workshops](modules/workshops.md),
[UI-12](ui/screens/workshops.md), and programme report portions of [reports](application/reports.md).

- Implement workshop spaces, slots, official workshop facts, organiser-authored
  sessions, publication/cancellation, audience and age eligibility, leaders,
  and programme history.
- Implement the organiser workshop surface, live family participation controls,
  programme diagnostics, and programme/roster report inputs.
- Keep physical-space inventory independent from accommodation inventory.
- Add replay-at-event-cut, capacity race, cancellation, slot-change, and
  eligibility fixtures.

Acceptance: organisers can create and publish an official workshop without
call-for-papers, families can see and use the effective communicated programme,
and draft changes cannot alter admission.

## M10 — Workshop scheduling and attendance

Specification coverage: [workshop scheduling](modules/workshop-scheduling.md),
[workshop rankings](modules/workshop-rankings.md), [workshop attendance](modules/workshop-assignment.md),
workshop solver sections, and workshop tests.

- Implement organiser-published candidate rounds, eligibility-filtered rankings,
  no-preference values, demand summaries, deterministic scheduling, conflicts,
  and schedule release.
- Implement attendance eligibility, reservations, previous-plan retention,
  balanced allocation, manual cancellation, fill, and attendance release.
- Deliver ranking, schedule, heatmap, roster, finding, allocation-diff, and
  family assignment surfaces through the established hosts.
- Add ranking-before-schedule, fairness, capacity, separation, age,
  cancellation, unscheduled, deterministic, and lifecycle fixtures.

Acceptance: official sessions can be ranked before scheduling, selected sessions
are placed or reported as blocking outcomes, each person receives at most one
assignment per overlapping period, and every allocation decision is traced.

<a id="m11--release-control-and-communicated-arrangements"></a>
## M11 — Release control and communicated arrangements

Specification coverage: [release control](application/release-control.md), [D16](../decisions.md#d16--release-control-determines-which-arrangements-families-see),
[UI-11](ui/screens/release-control.md), and release acceptance scenarios.

- Implement accommodation, programme, and per-slot allocation scopes.
- Implement semantic accessors, outstanding-change reports, detailed preview,
  reviewed-input/build/compatibility guards, blocking findings, and atomic
  `Communicated` append.
- Implement historical scope composition, reproducibility mismatch handling,
  current privacy projection, and family/shared responses.
- Add concurrent confirmation, reverted-change, dependency, cancellation, and
  revision-mismatch fixtures.

Acceptance: only selected coherent scopes become visible; previews and family
views agree; hidden or unreproducible historical content is never guessed.

## M12 — Active-profile integration and operational readiness

Specification coverage: [profile contract](profiles/contract.md), [testing](engineering/testing.md),
and the selected active module contracts.

- Load the active profile with every non-deferred module contribution.
- Verify module identity, contribution registration, selected-profile routing,
  privacy projections, fixtures, and cross-runtime agreement as one integration.
- Complete accessibility, determinism, restricted-import, naming, and profile
  validation gates for all active vertical slices.

Acceptance: the active profile exercises every active feature end to end, while
deferred modules contribute no entities, labels, routes, screens, reports, or
emails.

## M13 — Reports catalogue and print completion

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
and report contributions from all selected modules.

- Complete the accommodation, programme, workshop roster, family information,
  release, plan-comparison, cost, open-issues, and active-profile report catalogue.
- Finish cross-feature projections, restricted/changed/incomplete states,
  responsive layouts, print fixtures, and browser-print acceptance.

Acceptance: all active reports render from derived state, respect configured
resolution and privacy, and produce the required paper output without downloads
or export paths.

## M14 — Authentication delivery and operational email

Specification coverage: [authentication](application/authentication.md) §2,
[deployment](engineering/deployment.md) §§5–6, and the operational email portions
of the [release control](application/release-control.md) contract.

- Implement invitation and reminder messages for the family login workflow.
- Implement recipient preview, delivery claims, retries, suppression, unknown-send
  handling, and idempotency for authentication email.
- Implement operational `email_log`, provider configuration, and delivery status
  separate from domain visibility.
- Keep communication and change emails deferred under
  [change notifications](deferred-ideas/change-notifications.md).

Acceptance: invitation and reminder delivery is reliable and idempotent, delivery
failure never changes domain visibility, and the active profile remains free of
deferred notification contributions.

## M15 — Deployment, security, and launch hardening

Specification coverage: [deployment](engineering/deployment.md), [authentication](application/authentication.md),
[testing](engineering/testing.md) §§5–8, [translation guidelines](ui/german-translation-guidelines.md),
and cross-cutting frontend requirements.

- Implement production migrations, secrets, bindings, backups, recovery,
  preview environments, health checks, and the pre-occasion runbook.
- Run dependency, security, privacy, performance, accessibility, deliverability,
  identity, and exported-log rehearsal checks.
- Record the final cut-line decisions before deployment.

Acceptance: deployment is reproducible from one revision, recovery and identity
mismatch procedures are documented, and the active profile passes all repository
and operational gates.

## Deferred scope

Accepted requirements outside the active roadmap are canonical under
[deferred ideas](deferred-ideas/README.md). They are not active implementation
scope. Promotion requires explicit user scope approval, review of affected
binding decisions, and reinsertion into an active roadmap milestone.

- [Call for papers](deferred-ideas/call-for-papers.md)
- [Change notifications](deferred-ideas/change-notifications.md)
- [Food preferences](deferred-ideas/food-preferences.md)
- [Materials](deferred-ideas/materials.md)
- [Self-organized sessions](deferred-ideas/self-organized-sessions.md)
- [Sleeping parties](deferred-ideas/sleeping-parties.md)
- [Child rooms](deferred-ideas/child-rooms.md)
- [Party review](deferred-ideas/party-review.md)
- [Room adjacency](deferred-ideas/room-adjacency.md)
- [Caching](deferred-ideas/re-introduce-caching.md)

## Cross-cutting acceptance and cut lines

Every milestone preserves append-only domain state, in-memory derivation, typed
identity, configured resolver ownership, deterministic solver input/output/trace,
privacy projections before content leaves the Worker, no executable rules from
occasion data, and no persisted folded domain state.

Removing a report, screen, module contribution, or email kind requires marking
its specification coverage as deferred here and removing its selected profile
contribution where necessary.
