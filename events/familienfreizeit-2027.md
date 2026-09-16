# Familienfreizeit 2027 event profile

This is the first deployed event profile for Bettenplan. It selects and
configures generic room and workshop modules; it does not define a separate
application architecture.

## 1. Selected modules

The profile enables:

- event log, labels, constraints, plans, publication, authentication, and shared
  UI modules;
- room inventory with buildings, rooms, beds, places, and capacity;
- sleeping-party formation and deterministic room assignment;
- children’s rooms with event-configured age bands, opt-in, minimum occupancy,
  and family fallback;
- co-rooming and keep-apart relations;
- workshop slots and workshops;
- ordered per-person workshop rankings;
- workshop age eligibility, capacity, cancellation, fairness, and co-assignment;
- food preferences with one per-person diet value and optional allergy text;
- admin board, family portal, notifications, and constraint health.

Room adjacency is not selected for the first deployment. The generic extension
point remains available for a later profile decision.

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
| `room_type` | room, bungalow, or tent |
| `floor` | room floor |
| `designation` | general, child, staff, or blocked room |
| `child_min_age` / `child_max_age` | children’s-room age band |
| `has_ensuite` | room bathroom fact |
| `is_outside` | indoor/outdoor room fact |
| `is_accessible` | accessibility fact |
| `role` | adult, child, or infant |
| `occupies_bed` | whether a person consumes a place |
| `needs_accessible` | accessibility requirement fact |
| `room_with` | co-room relation |
| `apart_from` | keep-apart relation |
| `child_room_ok` | per-child opt-in |
| `sole_occupancy` | do-not-share requirement |
| `workshop_with` | workshop co-assignment relation |
| `prefers_workshop` | ordered workshop choice |
| `called_them` | descriptive admin note |

The profile may derive generic capabilities such as `indoor`, `ensuite`,
`ground_floor`, and `accessible` from those properties. It configures the generic
resolver rather than adding new resolver operators.

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

The profile uses family residue parties, child-room allocation before party
formation, strictest-strength requirement inheritance, mutual-required co-room
merging, one-sided soft co-room preferences, keep-apart constraints, and
deterministic greedy placement with bounded repair.

Required and preferred room requirements use the generic strength model. Concrete
weights, age bands, minimum child-room occupancy, room designations, and capacity
values are profile parameters.

## 6. Workshop policy

The profile uses one ordered ranking per person and slot. Workshop assignment
uses the generic ordered-choice and fairness mechanisms with these event policies:

- minimize people receiving none of their top two choices;
- then minimize people receiving none of their choices;
- then maximize total rank satisfaction;
- enforce age eligibility and capacity;
- cancel under-subscribed workshops according to configured minimum capacity;
- support configured co-assignment groups.

## 7. Profile metadata and copy

The profile supplies the actual event name, date, preference deadline, locale,
public description, family-facing labels, admin-facing labels, and email copy.
These values are event configuration and are included in the configuration hash.

For this deployment, the event runs from `2027-04-30` through `2027-05-02`,
inclusive. The user-facing German dates are 30.04.2027 to 02.05.2027.

## 8. First-deployment boundary

The profile is deployed separately with its own database and operational
configuration. It does not introduce runtime tenancy or require unused room or
workshop surfaces when a module is absent from another event profile.
