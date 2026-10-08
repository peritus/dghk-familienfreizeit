# Features

A feature is a capability that a selected module offers to one audience —
families or organisers — and that can be selected by the profile, switched by
deployment, and activated by a phase. Module composition is specified in
[modules](../modules/contract.md); phase activation is specified in
[phases](phases.md).

The organiser-side contract — declaration, composition, availability,
operational bindings, append narrowing, and the M8 feature set — is implemented
and documented in [implemented features](../../docs/architecture/features.md).
The sections below keep their numbers; a delivered section points to its
documentation, and the outstanding family-side requirements remain here.

## 1. Terminology

- **Feature** — a module-owned capability offered to exactly one audience, such
  as families stating room wishes. Its identity is a typed `FeatureId`.
- **Audience** — `family` or `organiser`. The same capability offered to both
  audiences is two features, each with its own id and availability, offered
  through its own variant of the editing components.
- **Feature definition** — the code-owned, typed contract for one feature: owner,
  audience, subject kind, dependencies, phase bindings, readiness, and for a
  family feature its organiser counterpart.
- **Governed section** — a [family preferences](../modules/family-preferences.md)
  section whose profile entry names the feature. The feature governs every control
  in that section — profile-trait controls and module controls alike — in the
  renderer for its audience: the family view for a family feature, organiser
  family detail for an organiser feature.
- **Feature availability** — the derived result of the layers in §4 for one
  feature and principal.
- **Feature view** — the derived set of availability results that a response
  carries to a client.

Organiser workflow actions — authoring, review, opening workshop choice, closing
and reopening an area — are not features. They are always present on the
organiser screens of a selected module.

The word is used in this technical sense only. A physical attribute of a room is a
room **amenity** ("Merkmal" in German copy), a resolver match target is a
**capability** ([labels and constraints](labels-and-constraints.md)), and a
roadmap milestone is a **vertical slice**. Feature copy never appears in
family-facing German text; screens name the concrete action instead.

## 2. Ownership and identity

Delivered: [declaration and governance](../../docs/architecture/features.md#declaration-and-governance).

## 3. Feature definitions

Delivered: [declaration and governance](../../docs/architecture/features.md#declaration-and-governance). A feature must not be declared before a production code path consumes it; this is a design-review obligation, and a declared feature that no section of the profile names governs nothing.

## 4. Effective availability

Delivered: the availability layers, append narrowing, organiser renderer, and organiser parity are documented under [availability](../../docs/architecture/features.md#availability). Outstanding for [M10](../roadmap.md#m10--family-access-and-release-control):

### Families

The family projection contains only family features that are effective for that
family. A feature that is not effective is absent: the family view does not
reveal its existence, timing, or reason. Explaining what comes next to a family
belongs to the phase view, under the
[M10 family projection privacy gate](../roadmap.md#family-projection-privacy-gate).

The family view offers a governed section only while its family feature is effective.

## 5. Composition and validation

Delivered: [declaration and governance](../../docs/architecture/features.md#declaration-and-governance).

## 6. Operational switching

Delivered: [operational bindings](../../docs/architecture/features.md#operational-bindings).

## 7. Administration and diagnostics

Defining features and switching them is a system-administration task, not an
organiser workflow. The organiser feature view carrying every layer is
[delivered](../../docs/architecture/features.md#availability); an organiser
diagnostics screen is accepted but deferred as
[UI-15](../deferred-ideas/feature-availability-ui.md).

## 8. Feature set

The M8 wish features are [delivered](../../docs/architecture/features.md#declaration-and-governance).
Outstanding for [M10](../roadmap.md#m10--family-access-and-release-control):

| Feature id | Audience | Capability | Governs | Requires phases | Readiness |
|---|---|---|---|---|---|
| `room-assignment.family-room-allocation` | family | the closed room allocation | the family room result | — | the area has a closed result |
| `workshop-assignment.family-workshop-allocation` | family | the closed workshop allocation | the family workshop result | — | the area has a closed result |

They and their organiser counterparts are declared with the family
composition, which provides the family result they govern.

## 9. Out of scope

Email and delivery tracking stay outside this contract. Phase definitions, status
derivation, target dates and closing belong to [phases](phases.md).

## 10. Verification

Outstanding with the family projection:

- Family projection tests showing that a non-effective feature is absent.
- Family-view tests showing that a governed section is offered only while its
  family feature is effective.
