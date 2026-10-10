# Composed attention

## Evaluation

`profileAttention(profile)` composes core checks and the `attention_checks` of
selected, compiled modules into one pure function. It consumes the event-derived
world, its matching plan, explicit UTC time, locale, audience, effective features,
closed comparisons and operational metadata. Findings remain in memory. The event
log remains the only persisted domain state; closing acknowledgements persist only
an opaque fingerprint.

The result has `items` and `coverage`. Every registered check is evaluated,
not-applicable, or unavailable. A missing world, mismatched plan head or build,
or failed collector produces sanitized unavailable findings. All-clear requires
complete coverage and no actionable problem or review items.

Each item contains a stable ID and code, owner, kind, severity, typed subjects,
JSON evidence, source references, committed or prospective basis, German or English
wording, areas, display scopes, explicit operation blockers, an optional evidence
acknowledgement and typed actions. IDs encode the code and canonical natural key;
copy, names, locale and event head are excluded. Conflicting evidence for one ID
makes that check unavailable. Identical facts merge. Counts and details select the
same IDs, in deterministic severity/code/ID order.

## Ownership and policies

The resolver and solver own domain facts. Checks adapt structured causes; they do
not parse exception text, persist findings, or run screen-specific solvers.
Severity describes urgency. Explicit blockers decide admission and closing;
`unavailable_blocks` identifies required checks whose missing coverage blocks an
operation. Informational demand, choice shortfall, and ordinary unplaced-family
warnings do not acquire blockers from their tone.

The registry owns domain attention, operation feedback, authoring field wording,
and public login/route recovery wording. Organiser routes select the state owner's
result. Small public controls compose only their audience-safe checks.

The catalogue covers kernel label/reference/cardinality/contradiction causes,
missing people and child ages, requested responses and inconsistent neutrality,
workshop authoring advisories, stale/ineligible/inconsistent choices, demand,
ranked overlaps, scheduling failures, external leader availability, fixed
attendance conflicts, actual overlaps, attendance capacity, choice fulfilment,
room inventory, required room feasibility, capacity lower bounds, missing places,
unmet preferences, phase targets and changed closed results. Operational checks
cover loading, saving, drafts, failures, stale views, confidentiality and recovery.

## Responses and time

[Family preferences](../modules/family-preferences.md) declares requested responses
per control and scope. Unknown historical answers remain unknown. Neutrality is an
explicit ordinary label. Optional controls do not become completeness requirements.
Live labels carry their event envelope's `set_at`; clearing removes the live label.

Time enters evaluation explicitly. The organiser refreshes at the next target
boundary and on focus/visibility changes. Clock and save metadata changes reuse the
world and solver plan. Targets are advisory and do not disable late editing.

## Admission and closing

[D30](../../decisions.md#d30--workshop-capacity-is-solver-input-festlegen-snapshots-the-result)
keeps proposal admission structural: capacity edits are not rejected because
they exceed explicit attendance or change the solver result. The current solver
plan is recomputed from the prospective event prefix and new capacity. Sign-ups
and fixed attendance remain explicit inputs, and over-capacity remains visible
as a derived finding. Replay and the narrow validation view stay structural.
Stale-head/build checks and atomic persistence remain authoritative at the Worker
boundary.

Closing selects registered blockers and required-check coverage at its exact
prefix. Workshop age/audience and missing/unavailable-leader advisories require
review. Their fingerprint covers natural keys, relevant evidence and build policy;
translated wording and unrelated head changes do not invalidate it. The browser
pins the reviewed fingerprint; the Worker recomputes it and requires the
acknowledgement immediately before the closing in the same batch.

Closing stores the solver result at its exact event prefix. Later input edits
recompute the current plan without rewriting that snapshot; closed comparisons
retain room, place, unplaced, attendance, placement and unassigned changes with
affected families and explicit unknown-family attribution.
Historical workshop lists replay the closing prefix and borrow explanations only
when the build and compatibility revisions match and its canonical IDs match the recorded result. Current descriptors stay live.
A missing verified explanation is stated explicitly.

## Presentation and privacy

Configured response titles identify their field. Collapsed notices and family
indicators include authorized live subject names; those names never enter identity
or acknowledgement fingerprints. Known derived sleeping places have readable bed
and room descriptions. Shared notices expose expandable details, typed subjects, counts, causes,
provenance and typed navigation/recovery actions. Exact label clearance verifies
both reviewed value and sequence before staging removal. Draft groups have stable
session IDs; correction or discard preserves other groups. Submitted groups are
locked until the request completes. Invalid proposals show recovery without
claiming a valid current plan. Recovery may use names and options from an explicitly
labelled committed baseline; automatic application waits for a valid proposal.
Screen lists initially limit visible notices;
printing includes the complete selected set and read-only evidence.

Audience filtering happens before collection and rejected organiser findings are
never seeded into another audience. World projections use explicit allowlists for
labels, indices, relationships, diagnostics, summaries and closing facts.
Restricted values/notes and unavailable entity IDs do not become general copy.
Family event failures do not return organiser findings or other families' event
payloads. The family view API remains its existing identity-only foundation.

## Verification

The executable catalogue in `test/events/attention-catalogue.test.ts` accounts for
every loaded check and exercises triggering/resolved facts, deterministic IDs,
locale, prospective basis, audience isolation, missing inputs and note privacy.
`test/events/attention-acceptance.test.ts` covers composition, response semantics,
acknowledgements, capacity prefixes, room feasibility and projection isolation.
Worker, organiser state, closing, app, build and browser suites cover their
respective boundaries. Local verification does not establish hosted deployment.
