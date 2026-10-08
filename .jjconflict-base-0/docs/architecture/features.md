# Features

A feature is a module-owned capability offered to one audience — families or
organisers — that the profile selects, a deployment binding may switch, and a
phase may activate. The organiser-side contract is implemented; the family
projection and the allocation features remain in the
[outstanding feature specification](../../spec/architecture/features.md).

## Declaration and governance

Modules declare features through the `features` contribution kind, typed in
[`src/config/features.ts`](../../src/config/features.ts). A feature id is
`<module-id>.<audience>-<name>`; each feature has one `audience`, a subject kind,
required features and phases with an `all`/`any` activation mode, optional
readiness, and — for a family feature — its `organiser_counterpart` (D24).
Organiser workflow actions (opening workshop choice, closing, reopening) are not
features.

The active profile declares four features:

| Feature | Audience | Governs | Requires phase |
|---|---|---|---|
| `family-preferences.family-room-wishes` | family | section `room-wishes` | `family-preferences.accommodation-preferences` |
| `family-preferences.organiser-room-wishes` | organiser | section `room-wishes` | — |
| `workshop-rankings.family-workshop-wishes` | family | section `workshops` | `workshop-rankings.choice` |
| `workshop-rankings.organiser-workshop-wishes` | organiser | section `workshops` | — |

A family-preferences section lists its governing features in
`sections[].features`, at most one per audience. Every control in the section —
profile traits and module controls such as rankings, sign-up and interest — is
governed by the section's feature for the renderer's audience. The `people` and
`food` sections are ungoverned.

`defineOccasionProfile` rejects duplicate or misnamed feature ids, a family
feature without an organiser counterpart of the same module, unknown,
unrequired or cyclic required features, unknown phases or subject kinds,
sections naming unknown features or two of one audience, deselections of
another module's or an unknown feature, and two features sharing a binding name.
The kernel-owned `deselected_features` module parameter deselects features.

## Availability

[`src/derive/features.ts`](../../src/derive/features.ts) derives, per declared
feature, the layers `declared`, `selected`, `operational` (`built`, `env-on`,
`env-off`), `phase_active`, `ready` (with the not-ready reason or the failing
required feature), `authorised`, and `effective`. It runs after
`derive(events, config)` from the composed profile, the world, the operational
overrides, the phase activation, and the principal's audience; nothing is
persisted.

- The organiser application derives its effective organiser features and offers
  a governed section on family detail only while that feature is effective.
  While the section's family phase is closed, family detail shows a
  **Festgelegt** note and organiser edits remain possible.
- The Worker rejects a family-authored `LabelSet` or `LabelCleared` whose label
  key belongs to a control in a governed section when the section's family
  feature is not effective for the world before the batch. Narrowing applies
  after ordinary authorisation, resolves aliases, and never applies to organiser
  events. No trait of the active profile is `family_writable` yet, so this path
  is verified by unit tests rather than an end-to-end family write.

## Operational bindings

Each declared feature has one optional Worker binding
`DGHK_FEATURE_<ID>=on|off`, read fail-closed by
[`src/worker/feature-bindings.ts`](../../src/worker/feature-bindings.ts). A
malformed value or a name that matches no declared feature makes every
application route answer `503 invalid_feature_bindings`, and the health response
answers `503 misconfigured` naming the invalid bindings. Set bindings are
logged and reported as sorted `feature_overrides` in the health, organiser log,
and organiser apply responses; they never enter `build_revision` or
`compatibility_revision` (D20). The organiser application derives with the
Worker's overrides and asks for a reload when an apply response reports
different ones.

The bindings are declared in
[`src/worker/environment.d.ts`](../../src/worker/environment.d.ts) and forwarded
by the `dev-preview` task when set; a test checks both lists against the composed
profile.

## Verification

Profile-build, availability-layer, allowlist, Worker binding, append-narrowing,
and organiser rendering tests live in `test/config/features.test.ts`,
`test/config/feature-availability.test.ts`, `test/config/feature-bindings.test.ts`,
`test/config/authorization.test.ts`, `test/worker/runtime.test.ts`,
`test/worker/organiser.test.ts`, `test/app/family-detail.test.tsx`, and
`test/app/shell.test.tsx`.
