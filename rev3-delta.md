# rev3 delta

Rev3 makes the event log and resolver the only canonical domain model.

## Removed

- `is_admin` and `FamilyAdminFlagSet`; admin access uses a code-level email
  allowlist and a dedicated UI.
- Pin entities, pin events, party override events, reason-code triage, and pin
  retirement.
- Canonical plan tables; complete plan snapshots are `PlanSnapshotted` events.
- `tag_assignment` as a special-purpose preference table.

## Added

- Generic `entity` and `label` projections.
- `LabelSet`, `LabelCleared`, and `ConstraintDefined` events.
- Fixed data-only constraint operators: `needs-provides`, `excludes`,
  `groups-with`, and `separates-from`.
- Constraint health and regression fixtures derived from event history.

## Retained deliberately

- Typed workshop rankings, because ordered-list invariants are clearer and safer
  with a dedicated projection.
- Disposable assignment projections, because their uniqueness indexes are
  valuable solver assertions.
- Operational auth, session, rate-limit, and email tables.
- Built-in TypeScript registry and solver code; custom constraints cannot execute
  code.
