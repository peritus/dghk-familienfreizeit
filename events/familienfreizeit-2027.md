# Familienfreizeit 2027 event profile

This is the first deployed event profile for DGHK Familienfreizeit. It selects and
configures generic room, workshop, food-preferences, and materials modules; it
does not define a separate application architecture.

## 1. Selected modules

The profile enables:

- event log, labels, constraints, plans, publication, authentication, and shared
  UI modules;
- room inventory with buildings, rooms, beds, places, and capacity;
- sleeping-party formation and deterministic room assignment;
- children’s rooms with explicit child-group capabilities and minimum occupancy,
  and family fallback;
- co-rooming and keep-apart relations;
- workshop slots and workshops;
- ordered per-person workshop rankings;
- workshop age eligibility, capacity, cancellation, fairness, and co-assignment;
- workshop audience and person-to-workshop leadership;
- food preferences with one per-person diet value and optional allergy text;
- materials contributed by families and linked to workshops;
- admin board, family portal, notifications, and constraint health.

Room adjacency is not selected for the first deployment. The generic extension
point remains available.

## 2. Room inventory

The event inventory contains 38 rooms and 162 beds. Prices below are per bed for
both event days. `private` means sanitary facilities in the room or apartment;
`shared-floor` means shared facilities on the floor; `remote-shared` means shared
facilities in a neighbouring building.

| Room(s) | Price/bed | Beds | Sanitary | Location / notes |
|---|---:|---:|---|---|
| 1 | 88.50 € | 5 | shared-floor | Haupthaus, 1st floor |
| 2 | 88.50 € | 8 | shared-floor | Haupthaus, 1st floor |
| 3 | 88.50 € | 8 | shared-floor | Haupthaus, 1st floor |
| 4 | 88.50 € | 2 | shared-floor | Haupthaus, 1st floor |
| 5 | 88.50 € | 2 | shared-floor | Haupthaus, 1st floor |
| 6 | 88.50 € | 2 | shared-floor | Haupthaus, 1st floor |
| 7 | 88.50 € | 6 | shared-floor | Haupthaus, 1st floor |
| 8 | 103.00 € | 2 | private | Haupthaus, 1st floor |
| 9 | 103.00 € | 2 | private | Haupthaus, 1st floor |
| 10 | 88.50 € | 6 | shared-floor | Haupthaus, 1st floor |
| 11 | 88.50 € | 7 | shared-floor | Haupthaus, 1st floor |
| 12 | 88.50 € | 5 | shared-floor | Haupthaus, 2nd floor |
| 14 | 88.50 € | 4 | shared-floor | Haupthaus, 2nd floor |
| 15 | 88.50 € | 4 | shared-floor | Haupthaus, 2nd floor |
| 16 | 88.50 € | 5 | shared-floor | Haupthaus, 2nd floor |
| 17 | 103.00 € | 2 | private | Haupthaus, 2nd floor |
| 18 | 103.00 € | 2 | private | Haupthaus, 2nd floor |
| 19 | 88.50 € | 4 | shared-floor | Haupthaus, 2nd floor |
| 20 | 88.50 € | 2 | shared-floor | Haupthaus, 2nd floor |
| 31 | 103.00 € | 2 | private | Gartenhaus, ground floor |
| 32 | 103.00 € | 4 | private | Gartenhaus, ground floor |
| 33 | 103.00 € | 4 | private | Gartenhaus, ground floor |
| 34 | 103.00 € | 4 | private | Gartenhaus, ground floor |
| 35 | 103.00 € | 8 | private | Gartenhaus, 1st floor; source layout `2×4`; apartment with two sleeping rooms and common room; suitable for two friendly families |
| 36 | 103.00 € | 4 | private | Gartenhaus, 1st floor; source layout `2×2`; apartment with two sleeping rooms and common room; suitable for two friendly families |
| 37 | 103.00 € | 8 | private | Gartenhaus, 1st floor; source layout `2×4`; apartment with two sleeping rooms and common room; suitable for two friendly families |
| 41 | 103.00 € | 6 | private | Blockhaus, ground floor |
| 42 | 103.00 € | 6 | private | Blockhaus, ground floor |
| 43 | 103.00 € | 4 | private | Blockhaus, ground floor |
| 44 | 103.00 € | 4 | private | Blockhaus, ground floor |
| 51 | 88.50 € | 4 | remote-shared | Bungalow |
| 52 | 88.50 € | 2 | remote-shared | Bungalow |
| 61 | 88.50 € | 4 | remote-shared | Schlaffass |
| 62 | 88.50 € | 4 | remote-shared | Schlaffass |
| 63 | 88.50 € | 4 | remote-shared | Schlaffass |
| 64 | 88.50 € | 4 | remote-shared | Schlaffass |
| 65 | 88.50 € | 4 | remote-shared | Schlaffass |
| 66 | 88.50 € | 4 | remote-shared | Schlaffass |

The source inventory intentionally has no room 13; room numbering is preserved
as supplied. The source descriptors are retained in the normalized record:
`Etagendusche`, `mit Sanitär`, `Sanitär im Nebengebäude`, `Haupthaus`,
`Gartenhaus`, `Blockhaus`, `Bungalow`, and `Schlaffass`. Apartment capacities
are normalized from `2×4` and `2×2` sleeping rooms to 8 and 4 beds respectively.

### Room tags

The inventory uses event-specific tags and derives reusable room capabilities
from them:

| Tag | Values or derivation | Use |
|---|---|---|
| `room_type` | `standard`, `apartment`, `bungalow`, `schlaffass` | Event vocabulary for accommodation type |
| `building` | `Haupthaus`, `Gartenhaus`, `Blockhaus`, or null | Location and grouping |
| `floor` | `ground`, `1`, `2`, or null | Location; `ground` can derive `ground-floor` |
| `sanitary` | `private`, `shared-floor`, `remote-shared` | Event vocabulary for sanitary arrangement |
| `price_per_bed_eur` | `88.50` or `103.00` | Price information; not a solver preference by default |
| `bed_capacity` | derived from beds and apartment layouts | Atomic room capacity |
| `sleeping_rooms` | `2` for rooms 35–37, otherwise `1` where applicable | Apartment layout |
| `beds_per_sleeping_room` | `4` for rooms 35 and 37; `2` for room 36 | Preserves the source `2×4` / `2×2` structure |
| `has_common_room` | `true` for rooms 35–37 | Apartment layout |
| `suitable_for_two_families` | `true` for rooms 35–37 | Descriptive event fact, not an automatic placement rule |

Derived capabilities such as `private-sanitary`, `ground-floor`, and
`multi-room-unit` are resolver projections, not additional authoritative room
properties. The event profile decides which of them are exposed as preferences
or hard requirements.

At full occupancy, the inventory represents 100 beds at 88.50 € and 62 beds at
103.00 €, or 15,236.00 € total for both days. This is a capacity calculation,
not a booking or billing rule.

## 3. Event vocabulary

The profile defines concrete property and relationship tags, including:

| Tag | Purpose |
|---|---|
| `designation` | general, child, staff, or blocked room |
| `is_accessible` | accessibility fact |
| `role` | adult, child, or infant |
| `does_not_need_a_bed` | explicit exception to the default bed demand |
| `needs_accessible` | accessibility requirement fact |
| `room_with` | co-room relation |
| `apart_from` | keep-apart relation |
| `provides_child_group` | room capability naming a child group |
| `needs_child_group` | child requirement naming a child group |
| `sole_occupancy` | do-not-share requirement |
| `workshop_with` | workshop co-assignment relation |
| `workshop_audience` | `children` or `adults` participation audience |
| `leads_workshop` | person-to-workshop leadership relation; zero or more leaders |
| `prefers_workshop` | ordered workshop choice |

`room_type`, `building`, and `floor` are already defined by the room inventory's
room-tag vocabulary above. This table lists only additional event vocabulary.
The child-group labels use the generic `needs-provides` resolver operator:
rooms provide a stable child-group entity and children need that same entity.
There is no age-band or opt-in rule.

### Tag semantics

| Tag | Applies to | Semantics |
|---|---|---|
| `designation` | room | Declares whether a room is `general`, `child`, `staff`, or `blocked`; blocked rooms require a reason. |
| `is_accessible` | room | States that the room provides the configured accessibility capability. |
| `role` | person | States `adult`, `child`, or `infant`; it is supplied data, not derived from birthdate. |
| `does_not_need_a_bed` | person | Defaults to false. When true, the person contributes no bed demand while remaining part of the family and other assignments. |
| `needs_accessible` | person or family | Requires or prefers an accessible room, according to label strength. |
| `room_with` | family or person | Requests co-rooming with another stable entity; required values form a group, preferred values remain soft. |
| `apart_from` | family or person | Requires or prefers separation from another stable entity; it conflicts with a required `room_with`. |
| `provides_child_group` | child room | Names the stable child-group capability that this room offers. |
| `needs_child_group` | child | Names the stable child group whose room capability the child requires. |
| `sole_occupancy` | family or person | Requires that the resulting room or sleeping unit contain no unrelated occupants. |
| `workshop_with` | person | Requests co-assignment with another person for a workshop slot; required values form a group. |
| `workshop_audience` | workshop | Restricts participation to the configured audience, here `children` or `adults`. |
| `leads_workshop` | person | Records that a person leads a workshop; zero or more leaders are allowed, including children. |
| `prefers_workshop` | person | Stores an ordered workshop ranking scoped to one slot. |

`needs_accessible`, `room_with`, `apart_from`, `sole_occupancy`, and
`workshop_with` use the generic required/preferred strength model. The two
child-group tags are a `needs-provides` match: a child requires the group and a
child room provides it. They are not an age rule, an opt-in flag, or a free-form
note.

## 4. Food preferences

The generic `foodPreferences` module is enabled for this event. Its authoritative
data is attached to each person, not to the family: every person has exactly one
configured `diet` value, and may have one `allergies_text` value.

| Label | Scope | Values or format | Cardinality |
|---|---|---|---|
| `diet` | person | `vegetarian`, `vegan`, `carnivore`, or `pesco-vegetarian` | exactly one |
| `allergies_text` | person | free text, retained as entered | zero or one |

`pesco-vegetarian` is an explicit event-configured vocabulary value. Diet is
mutually exclusive; a person cannot carry multiple diet values. Allergy text is
independent of diet and preserves quantities and wording from the source data,
for example `1 x Eier` or `2x Beifuß (sehr starke Allergie)`.

Family-level food tables are derived projections: they count persons by diet
and count persons with non-empty `allergies_text`. They are not an alternative
authoritative family-level model. The supplied source rows do not include
family names, so this profile records the model and vocabulary without
inventing person or family assignments.

## 5. Room policy

The profile uses family residue parties, child-group allocation before party
formation, strictest-strength requirement inheritance, mutual-required co-room
merging, one-sided soft co-room preferences, keep-apart constraints, and
deterministic greedy placement with bounded repair.

Required and preferred room requirements use the generic strength model. Concrete
weights, child-group assignments, minimum child-room occupancy, room
designations, and capacity values are profile parameters.

## 6. Workshop policy

The profile uses one ordered ranking per person and slot. Workshop assignment
uses the generic ordered-choice and fairness mechanisms with these event policies:

- minimize people receiving none of their top two choices;
- then minimize people receiving none of their choices;
- then maximize total rank satisfaction;
- enforce age eligibility and capacity;
- cancel under-subscribed workshops according to configured minimum capacity;
- support configured co-assignment groups;
- classify workshops as `children` or `adults` for participation eligibility;
- allow zero or more leaders for children’s workshops, including child leaders.

Leadership does not consume participant capacity unless configured separately.
The profile does not require every children’s workshop to have a leader.

## 7. Materials

The generic `materials` module is enabled for this event. Its configured
categories and labels are:

| Category | Meaning |
|---|---|
| `snacks` | food and drinks brought for shared use |
| `games` | games and play materials |
| `material` | other equipment or workshop supplies |

Families and workshops may request materials. Families and persons may commit
to bringing them. Requests and commitments may be general event records or
linked to a workshop; a workshop-linked request may additionally identify the
child it concerns.

The event uses free-text quantities and descriptions, preserving entries such as
`2-3 Packs`, `5 Liter`, and `4x`. The generic `fulfills` relation explicitly
connects commitments to requests; withdrawing a commitment leaves the request
open for another contributor.

The event profile can represent examples such as snacks, apple juice, napkins,
reusable or disposable tableware, an espresso machine with its safety inspection
note and accessories, and workshop-specific supplies such as paint or textile
markers. The supplied examples do not contain a complete normalized family or
person mapping, so they define event data shape rather than creating invented
assignments.

## 8. Profile metadata and copy

The profile supplies the actual event name, date, preference deadline, locale,
public description, family-facing labels, admin-facing labels, and email copy.
These values are event configuration and are included in the configuration hash.

For this deployment, the event runs from `2027-04-30` through `2027-05-02`,
inclusive. The user-facing German dates are 30.04.2027 to 02.05.2027.

## 9. First-deployment boundary

The profile is deployed separately with its own database and operational
configuration. It does not introduce runtime tenancy or require unused room or
workshop surfaces when a module is absent from another event profile.
