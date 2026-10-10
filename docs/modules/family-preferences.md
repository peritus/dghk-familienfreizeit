# Family preferences

The selected `family-preferences` module provides compiled sections and a shared
control union used by organiser family detail. The family's composed preferences
page and reminder mail remain [outstanding](../../spec/modules/family-preferences.md).

## Response declarations

`response_fields` declares each response's trait `key`, `family` or `person` scope,
`value` or `tri-state` control and `requested` or `optional` requirement. Composition
rejects duplicates, unknown traits, scope/control mismatches and fields outside
configured sections. Every tri-state control must declare a requested or optional
response policy. Requested, applicable, offered controls can have an unanswered
state, but it does not create a per-person organiser attention item. Aggregate
response progress is [deferred](../../spec/deferred-ideas/attention-progress-statistics.md).
Optional notes and relationship controls do not become gates.
The active profile requests three room answers and each person's diet.

Every family-facing tri-state has a generated `response-<key>` boolean-true marker.
Its scope, sensitivity, ownership and governing feature match the source control.
The marker's `governed_control` maps authorization to that source control. Marker
collisions fail composition. These are generic labels, not persisted response state.

Tri-state controls read their value from the world: absent means unanswered;
`response-<key>=true` means indifferent; the source label's strength means required
or preferred. Changing an answer clears source and marker in one atomic group,
then sets exactly the selected source or marker. Reset clears both. No historical
backfill infers neutrality. Contradictory held marker/source values create attention.

## Controls and authorization

The shared renderer supports tri-state, toggle, choice, free-text, family/person
pickers and selected module controls for workshop ranking, sign-up and interest.
Sections declare traits, features and optional phase/late-contact copy. Controls
reuse their compiled schemas and authorization. An unavailable trait remains
visible with its applicability reason; feature and phase status govern whether
an audience may edit. Organiser parity follows D24. Family-owned generic writes
use the same scope, ownership and feature checks at append.

Live label timestamps come from normalized event envelopes. A late-save
information item can identify an answer saved after a configured target using the
live `set_at`, without scanning history or keeping tombstones. Targets remain
advisory.

See [composed attention](../architecture/attention.md) for coverage, wording and
privacy, and [features](../architecture/features.md) for availability.
Verification includes config compilation, feature/authorization tests, shared
control tests and the attention catalogue/acceptance suites.
