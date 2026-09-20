---
id: "017"
title: Requirement/capability resolver representation is underspecified
status: open
severity: gap
category: kernel
source: issue-5-requirement-capability-resolver (pre-existing)
related_decisions: [D18]
related_files:
  - ../architecture/data-model.md
  - ../architecture/events.md
  - ../architecture/labels-and-constraints.md
  - ../architecture/solver-contract.md
  - ../profiles/contract.md
  - ../modules/contract.md
  - ../modules/room-assignment.md
  - ../modules/workshops.md
  - ../modules/workshop-assignment.md
  - ../profiles/familienfreizeit-2027.md
  - ../profiles/familienfreizeit-2027.example.ts
opened: 2026-09-19
---

# Requirement/capability resolver representation is underspecified

## Problem summary

The current specification uses a mixed representation whose compilation boundary
is underspecified.

Profile tags are not all stored as literal `needs`/`provides` rows. Profile
requirements and capabilities use profile tag keys, while free-form organiser
decisions use literal generic `needs` and `provides` keys. The documents imply
that the profile vocabulary is compiled into the generic resolver, but they do
not define that compilation precisely enough for event storage, append
validation, derived-world construction, solver input, fixtures, or UI behavior
to be implemented consistently.

The concrete issue is visible in the relationship between:

- `needs-private-sanitary` → `private-sanitary`;
- `needs-accessible` → `accessible`;
- `sanitary=private` → derived `private-sanitary`;
- `is-accessible=true` → derived `accessible`;
- generic organiser decisions such as `needs=naehe_zum_eingang` and
  `provides=naehe_zum_eingang`.

The active profile appears to intend that profile requirements are stored under
their profile-specific keys, while the generic examples in the resolver
documents use `needs` and `provides`. The resolver pipeline between those forms
is implied but not specified.

## 1. Current representation

### Properties are stored directly as labels

Room facts are ordinary labels:

```text
sanitary=private
is-accessible=true
floor=ground
```

The relevant profile properties are defined in
`../profiles/familienfreizeit-2027.example.ts` and documented in
`../profiles/familienfreizeit-2027.md`:

- `sanitary` is a room property with values `private`, `shared-floor`, and
  `remote-shared`.
- `is-accessible` is a room boolean property with default `false`.
- `floor` is a module-owned room property.
- `sleeping-rooms` is a room integer property with default `1`.

### Derived capabilities are not stored

The active profile declares these resolver projections:

| Capability | Derived from |
|---|---|
| `private-sanitary` | `sanitary = private` |
| `ground-floor` | `floor = ground` |
| `accessible` | `is-accessible = true` |
| `multi-room-unit` | `sleeping-rooms > 1` |

The capability builders use `derive` functions. The profile documentation says
these capabilities are resolver projections and are never assigned directly.
This is consistent with the generic rule that a capability is derived or
assigned, never both.

### Profile requirements appear intended to be stored under their profile keys

The active profile declares:

```ts
'needs-private-sanitary': requirement({
  scopes: ['family'],
  satisfied_by: 'private-sanitary',
  strengths: ['required', 'preferred'],
  weight: 6,
})

'needs-accessible': requirement({
  scopes: ['family', 'person'],
  satisfied_by: 'accessible',
  strengths: ['required', 'preferred'],
  weight: 8,
})
```

The D18 example in `../../decisions.md` makes the intended event encoding
explicit:

```kdl
LabelSet entity_id=fam_mueller key=needs-private-sanitary value=private-sanitary strength=preferred
```

Under this apparent encoding, a profile requirement is a direct label whose key
is the profile requirement tag and whose value names the provider capability.
The `satisfied_by` field is profile metadata that connects the requirement to
the capability; it is not itself a stored second label.

### Free-form organiser matching uses generic keys

The generic resolver examples use literal generic keys:

```text
fam_42 needs=naehe_zum_eingang (required)
rm_07  provides=naehe_zum_eingang
```

These values are organiser-supplied matching tokens. They are not declared
profile tags, do not need profile copy, and do not require a `ConstraintDefined`
event when they use an existing fixed resolver mechanism.

### Overall conclusion

The current model is mixed:

- Profile requirements/capabilities: direct profile tag keys, compiled through
  tag metadata.
- Derived capabilities: resolver projections, never persisted as labels.
- Free-form organiser matching: generic `needs`/`provides` labels.
- Aliases: supported by the profile contract, but none are used by this profile
  and no alias behavior resolves the representation discrepancy.

## 2. Contradictions and undocumented boundaries

1. **Generic examples conflict with the active profile model.**

   `../architecture/labels-and-constraints.md` and `../architecture/data-model.md` describe:

   ```text
   needs=private-sanitary
   provides=private-sanitary
   ```

   But `../../decisions.md` specifies:

   ```text
   key=needs-private-sanitary value=private-sanitary
   ```

   The documents do not say whether these are equivalent encodings or different
   categories.

2. **Capability materialization is described two ways.**

   `../architecture/labels-and-constraints.md` says a room's capability set is read from
   `provides` labels, but the active profile's capabilities use
   `capability({ derive })` and do not produce `provides` labels.

3. **Solver input names normalized structures without defining them.**

   `../architecture/solver-contract.md` names `capabilities` and `constraints` in
   `SolverInput`, but does not define the normalized shape of a profile
   requirement or explain how `satisfied_by` becomes a solver constraint.

4. **The profile contract defines metadata but not the compiled boundary.**

   `../profiles/contract.md` defines `requirement.satisfied_by`,
   `capability.derive`, and aliases independently, but does not specify the
   compiled representation or resolver stages connecting them.

5. **The event contract documents only generic examples.**

   `../architecture/events.md` says `LabelSet.key` is the resolver mechanism key and gives
   only generic `needs`/`provides` examples. It does not document
   profile-specific requirement keys such as `needs-accessible`.

6. **The family UI does not identify the emitted key/value form.**

   The tri-state control is documented as writing one of two strengths or
   clearing “the label,” but it does not state whether it emits `needs`,
   `needs-accessible`, or another normalized key.

7. **Room assignment consumes an undefined `Requirement` shape.**

   `../modules/room-assignment.md` says it consumes every requirement and capability,
   but its `Requirement` input type is not defined sufficiently to show whether
   it contains the profile tag key, provider capability, or both.

8. **The active profile Markdown documents semantics but not event encoding.**

   The profile table says each requirement is “satisfied by” a capability, but
   does not show the corresponding `LabelSet` event form.

9. **Workshop resolver participation is not fully bounded.**

   `../modules/workshops.md` refers to “applicable required resolver decisions” but
   does not define whether profile requirements participate in workshop
   eligibility through the same normalized mechanism. The active profile
   currently has no workshop needs/provides tags, so this boundary remains
   latent.

10. **Aliases are underspecified in relation to resolver keys.**

    `aliases` are documented as replay mappings, but the profile does not use
    them and no rule says whether an alias normalizes to a profile tag key, a
    generic resolver key, or both.

## 3. Canonical representation and resolver pipeline

The canonical representation should preserve the profile-specific tag keys
already chosen by D18:

```text
LabelSet entity_id=fam_42
         key=needs-accessible
         value=accessible
         strength=required
```

Generic `needs`/`provides` should be reserved for free-form organiser
vocabulary:

```text
fam_42 needs=near-the-entrance
rm_07  provides=near-the-entrance
```

The governing rule should be:

> Profile tag keys are storage vocabulary; resolver operators are compiled
> semantics. A profile requirement key is not itself the generic `needs` key,
> and a derived capability is not stored as a `provides` label.

### Proposed pipeline

1. Events are appended as ordinary `LabelSet` and `LabelCleared` events.

2. The fold stores active labels exactly as written.

3. Profile compilation validates tag definitions and creates normalized
   descriptors:

   - `property` → descriptive fact;
   - `capability` → provider descriptor, assigned or derived;
   - `requirement` → holder descriptor with strengths, weight/penalty, and
     either `satisfied_by` or `structural`;
   - `relation` → fixed relation operator.

4. The resolver builds provider capabilities for each target from:

   - assigned `provides` labels;
   - derived profile capabilities evaluated from property labels;
   - no persisted duplicate for a derived capability.

5. The resolver converts active profile requirement labels into normalized
   requirements containing:

   - source label identity;
   - holder entity;
   - provider capability key;
   - strength;
   - configured weight/penalty;
   - structural check, if applicable.

6. The resolver separately converts generic `needs`/`provides` labels into
   token-matching constraints.

7. The solver receives only the normalized result:

   - `capabilities`;
   - normalized `constraints` / requirements;
   - relevant source labels for traceability.

8. Modules consume normalized requirements and never interpret raw profile tag
   keys themselves.

## 4. Affected documents

### Profile

- `../profiles/contract.md`
- `../profiles/familienfreizeit-2027.md`
- `../profiles/familienfreizeit-2027.example.ts`

### Core model and events

- `../architecture/data-model.md`
- `../architecture/events.md`
- `../architecture/labels-and-constraints.md`
- `../architecture/solver-contract.md`

### Modules

- `../modules/contract.md`
- `../modules/room-inventory.md`
- `../modules/room-assignment.md`
- `../modules/workshops.md`
- `../modules/workshop-assignment.md`

### Validation and fixtures

- `../engineering/testing.md`
- Profile KDL fixtures under `test/fixtures/event-logs/`
- Profile validation tests and golden-plan expectations

### UI

- `../ui/screens/family-preferences.md`
- `../ui/screens/family-detail.md`
- `../ui/screens/inventory.md`
- `../ui/screens/constraints.md`
- `../application/organiser-view.md`

The canonical example in `../../decisions.md` must also remain aligned with the
chosen representation.

## 5. Dependency-ordered implementation/documentation plan

1. Specify the distinction between profile tag keys and generic resolver keys.

2. Define the compiled profile descriptor types for properties, capabilities,
   requirements, relations, and aliases.

3. Define the exact `LabelSet` encoding for profile requirements and assigned
   capabilities.

4. Define resolver capability materialization, including derived and assigned
   providers.

5. Define normalized requirement/constraint shapes in the solver contract.

6. Document append and replay validation for:

   - profile requirement keys;
   - generic `needs`/`provides`;
   - derived-capability assignment rejection;
   - aliases;
   - scope and `satisfied_by` compatibility.

7. Update module contracts, especially room assignment and workshop assignment,
   to consume normalized resolver output.

8. Update profile and module validation tests.

9. Add fixture cases covering:

   - required and preferred profile requirements;
   - derived capability satisfaction;
   - rejection of direct assignment to derived capabilities;
   - generic free-form `needs`/`provides`;
   - clearing and replay;
   - mixed profile and generic constraints.

10. Update family and organiser UI specifications to show the emitted key/value
    form while retaining human-facing labels.

11. Re-record affected golden plans only after the representation and solver
    input contract are fixed.

## Source documents reviewed

- `../architecture/data-model.md`
- `../architecture/events.md`
- `../architecture/labels-and-constraints.md`
- `../architecture/solver-contract.md`
- `../profiles/contract.md`
- `../modules/contract.md`
- `../modules/room-assignment.md`
- `../modules/workshops.md`
- `../profiles/familienfreizeit-2027.md`
- `../profiles/familienfreizeit-2027.example.ts`
- `../../decisions.md`
- `../engineering/testing.md`
- `../modules/room-inventory.md`
- `../modules/workshop-assignment.md`
- `../application/organiser-view.md`
- `../ui/screens/family-preferences.md`
- `../ui/screens/family-detail.md`
- `../ui/screens/inventory.md`
- `../ui/screens/constraints.md`
