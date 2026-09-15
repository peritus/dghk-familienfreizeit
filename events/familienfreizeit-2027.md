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
- admin board, family portal, notifications, and constraint health.

Room adjacency is not selected for the first deployment. The generic extension
point remains available for a later profile decision.

## 2. Event vocabulary

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

## 3. Room policy

The profile uses family residue parties, child-room allocation before party
formation, strictest-strength requirement inheritance, mutual-required co-room
merging, one-sided soft co-room preferences, keep-apart constraints, and
deterministic greedy placement with bounded repair.

Required and preferred room requirements use the generic strength model. Concrete
weights, age bands, minimum child-room occupancy, room designations, and capacity
values are profile parameters.

## 4. Workshop policy

The profile uses one ordered ranking per person and slot. Workshop assignment
uses the generic ordered-choice and fairness mechanisms with these event policies:

- minimize people receiving none of their top two choices;
- then minimize people receiving none of their choices;
- then maximize total rank satisfaction;
- enforce age eligibility and capacity;
- cancel under-subscribed workshops according to configured minimum capacity;
- support configured co-assignment groups.

## 5. Profile metadata and copy

The profile supplies the actual event name, date, preference deadline, locale,
public description, family-facing labels, admin-facing labels, and email copy.
These values are event configuration and are included in the configuration hash.

## 6. First-deployment boundary

The profile is deployed separately with its own database and operational
configuration. It does not introduce runtime tenancy or require unused room or
workshop surfaces when a module is absent from another event profile.
