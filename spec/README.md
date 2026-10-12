# Outstanding specification

This directory defines behavior still to be implemented. Present-tense contracts
and code examples describe intended behavior, not evidence that it exists.
Implemented means present and verified in this repository; deployment is a separate
claim. See [implemented documentation](../docs/README.md) for the working system.

The [repository documentation policy](../AGENTS.md#documentation-and-specification)
is authoritative. Organize by topic, use matching topic paths in `docs/` when
useful, and create directories only when they contain material. Filenames are
kebab-case without reading-order numbers; the index defines reading order.
Decision IDs and UI screen IDs remain stable.

Start with [product scope](application/overview.md) and the
[domain glossary](architecture/glossary.md), then follow the reading order below.
The [roadmap](roadmap.md) orders outstanding milestones; the
[issue catalog](issues/README.md) records unresolved findings, not approved
resolutions. [Binding decisions](../decisions.md) govern both planned and
implemented work. [UI specifications](ui/README.md) and the
[illustrative profile](profiles/familienfreizeit-2027.md) elaborate the contracts.

The working foundation those findings are filed against is documented in
[architecture](../docs/architecture/overview.md), [UI components](../docs/ui/design-system.md),
and [testing](../docs/engineering/testing.md). The implemented [room inventory](../docs/modules/room-inventory.md)
now supplies the runtime event-derived fixture and organiser surface; remaining
specification entries describe later solver, family, report, and operational work.

Standalone visual prototypes are catalogued in [HTML prototypes](html-prototypes/README.md).
They are illustrative only and follow the directory-specific promotion rules;
their presence does not add requirements or establish implemented behavior.

[Active implementation scope belongs in the roadmap milestones.](roadmap.md)
Accepted work that is outside those milestones belongs in
[deferred scope](deferred-ideas/README.md), the sole canonical mechanism for
out-of-roadmap requirements. Promotion requires explicit user scope approval,
review of affected binding decisions, and reinsertion into the roadmap. A
deferred contract is distinct from a module that is merely not selected by a
particular profile.

The [attention contract](../docs/architecture/attention.md) governs composed findings,
response completeness, readiness and evidence review.

## Reading order

| # | Document | What it settles |
|---|---|---|
| 1 | [Architecture](architecture/overview.md) | Kernel and modules, request lifecycle, and boundaries |
| 2 | [Data model](architecture/data-model.md) | Generic identity, labels, relationships, and projections |
| 3 | [Event model](architecture/events.md) | Generic event envelope, replay, and lifecycle |
| 4 | [Labels and constraints](architecture/labels-and-constraints.md) | Trait vocabulary, resolver operators, and validation |
| 5 | [Solver contract](architecture/solver-contract.md) | Determinism contract, solver input, pipeline, rules, and trace |
| 6 | [Phases](architecture/phases.md) | Areas, phase status, closing and reopening, and what families see |
| 7 | [Organiser view](application/organiser-view.md) | Organisation-team surfaces and module-provided screens |
| 8 | [Family view](application/family-view.md) | Family-facing controls, privacy, and family workflows |
| 9 | [Authentication](application/authentication.md) | Remaining invitation and reminder email delivery |
| 10 | [Frontend](ui/frontend.md) | Rendering, enhancement, styling, and board island |
| 11 | [Deployment](engineering/deployment.md) | One profile per deployment, migrations, secrets, and email |
| 12 | [Testing](engineering/testing.md) | Determinism tests, module contracts, and event fixtures |
| 13 | [Occasion profiles](profiles/contract.md) | Profile contract and configuration rules |
| 14 | [German translation guidelines](ui/german-translation-guidelines.md) | Family-facing terminology and translation rules |
| 15 | [Reports](application/reports.md) | Report catalogue, audience scopes, responsive behavior, and print stylesheets |
| 16 | [Modules](modules/contract.md) | Module contract, composition, and catalogue |
| 17 | [Features](architecture/features.md) | Module-owned features, effective availability, and operational bindings |
| 18 | [Room inventory](modules/room-inventory.md) | Remaining room-inventory report contribution |
| 19 | [Room assignment](modules/room-assignment.md) | Remaining placement extensions and consumers |
| 20 | [Workshops](modules/workshops.md) | Selected workshop modules and their remaining family-facing integration |
| 21 | [Workshop space](modules/workshop-space.md) | Remaining workshop-space inventory report contribution |
| 22 | [Workshop cancellation](deferred-ideas/workshop-cancellation.md) | Accepted-but-deferred cancellation authoring and history view |
| 23 | [Self-organized workshops](deferred-ideas/self-organized-sessions.md) | Accepted-but-deferred proposer-created workshops |
| 24 | [Workshop rankings](modules/workshop-rankings.md) | Remaining family ranking-control integration |
| 25 | [Workshop attendance](modules/workshop-assignment.md) | Remaining findings, open cases, and contract reconciliation |
| 26 | [Call for papers](deferred-ideas/call-for-papers.md) | Accepted-but-deferred proposal intake |
| 27 | [Food preferences](deferred-ideas/food-preferences.md) | Accepted-but-deferred food aggregation, reporting, and safety-sheet scope |
| 28 | [Materials](deferred-ideas/materials.md) | Accepted-but-deferred requests, commitments, and fulfilment |
| 29 | [Family preferences](modules/family-preferences.md) | The profile-driven preferences page and control union |
| 30 | [Change notifications](deferred-ideas/change-notifications.md) | Accepted-but-deferred closing and change emails |
| 31 | [Workshop companion requests](deferred-ideas/workshop-companion-requests.md) | Accepted-but-deferred requests to attend a specific workshop with named family members |
| 32 | [Prior art](prior-art/README.md) | Analyses of earlier external solutions, starting with the previous year's course-planning spreadsheet |
