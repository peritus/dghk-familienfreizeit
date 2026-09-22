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
and [testing](../docs/engineering/testing.md); those checks do not demonstrate
domain behavior, runtime inventory fixtures, or the future module/profile
contracts. The active profile's source inventory reconciles to 38 rooms and
162 beds: 100 at the lower price and 62 at the higher price, totaling 15,236.
Runtime event-derived inventory fixtures and counts remain M4 work.

[Active implementation scope belongs in the roadmap milestones.](roadmap.md)
Accepted work that is outside those milestones belongs in
[deferred scope](deferred-ideas/README.md), the sole canonical mechanism for
out-of-roadmap requirements. Promotion requires explicit user scope approval,
review of affected binding decisions, and reinsertion into the roadmap. A
deferred contract is distinct from a module that is merely not selected by a
particular profile.

## Reading order

| # | Document | What it settles |
|---|---|---|
| 1 | [Architecture](architecture/overview.md) | Kernel and modules, request lifecycle, and boundaries |
| 2 | [Data model](architecture/data-model.md) | Generic identity, labels, relationships, and projections |
| 3 | [Event model](architecture/events.md) | Generic event envelope, replay, and lifecycle |
| 4 | [Labels and constraints](architecture/labels-and-constraints.md) | Trait vocabulary, resolver operators, and validation |
| 5 | [Solver contract](architecture/solver-contract.md) | Determinism contract, solver input, pipeline, rules, and trace |
| 6 | [Release control](application/release-control.md) | Held arrangements, communication scopes, review and visibility |
| 7 | [Organiser view](application/organiser-view.md) | Organisation-team surfaces and module-provided screens |
| 8 | [Family view](application/family-view.md) | Family-facing controls, privacy, and family workflows |
| 9 | [Authentication](application/authentication.md) | Magic links, sessions, and threat model |
| 10 | [Frontend](ui/frontend.md) | Rendering, enhancement, styling, and board island |
| 11 | [Deployment](engineering/deployment.md) | One profile per deployment, migrations, secrets, and email |
| 12 | [Testing](engineering/testing.md) | Determinism tests, module contracts, and event fixtures |
| 13 | [Occasion profiles](profiles/contract.md) | Profile contract and configuration rules |
| 14 | [German translation guidelines](ui/german-translation-guidelines.md) | Family-facing terminology and translation rules |
| 15 | [Reports](application/reports.md) | Report catalogue, audience scopes, responsive behavior, and print stylesheets |
| 16 | [Modules](modules/contract.md) | Module contract, composition, and catalogue |
| 17 | [Room inventory](modules/room-inventory.md) | Buildings, rooms, beds, places, and capacity |
| 18 | [Room assignment](modules/room-assignment.md) | Deterministic placement, room scoring, and the board |
| 19 | [Workshops](modules/workshops.md) | Slots, workshops, audience, leadership, and cancellation |
| 20 | [Workshop space](modules/workshop-space.md) | Physical workshop spaces, capacity, availability, and capabilities |
| 21 | [Programme core](modules/programme-core.md) | Shared programme-session identity and typed module boundary |
| 22 | [Call for papers](deferred-ideas/call-for-papers.md) | Accepted-but-deferred official proposal review, selection, and candidate rounds |
| 23 | [Official workshops](modules/official-workshops.md) | Official workshop facts and eligibility |
| 24 | [Self-organized sessions](deferred-ideas/self-organized-sessions.md) | Accepted-but-deferred immediate self-organised sessions and proposer placement |
| 25 | [Workshop scheduling](modules/workshop-scheduling.md) | Offerings, placement, conflicts, and schedule release |
| 26 | [Workshop rankings](modules/workshop-rankings.md) | Eligibility-filtered pre-schedule choices |
| 27 | [Workshop attendance](modules/workshop-assignment.md) | Fair attendance assignment |
| 28 | [Food preferences](deferred-ideas/food-preferences.md) | Accepted-but-deferred per-person diet and allergy text |
| 29 | [Materials](deferred-ideas/materials.md) | Accepted-but-deferred requests, commitments, and fulfilment |
| 30 | [Family preferences](modules/family-preferences.md) | The profile-driven preferences page and control union |
| 31 | [Change notifications](deferred-ideas/change-notifications.md) | Accepted-but-deferred communication and change emails |
