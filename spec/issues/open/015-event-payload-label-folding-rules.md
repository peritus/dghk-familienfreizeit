---
id: "015"
title: Event payload-to-label folding rules are underspecified
status: open
severity: contract-contradiction
category: kernel
source: event-payload-folding-investigation
related_decisions: [D18]
opened: 2026-09-19
---

# Event payload-to-label folding rules are underspecified

Investigation complete. No files were modified; no finalization was required.

## 1. Inconsistencies and ambiguities

### Generic rule versus semantic aliases

- [`architecture/events.md:88-94`](../../architecture/events.md) says every mutable setup payload field becomes a label by kebab-casing its field name.
- [`decisions.md:350-354`](../../../decisions.md) reinforces that setup folding changes only separators, e.g. `does_not_need_a_bed → does-not-need-a-bed`.
- But [`architecture/data-model.md:172-184`](../../architecture/data-model.md) explicitly models semantic relationship labels such as `member-of`, `located-in`, and `offered-in`.
- [`architecture/events.md:134-137`](../../architecture/events.md) maps `PersonAdded.family_id` to `member-of`, not `family-id`.
- [`modules/room-inventory.md:80-81`](../../modules/room-inventory.md) says all fields use kebab-case except entity id and `sort_key`, but:
  - `RoomAdded.building_id → located-in` at [`modules/room-inventory.md:91-107`](../../modules/room-inventory.md)
  - `BedAdded.room_id → located-in` at [`modules/room-inventory.md:120-135`](../../modules/room-inventory.md)
- [`modules/workshops.md:82-87`](../../modules/workshops.md) maps:
  - `slot_id → offered-in`
  - `room_id → held-in`
- [`modules/materials.md:109-115`](../../modules/materials.md) says fields use kebab-case, while its declared labels use semantic mappings:
  - `requested_by → requested-by`
  - `contributed_by → contributed-by`
  - `workshop_id → workshop`
  - `concerns_person_id → concerns-person`
  - `fulfills → fulfills`
  at [`modules/materials.md:128-133`](../../modules/materials.md).

The documents therefore contain two rules without precedence:

1. mechanical `snake_case → kebab-case`;
2. event-specific semantic field-to-label mapping.

### Incomplete kernel mappings

- `FamilyInvited` lists `family_id`, `email`, `display_name`, and `locale` at [`architecture/events.md:100-106`](../../architecture/events.md), but does not explicitly state which become labels.
- [`profiles/contract.md:61-66`](../../profiles/contract.md) implies `display-name`, `email`, and `locale` are family labels, but does not say that `family_id` is identity-only.
- `FamilyEmailChanged` carries `old_email` and `new_email` at [`architecture/events.md:114-123`](../../architecture/events.md), but does not specify whether:
  - only `new_email → email` is folded;
  - `old_email` is history-only;
  - both fields become labels.
- `PersonUpdated` is described only as a “full restatement” at [`architecture/events.md:143-146`](../../architecture/events.md); its complete schema and exact replacement behavior are unspecified.
- `PersonWithdrawn.reason` is defined at [`architecture/events.md:148-152`](../../architecture/events.md), but no `withdrawn-reason` label or lifecycle-label rule is stated.
- `WorkshopCancelled.reason` is defined at [`modules/workshops.md:89-96`](../../modules/workshops.md), while `cancelled-reason` is declared as a module-owned label at [`modules/workshops.md:120-124`](../../modules/workshops.md); the folding statement is missing.
- `MaterialRequestCancelled.reason` and `MaterialCommitmentWithdrawn.reason` are defined at [`modules/materials.md:73-77`](../../modules/materials.md) and `103-110`, and corresponding `cancelled-reason`/`withdrawn-reason` labels are declared at [`modules/materials.md:128-133`](../../modules/materials.md), but the event-to-label mapping is not explicit.

### Null and omission semantics

The specs use nullable fields extensively:

- `room_id: string | null` in [`modules/workshops.md:67-79`](../../modules/workshops.md)
- `workshop_id` and `concerns_person_id` in [`modules/materials.md:60-70`](../../modules/materials.md)
- nullable descriptive fields throughout the modules

The documents do not state whether a null payload field means:

- no label is emitted;
- an existing setup label is cleared;
- a label with JSON `null` is emitted.

This matters especially for full updates and `held-in`, `workshop`, `concerns-person`, and `fulfills`.

### Alias ambiguity

[`profiles/contract.md:112-115`](../../profiles/contract.md) permits profile aliases “accepted on replay and mapped to this tag,” while [`engineering/testing.md:257-264`](../../engineering/testing.md) requires alias-collision checks. The documents do not clarify whether aliases apply to:

- ordinary `LabelSet` keys only;
- setup-generated keys;
- semantic source-field names;
- historical label keys after a semantic rename.

## 2. Intended canonical mapping model

The coherent model implied by the repository is:

1. The event payload remains snake_case.
2. Entity identity fields are not labels:
   - the entity’s own id;
   - `sort_key`;
   - fold-derived identity such as generated place ids.
3. Ordinary domain properties use mechanical snake-to-kebab conversion:
   - `given_name → given-name`
   - `room_type → room-type`
   - `starts_at → starts-at`
4. Relationship-bearing or lifecycle fields use explicit semantic mappings:
   - `family_id → member-of`
   - `building_id → located-in`
   - `room_id` on beds → `located-in`
   - `slot_id → offered-in`
   - `room_id` on workshops → `held-in`
   - `requested_by → requested-by`
   - `contributed_by → contributed-by`
   - `workshop_id → workshop`
   - `concerns_person_id → concerns-person`
   - `fulfills → fulfills`
5. Explicit event/module mappings override mechanical kebab-casing.
6. Full update events replace the complete set of setup-owned labels for that entity; they must not merge partial fields.
7. Null relationship/property fields mean the corresponding label is absent or cleared, not a live JSON-null relationship, unless a specific schema explicitly requires null as a value.
8. The resolver validates the resulting labels and references; it does not infer semantic aliases from field names.

Recommendation: preserve D18 as the naming rule, but define semantic mappings as an explicit exception layer in the event/module contract. This does not require changing the architecture decision; it clarifies that D18 governs vocabulary spelling after semantic mapping, not the mapping itself.

## 3. Affected documents and implementation surfaces

### Documents

Primary:

- [`architecture/events.md:88-94, 100-152`](../../architecture/events.md)
- [`decisions.md:323-354`](../../../decisions.md)
- [`architecture/data-model.md:129-184`](../../architecture/data-model.md)
- [`architecture/labels-and-constraints.md:70-93, 153-179, 295-309`](../../architecture/labels-and-constraints.md)
- [`profiles/contract.md:61-66, 90-115`](../../profiles/contract.md)
- [`modules/contract.md:83-112, 178-184`](../../modules/contract.md)
- [`engineering/testing.md:100-145, 252-267`](../../engineering/testing.md)

Module-specific:

- [`modules/room-inventory.md:78-135, 156-177`](../../modules/room-inventory.md)
- [`modules/workshops.md:54-124`](../../modules/workshops.md)
- [`modules/materials.md:56-138`](../../modules/materials.md)
- [`modules/food-preferences.md:39-47`](../../modules/food-preferences.md)
- [`modules/workshop-rankings.md:46-78`](../../modules/workshop-rankings.md)
- [`profiles/familienfreizeit-2027.md:78-106, 123-140, 171-224`](../../profiles/familienfreizeit-2027.md)
- [`profiles/familienfreizeit-2027.example.ts:48-375`](../../profiles/familienfreizeit-2027.example.ts)

### Implementation surfaces

The repository is specification-only; the prescribed future surfaces are:

- `src/events/types.ts` — payload schemas and event union ([`architecture/overview.md:295-296`](../../architecture/overview.md))
- `src/derive/fold.ts` — canonical event-to-entity/label fold ([`architecture/overview.md:297-300`](../../architecture/overview.md))
- `src/modules/<module-id>/events.ts` — module schemas and fold functions ([`modules/contract.md:210-223`](../../modules/contract.md))
- `src/config/define.ts` — label ownership, aliases, and profile validation
- resolver validation for setup-only keys, references, cardinality, and unknown tags
- KDL loader and replay validation
- module contract tests, fixture logs, and golden-plan tests

## 4. Edge cases

- Replay must validate the same payload schema as append: [`architecture/events.md:65-69`](../../architecture/events.md).
- Full updates must clear labels omitted from the new restatement; otherwise stale relationships survive.
- Historical replay must evaluate event-time validity, not final-state validity, as required for workshop participation at [`modules/workshops.md:180-185`](../../modules/workshops.md).
- A missing selected module must reject its event during replay, per [`modules/contract.md:178-184`](../../modules/contract.md).
- Cross-module references must fail when the target module is absent or the target entity is missing:
  - workshop `room_id`;
  - materials `workshop_id`;
  - material `concerns_person_id`.
- Null references must not become dangling references or resolvable entity ids.
- Unknown live label keys are retained, ignored by the solver, and reported as `kernel.unknown-tag` per [`architecture/labels-and-constraints.md:302-309`](../../architecture/labels-and-constraints.md).
- Historical aliases should normalize old label keys during replay; aliases must not collide with canonical keys or module-owned keys ([`profiles/contract.md:112-115`](../../profiles/contract.md), [`engineering/testing.md:257-264`](../../engineering/testing.md)).
- Fixture KDL remains snake_case at the payload boundary. Derived assertions should verify canonical label keys, not merely successful parsing ([`architecture/events.md:36-63`](../../architecture/events.md), [`engineering/testing.md:100-124`](../../engineering/testing.md)).
- A semantic mapping change is a domain-model compatibility change, not a SQL migration. Old events must be replayed or transformed through an ordinary corrective append; event rows must not be edited ([`engineering/deployment.md:137-146`](../../engineering/deployment.md)).
- Label ordering and canonical values must remain deterministic for replay, shuffle invariance, and solver hashes ([`architecture/labels-and-constraints.md:348-351`](../../architecture/labels-and-constraints.md), [`architecture/solver-contract.md:148-176`](../../architecture/solver-contract.md)).

## 5. Dependency-ordered plan

1. Confirm the rule at decision level: mechanical kebab-casing is the default; explicit semantic mappings override it.
2. Add a canonical mapping table to [`architecture/events.md`](../../architecture/events.md), covering kernel setup events and lifecycle fields.
3. Clarify D18 to state that casing applies after semantic mapping and that identity/lifecycle fields may be excluded or mapped explicitly.
4. Define a common module event-fold contract in [`modules/contract.md`](../../modules/contract.md):
   - identity fields;
   - ordinary fields;
   - semantic aliases;
   - null handling;
   - full-restatement replacement.
5. Update each module document with complete mapping tables:
   - room inventory;
   - workshops;
   - materials;
   - any future setup-event modules.
6. Specify resolver behavior for setup-only keys, semantic references, aliases, nulls, and unknown tags.
7. Implement shared mapping helpers in the kernel fold, with module-specific mapping declarations in each `events.ts`.
8. Add replay and fold tests for every mapping, especially alias pairs and null/reference transitions.
9. Extend KDL fixtures with expected derived labels for:
   - family/person identity;
   - room and bed containment;
   - workshop slot/room references;
   - material links;
   - cancellation and withdrawal reasons.
10. Re-record affected golden outputs only after reviewing semantic diffs and compatibility implications.

## Related files

- [architecture/events.md](../../architecture/events.md)
- [decisions.md](../../../decisions.md)
- [architecture/data-model.md](../../architecture/data-model.md)
- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [profiles/contract.md](../../profiles/contract.md)
- [modules/contract.md](../../modules/contract.md)
- [engineering/testing.md](../../engineering/testing.md)
- [modules/room-inventory.md](../../modules/room-inventory.md)
- [modules/workshops.md](../../modules/workshops.md)
- [modules/materials.md](../../modules/materials.md)
