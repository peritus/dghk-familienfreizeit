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
- [Authentication](application/authentication.md): magic links, sessions and request principals.
- [Frontend](ui/frontend.md): application routes and recovery behavior.
- [Design system](ui/design-system.md): copied primitives and shell styling.
- [Development](engineering/development.md): installation, CI and local preview.
- [Testing](engineering/testing.md): checks and verification limits.
- [Documentation workflow](engineering/documentation.md): maintaining this split.

The [outstanding specification](../spec/README.md) describes future requirements.
Use matching topic paths across the two directories when helpful; create them as
content needs them. Neither directory is an archive of completed plans.
[Repository policy](../AGENTS.md#documentation-and-specification) and
[binding decisions](../decisions.md) govern both.
