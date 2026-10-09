# Implemented documentation

This directory describes behavior present and verified in this repository,
including its limitations and working development procedures. “Implemented” does
not mean deployed: hosted CI execution, hosted preview, and production deployment
are separate claims and require separate evidence.

- [Architecture](architecture/overview.md): working runtimes, paths and boundaries.
- [Event kernel](architecture/events.md): event schemas, replay, folding and D1 append behavior.
- [Data model](architecture/data-model.md): the event table, KDL text fixtures and operational tables.
- [Derived world](architecture/derived-world.md): in-memory labels, resolver, diagnostics, projections and diffs.
- [Profile composition](architecture/profile-composition.md): typed profile construction and selected modules.
- [Features](architecture/features.md): per-audience capabilities, availability and operational bindings.
- [Composed attention](architecture/attention.md): pure profile/module checks, coverage, policies and shared presentation.
- [Family preferences](modules/family-preferences.md): response declarations and shared organiser controls.
- [Phases](architecture/phases.md): phase status, opening, closing and reopening, and closed results.
- [Room inventory](modules/room-inventory.md): implemented accommodation entities, fixture, summaries, and organiser surface.
- [Room assignment](modules/room-assignment.md): deterministic assignment solver and organiser review/report surfaces.
- [Official workshops](modules/official-workshops.md): workshop authoring, participation modes, leader handling, and cancellation event semantics.
- [Workshop space](modules/workshop-space.md): physical workshop spaces and schedule context.
- [Workshop scheduling](modules/workshop-scheduling.md): slots and one-placement scheduling.
- [Workshop rankings](modules/workshop-rankings.md): current-cycle structured choices.
- [Workshop assignment](modules/workshop-assignment.md): deterministic attendance allocation.
- [Authentication](application/authentication.md): magic links, sessions and request principals.
- [Organiser view](application/organiser-view.md): authenticated organiser host, family surfaces and draft changes.
- [Frontend](ui/frontend.md): application routes and recovery behavior.
- [Design system](ui/design-system.md): copied primitives and shell styling.
- [Local UI contract](ui/storybook.md): Storybook, Markdown guidance, coverage, and visual baselines.
- [Development](engineering/development.md): installation, CI and local preview.
- [Hosted performance analysis](engineering/performance-analysis.md): repeatable
  API, Chromium, Cloudflare trace, and guarded mutation benchmarking.
- [Testing](engineering/testing.md): checks and verification limits.
- [Documentation workflow](engineering/documentation.md): maintaining this split.

The [outstanding specification](../spec/README.md) describes future requirements.
Use matching topic paths across the two directories when helpful; create them as
content needs them. Neither directory is an archive of completed plans.
[Repository policy](../AGENTS.md#documentation-and-specification) and
[binding decisions](../decisions.md) govern both.
