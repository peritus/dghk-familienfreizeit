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

## M16 — Shared organiser presentation

Deliver the [shared presentation completion](ui/design-system.md#shared-presentation-completion) through existing reusable components and all their current consumers, with Workshops as the first composition. Preserve the draft-status UI, lifecycle and solver semantics. Workshop advisory review is scoped to each finalisation attempt.

Acceptance: the approved component contracts, workshop content, responsive widths, accessibility, dark appearance, browser printing, Storybook coverage and documentation are verified together. No new page-specific components are introduced for other pages.

<a id="m8--organiser-authored-workshop-programme"></a>
## M8 — Workshop planning completion

Specification coverage: [official workshops](modules/official-workshops.md),
[workshops](modules/workshops.md),
[workshop attendance](modules/workshop-assignment.md), and [UI-12](ui/screens/workshops.md).

The event-backed organiser foundation and deterministic automatic planner are
implemented. Event-backed fixed attendance decisions and their resolver
mechanics are delivered (see [workshop attendance](modules/workshop-assignment.md)),
and so are the organiser sides of the [feature](../docs/architecture/features.md) and
[phase](../docs/architecture/phases.md) contracts; remaining active work is limited
to the unresolved planning contract:

- add organiser authoring for workshop cancellation through the existing
  event-backed workshop workflow, with a labelled history view for cancelled
  workshops;
- complete finding and open-case review surfaces for current and prospective
  programme and allocation contexts, building on the delivered
  [participation matrix](../docs/ui/frontend.md#workshop-participation-overview)
  and traces without creating another workshop state store;
- complete fixtures for capacity races, deterministic ranked-round allocation,
  fixed attendance, cancellation, slot changes, and privacy, exercising the
  allocation and capacity policies in [D4](../decisions.md#d4--stable-sorted-greedy-not-integer-programming),
  [D30](../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces),
  and [D31](../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops);
- reconcile the workshop contract terms for reservations, individual attendance
  cancellation, separation, and age eligibility. Record whether current behavior
  covers each term, it remains active M8 work, or it requires an explicit scope
  decision before M8 can close.

Acceptance: organisers can inspect automatic and explicitly fixed placements
and attendance, including finding and open-case outcomes; eligible rankings can
be recorded before placement is known, with no-preference represented explicitly;
every blocking outcome and allocation decision is traceable; cancellation is
authorable and remains accessible in labelled history; capacity changes follow D30; each workshop has at most one placement
and each person has at most one assignment per overlapping period; and every
reconciled contract term has a recorded disposition.

<a id="m10--family-access-and-release-control"></a>
## M10 — Family access

Specification coverage: [authentication delivery intent](application/authentication.md#m10-delivery-intent), [family view](application/family-view.md),
[family preferences](modules/family-preferences.md), [phases](architecture/phases.md) §6,
[UI-01](ui/screens/login.md), [UI-02](ui/screens/login-link-invalid.md), [UI-03](ui/screens/family-preferences.md),
[UI-04](ui/screens/family-assignment.md), and D14/D16/D24.

- Create the authentication delivery intent for an eligible family login
  request. Family magic-link authentication, single-use tokens, canonical
  identities, sessions, rate limits, and request authorization are implemented
  in the [current authentication foundation](../docs/application/authentication.md).
  M10 may expose the link in development, but does not render hosted messages,
  call provider transport, or record delivery outcomes.
- Render the shared profile-driven controls for families through the same
  definitions and ordinary event path, including Zieltermin and closed-input
  notices and assignment cards.
- Implement the family side of [phases](architecture/phases.md) §6: the live
  family composition with each area's closed result, live descriptors,
  unavailable referenced entities, and the own-family before/after comparison.
  The returned family projection is subject to the privacy gate below.
- Declare the allocation features of the [feature set](architecture/features.md#8-feature-set)
  together with the family results they govern, and apply
  [feature availability](architecture/features.md#4-effective-availability)
  to the family projection and family controls: only effective features reach a
  family, and a family-authored event whose governing feature is not effective is
  rejected on append, including writes to a closed area. Keep availability
  distinct from authorization and phase status.
- Let an authenticated family correct its own `display-name` from the family
  view through `FamilyDisplayNameChanged`; the family may address only its own
  entity, while organisers retain the cross-family correction path from M7.
- Add closing, reopening, re-closing, withdrawn-person, cancelled-workshop,
  privacy, and family-projection fixtures.

### Family projection privacy gate

Before `/api/family/view` returns any derived family data, diffs, badges,
reports, or notification previews:

- Build the projection from an explicit family-visible allowlist; do not
  shallow-copy the organiser world. Recompute or filter every derived
  collection, including diagnostics, summaries, capabilities, constraints,
  indexes, relation values, and metadata, and prevent facts derived from
  restricted labels or identifiers for hidden entities from crossing this
  boundary.
- Decide which diagnostics and world summaries, if any, are family-visible.
  Decide whether relation values that point outside the family are omitted,
  redacted, or replaced by stable non-identifying status values. Do not expose
  the projection until those decisions are explicit and enforced.
- Add adversarial family-projection tests with restricted labels, hidden entity
  identifiers, diagnostics, module summaries, and relation targets outside the
  family.

M10 is not complete until this gate is implemented and its adversarial tests
pass.

Acceptance: after M8, an authenticated family can inspect its permitted derived
information, correct its own display name, save permitted controls while an area
is open, and see each area's result only once it is closed. The family projection
privacy gate is implemented and its adversarial tests pass. Hosted invitation
and reminder delivery begins in M14.
Issue 041 is closed or explicitly accepted before this family-access
acceptance is declared complete.

## M11 — Reports and browser-printing host

Specification coverage: [reports](application/reports.md), [D21](../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets),
report portions of [UI-00](ui/design-system.md), and the selected modules' report contracts.

- Extend the shared, family, and organiser report host with the remaining audience
  projections, report contribution registration, and first host-rendered reports
  for modules outside the M8 workshop list slice, including printed accommodation
  lists from a closed area's result ([phases](architecture/phases.md) §7).
- Extend the [implemented screen and print foundation](../docs/ui/design-system.md)
  with report-specific repeated titles, audience metadata and host-rendered
  layouts; verify their pagination and confidentiality for each projection.
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

Specification coverage: [authentication delivery](application/authentication.md#m14-hosted-delivery),
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

Specification coverage: [deployment](engineering/deployment.md), [authentication delivery](application/authentication.md#m15-organiser-perimeter),
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
- [Demand-aware workshop scheduling](deferred-ideas/demand-aware-workshop-scheduling.md)

## Cross-cutting acceptance and cut lines

Every milestone preserves append-only domain state, in-memory derivation, typed
identity, configured resolver ownership, deterministic solver input/output/trace,
privacy projections before content leaves the Worker, no executable rules from
occasion data, and no persisted folded domain state.

Removing a report, screen, module contribution, or email kind requires marking
its specification coverage as deferred here and removing its selected profile
contribution where necessary.
