# Familienfreizeit 2027 occasion profile

This document retains the outstanding occasion-profile requirements. The
implemented runtime profile is
[`src/config/profiles/familienfreizeit-2027.ts`](../../src/config/profiles/familienfreizeit-2027.ts)
and its delivered accommodation behavior is documented in
[implemented room inventory](../../docs/modules/room-inventory.md) and
[implemented room assignment](../../docs/modules/room-assignment.md). The
accompanying TypeScript example remains illustrative for later modules.

The executable profile currently selects the kernel plus `room-inventory` and
`room-assignment`. The remaining selected-module composition becomes an
integration scope for later work after those module contributions exist.

This is the active occasion profile for DGHK Familienfreizeit. Its
configuration is [`familienfreizeit-2027.ts`](familienfreizeit-2027.example.ts); this document
explains the choices behind it. It selects and configures generic modules; it does
not define a separate application architecture. Accepted contracts outside this
composition remain in [deferred scope](../deferred-ideas/README.md).

## 1. Selected modules

The full occasion is intended to select these modules ([modules](../modules/contract.md) §5).
The executable profile selects `room-inventory` and `room-assignment`; the other
rows remain later integration scope:

| Module | Used for |
|---|---|
| [`room-inventory`](../modules/room-inventory.md) | buildings, rooms, beds, places, and capacity |
| [`room-assignment`](../modules/room-assignment.md) | deterministic placement and keep-apart relations; the organiser board remains outstanding |
| [`workshop-space`](../modules/workshop-space.md) | later: physical workshop spaces, capacity, availability, ordering, and resolver capabilities |
| [`programme-core`](../modules/programme-core.md) | later: shared programme-session identity and scheduleable-session boundary |
| [`official-workshops`](../modules/official-workshops.md) | later: organiser-authored official workshops, audience, and person-to-workshop leadership |
| [`workshop-scheduling`](../modules/workshop-scheduling.md) | later: configured slots, offerings, placement, and schedule release |
| [`workshop-rankings`](../modules/workshop-rankings.md) | later: ordered per-person workshop rankings |
| [`workshop-assignment`](../modules/workshop-assignment.md) | later: eligibility, capacity, cancellation, and fairness |
| [`family-preferences`](../modules/family-preferences.md) | later: the family preferences page |

## 2. Room inventory

The inventory portion is implemented and documented in
[implemented room inventory](../../docs/modules/room-inventory.md). The active
profile source is [familienfreizeit-2027.ts](../../src/config/profiles/familienfreizeit-2027.ts)
and its canonical event fixture is
[familienfreizeit-2027.kdl](../../test/fixtures/room-inventory/familienfreizeit-2027.kdl).

The remaining profile sections describe modules and controls that are not yet
selected by the executable profile and belong to later work.
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

## 5. Room policy

| Module | Parameter | Value | Why |
|---|---|---|---|
| `room-assignment` | `weights` | exact fit 10, near fit 4, orphan bed −8 | module defaults; tune with `npm run tune` |
| | `keep_apart_trait` | `apart-from` | |
| | `priority_trait` | `needs-accessible` | accessible needs claim scarce places first |
| | `scarce_capabilities` | `accessible: −3` | use accessible rooms for others only when it helps |
| | `max_repair_passes` | `5` | module default |

Trait weights and penalties (§3) and these parameters are starting values; changing
them is a deployment, reviewed through the plan diff before communicating.

## 6. Workshop policy

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

## 7. Metadata, copy, and notifications

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
preferences page has three sections: who is coming, room wishes, and workshops.
Cross-family sharing wishes belong to the separate sleeping-parties module.

Authentication invitations and reminders use the release-independent family login
workflow. Communication and change emails remain deferred.

## 8. First-deployment boundary

The profile is deployed separately with its own database and operational
configuration. It does not introduce runtime tenancy or require unused room or
workshop surfaces when a module is absent from another occasion profile.
