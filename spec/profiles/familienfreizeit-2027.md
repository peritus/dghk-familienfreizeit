# Familienfreizeit 2027 occasion profile

This is the outstanding occasion-profile specification. Its accompanying
[TypeScript example](familienfreizeit-2027.example.ts) is illustrative: required
builders and modules are not implemented, and the application neither loads nor
typechecks it. Linting the example is not evidence of a working profile.
When profile support works and is verified, put executable configuration in root
`profiles/`, document its delivered behavior in `docs/profiles/`, and retain only
outstanding requirements here.

M2 uses a kernel-only executable fixture while module contributions are introduced.
This complete selected-module profile becomes an executable integration fixture in
M12, after every active module contribution exists.

This is the active occasion profile for DGHK Familienfreizeit. Its
configuration is [`familienfreizeit-2027.ts`](familienfreizeit-2027.example.ts); this document
explains the choices behind it. It selects and configures generic modules; it does
not define a separate application architecture.

## 1. Selected modules

The profile selects these modules ([modules](../modules/contract.md) §5):

| Module | Used for |
|---|---|
| [`room-inventory`](../modules/room-inventory.md) | buildings, rooms, beds, places, and capacity |
| [`room-assignment`](../modules/room-assignment.md) | deterministic placement, keep-apart relations, and the board |
| [`workshop-space`](../modules/workshop-space.md) | physical workshop spaces, capacity, availability, ordering, and resolver capabilities |
| [`programme-core`](../modules/programme-core.md) | shared programme-session identity and scheduleable-session boundary |
| [`official-workshops`](../modules/official-workshops.md) | organiser-authored official workshops, audience, and person-to-workshop leadership |
| [`workshop-scheduling`](../modules/workshop-scheduling.md) | configured slots, offerings, placement, and schedule release |
| [`workshop-rankings`](../modules/workshop-rankings.md) | ordered per-person workshop rankings |
| [`workshop-assignment`](../modules/workshop-assignment.md) | eligibility, capacity, cancellation, and fairness |
| [`family-preferences`](../modules/family-preferences.md) | the family preferences page |

Food preferences, materials, call-for-papers, self-organized sessions, and
change-notifications are deferred under [M16](../roadmap.md#m16--deferred-sleeping-modules-and-features).

## 2. Room inventory

The occasion inventory contains 38 rooms and 162 beds. Prices below are per bed for
both occasion days. `private` means sanitary facilities in the room or apartment;
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

### Inventory representation

The inventory is event data entered through [room inventory](../modules/room-inventory.md)
events, not profile configuration. Each source location is a building
(`Haupthaus`, `Gartenhaus`, `Blockhaus`, `Bungalow`, `Schlaffass`); room numbers
become `RoomAdded.number`; each bed carries the `sleeps` count the hostel lists,
so a double bed provides two places. Rooms 35–37 are `apartment`
rooms whose sleeping rooms are recorded as labels.

Module-owned keys and parameters:

| Key | Values in this profile |
|---|---|
| `room-type` | `standard`, `apartment`, `bungalow`, `schlaffass` |
| `floor` | `ground`, `first`, `second`; none for bungalow and Schlaffass rooms |
| `bed-type` | `single`, `double` |

Profile room traits:

| Trait | Builder | Values | Use |
|---|---|---|---|
| `sanitary` | property | `private`, `shared-floor`, `remote-shared` | sanitary arrangement |
| `is-accessible` | property | boolean, default `false` | accessibility fact |
| `price-per-bed-eur` | property | `88.50` or `103.00` | cost overview; organiser-only; never scored |
| `sleeping-rooms` | property | `2` for rooms 35–37, default `1` | apartment layout |
| `beds-per-sleeping-room` | property | `4` for rooms 35 and 37; `2` for room 36 | preserves the source `2×4` / `2×2` layout |
| `has-common-room` | property | `true` for rooms 35–37 | apartment layout |
| `suitable-for-two-families` | property | `true` for rooms 35–37 | descriptive; not a placement rule |

Room capacity is the module's place count, not a trait.

Derived capabilities are resolver projections, never assigned:

| Capability | Derived from |
|---|---|
| `private-sanitary` | `sanitary = private` |
| `ground-floor` | `floor = ground` |
| `accessible` | `is-accessible = true` |
| `multi-room-unit` | `sleeping-rooms > 1` |

At full occupancy, the inventory represents 100 beds at 88.50 € and 62 beds at
103.00 €, or 15,236.00 € total for both days. This is a capacity calculation,
not a booking or billing rule.

## 3. Workshop-space inventory

Workshop spaces are independent occasion data. The profile selects
[`workshop-space`](../modules/workshop-space.md) alongside `programme-core`,
`official-workshops`, and `workshop-scheduling`, while
[`room-inventory`](../modules/room-inventory.md) remains solely the selected
accommodation inventory. A workshop space is not a room, bed, place, or
building, and no workshop event names an accommodation room.

The organiser records each space's display name, location description, physical
capacity, event-backed availability windows, and deterministic order. Generic
resolver labels may describe capabilities such as `accessible` or `outdoor`
without adding a profile-specific capability vocabulary. The active profile
does not yet expose these physical facts to families: the schedule and release
contract remains an Issue 025 responsibility.

The profile composition contract includes these independent fixtures:

| Fixture | Selected modules | Purpose |
|---|---|---|
| `workshop-spaces-only` | `workshop-space`, `programme-core`, `official-workshops`, `workshop-scheduling` | Workshop spaces and programme facts without accommodation inventory |
| `accommodation-only` | `room-inventory`, `room-assignment` | Accommodation remains valid without workshops or workshop spaces |
| `familienfreizeit-2027` | Both inventories plus the selected workshop modules | Full occasion composition with independent physical boundaries |

## 4. People and room vocabulary

| Trait | Builder | Scope | Semantics |
|---|---|---|---|
| `role` | property | person | `adult`, `child`, or `infant`; stated in `PersonAdded`, not derived from birthdate |
| `does-not-need-a-bed` | property | person | default `false`; when true the person has no bed demand but remains in the family's placement unit; children and infants only |
| `needs-private-sanitary` | requirement | family | satisfied by `private-sanitary`; weight 6; family-facing "Eigenes Bad" |
| `needs-accessible` | requirement | family, person | satisfied by `accessible`; weight 8; family-facing; placed first |
| `needs-ground-floor` | requirement | family, person | satisfied by `ground-floor`; weight 4; organiser-only |
| `needs-apartment` | requirement | family | satisfied by `multi-room-unit`; preferred only; weight 4; organiser-only |
| `sole-occupancy` | requirement | family | structural check `no-other-families`; penalty −12; family-facing, inverted as "Zimmer teilen" |
| `apart-from` | relation | family, person | `separates-from`, implied-mutual; penalty −20; organiser-only and restricted |
| `family-note` | property | family | free text the family writes and organisers read |
| `organiser-note` | note | family, person, room, workshop | organiser-only, restricted; the solver never reads it |

Requirement controls write the profile trait key directly. For example, a
required accessible-room preference is the `LabelSet` form
`key=needs-accessible value=accessible strength=required`; the resolver uses the
trait's `satisfied_by` metadata to match the derived `accessible` capability.
It is not stored as `key=needs value=accessible`.

Keep-apart relations are never visible to families, which is why `apart-from` is
both organiser-only and restricted. Cross-family co-rooming belongs to the
separate sleeping-parties module.

## 5. Deferred food preferences

The food-preferences contract remains specified, but this active profile does not
select it and therefore defines no diet or allergy traits.

## 6. Room policy

| Module | Parameter | Value | Why |
|---|---|---|---|
| `room-assignment` | `weights` | exact fit 10, near fit 4, orphan bed −8 | module defaults; tune with `npm run tune` |
| | `keep_apart_trait` | `apart-from` | |
| | `priority_trait` | `needs-accessible` | accessible needs claim scarce places first |
| | `scarce_capabilities` | `accessible: −3` | use accessible rooms for others only when it helps |
| | `max_repair_passes` | `5` | module default |

Trait weights and penalties (§3) and these parameters are starting values; changing
them is a deployment, reviewed through the plan diff before communicating.

## 7. Workshop policy

| Module | Parameter | Value |
|---|---|---|
| `official-workshops` | `audience_trait` | `workshop-audience` (`children`, `adults`; organiser-only) |
| | `leader_trait` | `leads-workshop` (zero or more workshops per person) |
| | `leaders_consume_capacity` | `false` |
| | `require_leader` | `false` |
| | `excluded_roles` | `infant` |
| | `audience_rules` | `children` → `child`; `adults` → `adult` |
| `workshop-rankings` | `ranking_trait` | `prefers-workshop` |
| | `max_rank` | `3` |
| | `allow_no_preference` | `true` |
| `workshop-assignment` | `objectives` | fewest people without a top-2 choice, then fewest without any choice, then most rank weight |
| | `top_n`, `rank_weights` | `2`, `[3, 2, 1]` |
| | `fill_unassigned` | `true` |

Children may lead workshops. Leadership does not consume participant capacity, and
not every children's workshop needs a leader.

Workshops explicitly choose `assigned`, `sign-up` or `interest` in their setup
events. Module-owned `signed-up-for` and `interested-in` labels are placed in the
workshops section through `module_controls`; the profile does not redefine them
as traits. Shared age/audience policy applies to all participation modes. Workshop
controls show the workshop deadline as an advisory notice; families may still
change them after it, and organisers can review and publish a later plan when
appropriate.

The active kernel [release-control contract](../application/release-control.md) governs
accommodation, per-workshop details and per-slot solver allocations. Family inputs
and permitted participation stay live. Draft programme details do not
change family admission before communication. This profile enables all three scope
kinds through its selected modules; release policy is not executable runtime config.

## 8. Deferred materials

The materials contract remains specified, but this active profile does not select
it. Material requests, commitments, and workshop-linked coordination are deferred.

## 9. Metadata, copy, and notifications

The occasion runs from `2027-04-30` through `2027-05-02`, inclusive; family-facing
German dates are 30.04.2027 to 02.05.2027. Ages are computed at `2027-04-30`.

The accommodation deadline is `2027-03-31T21:59:59Z` and the workshop deadline is
`2027-04-15T21:59:59Z`; both are displayed in `Europe/Berlin` time. They are
advisory workflow dates, not write barriers. Families can continue to update their
preferences after either date. Organisers decide whether late changes should be
included in a newly reviewed and published plan; an existing published plan does
not change automatically.

Family-facing copy is German with an English fallback and follows the
[German translation guidelines](../ui/german-translation-guidelines.md). The
preferences page has three active sections: who is coming, room wishes, and
workshops. Cross-family sharing wishes belong to the separate sleeping-parties module.

Authentication emails remain active for magic-link access. Arrangement-change and
communication emails are deferred with `change-notifications`; release control
still owns visibility and recipient previews independently of delivery.

## 10. First-deployment boundary

The profile is deployed separately with its own database and operational
configuration. It does not introduce runtime tenancy or require unused room or
workshop surfaces when a module is absent from another occasion profile.
