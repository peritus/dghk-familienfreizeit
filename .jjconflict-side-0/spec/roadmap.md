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

<a id="m8--organiser-authored-workshop-programme"></a>
## M8 — Workshop planning completion

Specification coverage: [features](architecture/features.md),
[phases](architecture/phases.md), [official workshops](modules/official-workshops.md),
[workshop space](modules/workshop-space.md), [workshops](modules/workshops.md),
[workshop scheduling](modules/workshop-scheduling.md),
[workshop rankings](modules/workshop-rankings.md),
[workshop attendance](modules/workshop-assignment.md), and [UI-12](ui/screens/workshops.md).

The event-backed organiser foundation and deterministic automatic planner are
implemented. Event-backed fixed attendance decisions and their resolver
mechanics are delivered (see [workshop attendance](modules/workshop-assignment.md));
remaining active work is limited to the unresolved planning contract:

- complete the remaining organiser review surfaces for current and prospective
  programme and allocation contexts;
- implement the [feature contract](architecture/features.md) for every existing
  selected surface: the `features` contribution kind and its composition checks
  (§5), `deselected_features`, the first feature set (§8), derived availability
  and the family append narrowing (§4), fail-closed `DGHK_FEATURE_*` bindings
  with the allowlist consistency test, `feature_overrides` in the health and log
  responses (§6), and the room `features` → `amenities` rename. Feature
  administration stays with the system administrator; the organiser diagnostics
  screen remains deferred;
- once the feature contract is verified, replace the hand-maintained "Current
  limits" inventory in
  [`docs/application/organiser-view.md`](../docs/application/organiser-view.md)
  with the verified feature view, and document feature validation in
  [`docs/architecture/profile-composition.md`](../docs/architecture/profile-composition.md);
- implement the [phase contract](architecture/phases.md) on top of the feature
  contract: the `phases` and `closed_results` contribution kinds, typed
  `meta.phase_dates`, the phase view with `now` outside `derive` (§2–3), both
  organiser tracks rendered through `WorkflowStepper` by every stepper caller
  (§4), the phase feature bindings, `WorkshopChoiceOpened`, the workshop and
  accommodation closing and reopening events with Worker-computed payloads (§5),
  the closing review, closed-area differences, the dashboard Hinweis, and
  printed lists from the closed result (§7);
- finish capacity-race, fairness-repair, cancellation, slot-change, and privacy
  fixtures (the capacity-reduction policy is resolved as
  [D30](../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces));
- add the remaining participation heatmap and finding views without creating
  another workshop state store.

Acceptance: organisers can inspect automatic and explicitly fixed decisions,
every blocking outcome is explainable, capacity changes follow D30, and all
views retain direct workshop identity with at most one placement per workshop.
Every stepper renders its track from the phase view, and organisers can open
workshop choice and close and reopen both areas.

<a id="m10--family-access-and-release-control"></a>
## M10 — Family access

Specification coverage: [authentication](application/authentication.md), [family view](application/family-view.md),
[family preferences](modules/family-preferences.md), [phases](architecture/phases.md) §6,
[UI-01](ui/screens/login.md), [UI-02](ui/screens/login-link-invalid.md), [UI-03](ui/screens/family-preferences.md),
[UI-04](ui/screens/family-assignment.md), and D14/D16/D24.

- Implement invite-only family magic-link authentication, single-use tokens,
  canonical identities, sessions, rate limits, privacy projections, and the
  authentication delivery intent. M10 may print the link in development, but
  does not render hosted messages, call provider transport, or record delivery
  outcomes.
- Treat [issue 041](issues/open/041-person-updated-cross-family-authorization.md)
  as a blocking gate: do not enable family login, family sessions, or family
  writes until the `PersonUpdated` cross-family authorization fix and its
  regression tests pass.
- Render the shared profile-driven controls for families through the same
  definitions and ordinary event path, including Zieltermin and closed-input
  notices and assignment cards.
- Implement the family side of [phases](architecture/phases.md) §6: the live
  family composition with each area's closed result, live descriptors,
  unavailable referenced entities, and the own-family before/after comparison.
  Preserve the separate privacy gate in issue 031 for family projections.
- Apply [feature availability](architecture/features.md#4-effective-availability)
  to the family projection and family controls: only effective features reach a
  family, and a family-authored event whose feature action is not effective is
  rejected on append, including writes to a closed area. Keep availability
  distinct from authorization and phase status.
- Let an authenticated family correct its own `display-name` from the family
  view through `FamilyDisplayNameChanged`; the family may address only its own
  entity, while organisers retain the cross-family correction path from M7.
- Add closing, reopening, re-closing, withdrawn-person, cancelled-workshop,
  privacy, and family-projection fixtures.

Acceptance: after M9, a family can request and redeem a single-use login link
through the M10 authentication workflow, inspect its permitted derived
information, correct its own display name, save permitted controls while an area
is open, and see each area's result only once it is closed. Hosted invitation and
reminder delivery begins in M14. Issue 041 is closed or explicitly accepted before this
family-access acceptance is declared complete.

## M11 — Reports and browser-printing host

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
report portions of [UI-00](ui/design-system.md), and the selected modules' report contracts.

- Extend the shared, family, and organiser report host with the remaining audience
  projections, report contribution registration, and first host-rendered reports
  for modules outside the M8 workshop list slice.
- Implement responsive report layout primitives, print stylesheets, repeated
  headings, page breaks, greyscale status, and confidentiality labels.
- Keep reports derived in memory; provide no download, export, or print button.
- Add empty, restricted, mobile, browser-print, changed-data, and privacy fixtures.

Acceptance: a selected module's report contribution renders through a real
browser route and prints correctly from its audience projection. Later
feature slices own their report data; this milestone owns the shared host.

## M12 — Active-profile integration and operational readiness

Specification coverage: [profile contract](profiles/contract.md), [features](architecture/features.md),
[testing](engineering/testing.md), and the selected active module contracts.

- Load the active profile with every non-deferred module contribution.
- Verify module identity, contribution registration, selected-profile routing,
  feature declarations and effective availability, privacy projections,
  fixtures, and cross-runtime agreement as one integration.
- Complete accessibility, determinism, restricted-import, naming, and profile
  validation gates for all active vertical slices.

Acceptance: the active profile exercises every active feature end to end, while
deferred modules contribute no entities, labels, routes, screens, reports, or
emails.

## M13 — Reports catalogue and print completion

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
and report contributions from all selected modules.

- Complete the accommodation, programme, workshop roster, family information,
  differences-from-fixed-result, cost, open-issues, and active-profile report catalogue. Plan inspection
  and comparison remain deferred in the linked deferred-ideas contract.
- Finish cross-feature projections, restricted/changed/incomplete states,
  responsive layouts, print fixtures, and browser-print acceptance.

Acceptance: all active reports render from derived state, respect configured
resolution and privacy, and produce the required paper output without downloads
or export paths.

## M14 — Authentication delivery and operational email

Specification coverage: [authentication](application/authentication.md) §2,
and [deployment](engineering/deployment.md) §§5–6.

- Render invitation and reminder messages from M10 authentication delivery
  intents, and own their hosted dispatch.
- Implement provider transport and configuration, recipient preview, delivery
  claims, retries, suppression, unknown-send handling, and idempotency for
  authentication email.
- Implement operational `email_log` and delivery status separate from domain
  visibility.
- Keep closing and change emails deferred under
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
- [Food preferences](deferred-ideas/food-preferences.md) — aggregation, reporting, and safety-sheet scope
- [Materials](deferred-ideas/materials.md)
- [Self-organized workshops](deferred-ideas/self-organized-sessions.md)
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
