# Roadmap

This is the single source for implementation order, specification coverage,
delivery gates, cut lines, and deferred work. Detailed domain contracts remain
in the documents linked from each milestone.

The prerequisite runtime foundation is documented in [implemented architecture](../docs/architecture/overview.md),
[development](../docs/engineering/development.md), and [testing](../docs/engineering/testing.md).
The milestones below cover outstanding work. Each feature milestone is a complete
vertical slice for its intended audience: domain behavior, derived views,
authorisation, UI, fixtures, and tests are delivered together. Family access and
reports are separate audience and presentation slices; an organiser milestone
does not claim family behavior, and a domain milestone does not require reports
before the report host exists.

## M6 — Deterministic room assignment

Specification coverage: [solver contract](architecture/solver-contract.md),
[room assignment](modules/room-assignment.md), room-related [labels and constraints](architecture/labels-and-constraints.md),
and D5–D7.

The verified business-logic foundation is documented in
[`docs/modules/room-assignment.md`](../docs/modules/room-assignment.md). M6
delivers the read-only organiser board, its compact printable assignment
report, and their integration coverage. Family requirements and room
capabilities are edited through separate event-backed organiser surfaces; this
milestone consumes their derived result rather than replacing those editors.

- Complete the organiser board and assignment report around the derived plan.
- Verify real-inventory, configuration-change, and shuffle scenarios.

Acceptance: whole-family placement is deterministic, hard constraints are
enforced, family and room configuration changes flow through the shared organiser
draft/apply/discard pipeline, the board and report render the same derived result,
and every assignment outcome has an explanatory trace. The report is printable
through browser print styles without an in-app print button.

## M7 — Organiser controls

Specification coverage: [family preferences](modules/family-preferences.md),
[organiser view](application/organiser-view.md), [UI-03](ui/screens/family-preferences.md),
and [UI-07](ui/screens/family-detail.md).

- Implement profile-driven preference/control definitions and expose the same
  controls to organisers through family detail and related organiser surfaces.
- Add an organiser-editable family identity control to family detail so an
  organiser can rename the family's `display-name` without changing its
  identity, people, memberships, or email routing. Emit the dedicated
  `FamilyDisplayNameChanged` event through the ordinary draft, local derivation,
  authorisation, and append path.
- Use the ordinary event-draft, local derivation, authorisation, and append path;
  include save-on-change behavior, deadlines, validation, and fixtures.
- Keep family login, family sessions, family routes, and family-facing responses
  out of this milestone.

Acceptance: organisers can inspect and edit every control that families will
later receive, with the same event-backed semantics and derived results. They can
also correct a family's display name while preserving the family and person
identities, memberships, email routing, and event history. This is an
organiser-complete slice, not a family-access slice.

## M8 — Organiser-authored workshop programme

Specification coverage: [programme core](modules/programme-core.md), [official workshops](modules/official-workshops.md),
[workshop space](modules/workshop-space.md), [workshops](modules/workshops.md),
[UI-12](ui/screens/workshops.md), and programme behavior that remains organiser-only
until M10.

- Implement workshop spaces, slots, official workshop facts, organiser-authored
  sessions, publication, cancellation, audience and age eligibility, and leaders.
- Implement the organiser workshop surface and programme diagnostics.
- Keep physical-space inventory independent from accommodation inventory.
- Add replay-at-event-cut, capacity race, cancellation, slot-change, and
  eligibility fixtures.

Acceptance: organisers can create and publish an official workshop without
call-for-papers, review its effective programme state, and prove through replay
and fixtures that draft changes remain organiser-only.

<a id="m9--workshop-scheduling-and-attendance"></a>
## M9 — Workshop scheduling and attendance

Specification coverage: [workshop scheduling](modules/workshop-scheduling.md),
[workshop rankings](modules/workshop-rankings.md), [workshop attendance](modules/workshop-assignment.md),
workshop solver sections, and workshop tests.

- Implement organiser-published candidate rounds, eligibility-filtered rankings,
  no-preference values, demand summaries, deterministic scheduling, conflicts,
  and schedule release.
- Implement attendance eligibility, reservations, previous-plan retention,
  balanced allocation, manual cancellation, fill, and attendance release.
- Deliver organiser ranking, schedule, heatmap, roster, finding, and allocation
  review surfaces.
- Add ranking-before-schedule, fairness, capacity, separation, age,
  cancellation, unscheduled, deterministic, and lifecycle fixtures.

Acceptance: official sessions can be ranked before scheduling, selected sessions
are placed or reported as blocking outcomes, each person receives at most one
assignment per overlapping period, and every allocation decision is traced.
Families cannot log in during this milestone.

<a id="m10--family-access-and-release-control"></a>
## M10 — Family access and release control

Specification coverage: [authentication](application/authentication.md), [family view](application/family-view.md),
[family preferences](modules/family-preferences.md), [release control](application/release-control.md),
[UI-01](ui/screens/login.md), [UI-02](ui/screens/login-link-invalid.md), [UI-03](ui/screens/family-preferences.md),
[UI-04](ui/screens/family-assignment.md), [deferred UI-11](deferred-ideas/release-control-ui.md), and D14/D16/D24.

- Implement invite-only family magic-link authentication, single-use tokens,
  canonical identities, sessions, rate limits, privacy projections, and the
  authentication delivery intent. M10 may print the link in development, but
  does not render hosted messages, call provider transport, or record delivery
  outcomes.
- Render the M7 controls for families through the same profile-driven definitions
  and ordinary event path, including deadline notices and assignment cards.
- Let an authenticated family correct its own `display-name` from the family
  view through `FamilyDisplayNameChanged`; the family may address only its own
  entity, while organisers retain the cross-family correction path from M7.
- Implement accommodation, programme, and per-slot allocation scopes, semantic
  accessors, previews, reviewed-input/build/compatibility guards, blocking
  findings, historical composition, and atomic `Communicated` append.
- Add concurrent-confirmation, reverted-change, dependency, cancellation,
  revision-mismatch, privacy, and family-projection fixtures.

Acceptance: after M9, a family can request and redeem a single-use login link
through the M10 authentication workflow, inspect its permitted derived
information, correct its own display name, save permitted controls, and see only
coherent communicated arrangements. Hosted invitation and reminder delivery
begins in M14. Organisers can preview and atomically communicate selected scopes
without exposing drafts.

## M11 — Reports and browser-printing host

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
report portions of [UI-00](ui/design-system.md), and the selected modules' report contracts.

- Implement shared, family, and organiser report routes, audience projections,
  report contribution registration, and the first host-rendered reports over the
  projections established by M10.
- Implement responsive report layout primitives, print stylesheets, repeated
  headings, page breaks, greyscale status, and confidentiality labels.
- Keep reports derived in memory; provide no download, export, or print button.
- Add empty, restricted, mobile, browser-print, changed-data, and privacy fixtures.

Acceptance: a selected module's report contribution renders through a real
browser route and prints correctly from the released audience projection. Later
feature slices own their report data; this milestone owns the shared host.

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
  release, cost, open-issues, and active-profile report catalogue. Plan inspection
  and comparison remain deferred in the linked deferred-ideas contract.
- Finish cross-feature projections, restricted/changed/incomplete states,
  responsive layouts, print fixtures, and browser-print acceptance.

Acceptance: all active reports render from derived state, respect configured
resolution and privacy, and produce the required paper output without downloads
or export paths.

## M14 — Authentication delivery and operational email

Specification coverage: [authentication](application/authentication.md) §2,
[deployment](engineering/deployment.md) §§5–6, and the operational email portions
of the [release control](application/release-control.md) contract.

- Render invitation and reminder messages from M10 authentication delivery
  intents, and own their hosted dispatch.
- Implement provider transport and configuration, recipient preview, delivery
  claims, retries, suppression, unknown-send handling, and idempotency for
  authentication email.
- Implement operational `email_log` and delivery status separate from domain
  visibility.
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
