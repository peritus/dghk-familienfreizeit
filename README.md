# DGHK Familienfreizeit — modular event planning

## Reading order

| # | Document | What it settles |
|---|---|---|
| 01 | [Architecture](01-architecture.md) | Kernel and modules, request lifecycle, and boundaries |
| 02 | [Data model](02-data-model.md) | Generic identity, labels, relationships, and projections |
| 03 | [Event model](03-events.md) | Generic event envelope, replay, and lifecycle |
| 04 | [Labels and constraints](04-labels-and-constraints.md) | Tag vocabulary, resolver operators, and validation |
| 05 | [Solver contract](05-solver-contract.md) | Determinism contract, solver input, pipeline, rules, and trace |
| 09 | [Organiser view](09-organiser-view.md) | Organisation-team surfaces and module-provided screens |
| 10 | [Family view](10-family-view.md) | Family-facing controls, privacy, and family workflows |
| 11 | [Authentication](11-authentication.md) | Magic links, sessions, and threat model |
| 12 | [Frontend](12-frontend.md) | Rendering, enhancement, styling, and board island |
| 13 | [Deployment](13-deployment.md) | One profile per deployment, migrations, secrets, and email |
| 14 | [Testing](14-testing.md) | Determinism tests, module contracts, and event fixtures |
| 15 | [Roadmap](15-roadmap.md) | Delivery milestones and cut lines |
| 16 | [Occasion profiles](16-occasion-profiles.md) | Profile contract and configuration rules |
| 17 | [Decisions](17-decisions.md) | Architectural decisions and their accepted alternatives |
| 18 | [German translation guidelines](18-german-translation-guidelines.md) | Family-facing terminology and translation rules |
| 19 | [Reports](19-reports.md) | Report catalogue, audience scopes, responsive behavior, and print stylesheets |
| 20 | [Modules](20-modules.md) | Module contract, composition, and catalogue |
| 20.1 | [Room inventory](20.1-room-inventory.md) | Buildings, rooms, beds, places, designations, and capacity |
| 20.3 | [Room assignment](20.3-room-assignment.md) | Deterministic placement, room scoring, and the board |
| 20.4 | [Workshops](20.4-workshops.md) | Slots, workshops, audience, leadership, and cancellation |
| 20.5 | [Workshop rankings](20.5-workshop-rankings.md) | Ordered per-person workshop choices |
| 20.6 | [Workshop assignment](20.6-workshop-assignment.md) | Fair workshop assignment and co-assignment groups |
| 20.7 | [Food preferences](20.7-food-preferences.md) | Per-person diet and allergy text |
| 20.8 | [Materials](20.8-materials.md) | Requests, commitments, and fulfilment |
| 20.9 | [Family preferences](20.9-family-preferences.md) | The profile-driven preferences page and control union |
| 20.10 | [Change notifications](20.10-change-notifications.md) | Publication and change emails |

Ideas that are not part of the specification are kept in

[`deferred-ideas/`](deferred-ideas/), including sleeping parties, child rooms, and
the party-review screen.

## What this is

A small web application composed from reusable occasion modules. A deployment
selects one occasion profile, which may assign people to rooms, workshops, or both.
The first deployed profile is `familienfreizeit-2027`.

Families state preferences. They never assign anything. A deterministic
algorithm produces a complete proposal. Organisers review it, add decisions where
their judgement should guide the result, and publish. Decisions are recorded with
an optional note so other organisers can understand them.

## The shape of the problem

Three things make this harder than a seating chart:

**The assignable unit is not the family.** Two friendly families may share an
apartment, while grandparents travelling with a family want a room of their own.
The unit that must stay together is derived from stated preferences and organiser
decisions, not from the family structure. We call it a
*party*, and forming parties correctly is a separate problem from placing them.

**Preferences conflict and the conflicts are not symmetrical.** Two families both
asking to room together is a merge. One family asking to room with another is a
wish. A family requiring an ensuite is a hard constraint. A family preferring one
is worth six points. The distinction has to live in the data model, not in
someone's head.

**The plan changes until the day before.** People register late, drop out, change
their minds about who they share with. Each change means a re-run. If the
re-run shuffles forty families who had no reason to move, the plan is useless and
the organisers will go back to a spreadsheet. Stability across runs is a feature, and
it is the reason the solver is a pure deterministic function and organiser decisions
are stored as constraints rather than as edits.

## Glossary

Used consistently throughout. Where a word here differs from ordinary usage, this
document wins.

**Family** — a typed entity representing the unit of identity and
authentication. Its email, display name, and membership labels are event-backed.

**Person** — a typed entity representing one human. Birthdate, role, bed demand,
and family membership are labels interpreted by occasion configuration.

**Party** — a set of People who must be placed in the same room. *Derived*, not
stored as ground truth. One Family can yield several Parties; one Party can span
several Families. Party membership is recomputed on every solver run. A
Party's requirements are derived as the union of its member Families' tags,
strictest strength winning.

**Place** — one sleeping position. A single bed is one Place. A double bed is two
Places. This is the atomic unit of capacity. Rooms have Beds; Beds have Places.

**Constraint** — an event-backed, human-readable matching fact such as a person
needing a room capability or two people needing to stay together. Constraints
reference stable entities, never derived Parties.

**Plan** — the complete solver result for the event log through an `input_seq`:
assignments, unplaced parties, diagnostics, and a full decision trace. Plans are
deterministic values derived on demand. A plan's identity is its `input_seq`,
`config_hash`, and `code_revision`.

**Publication** — the decision that a specific plan is what families should see.
`PlanPublished` records that decision and the plan's `output_hash`; it does not
create a second kind of plan.

**World** — the complete derived state for one list of events: projections, plan,
diagnostics, and trace. Produced by `derive(events, config)`. Never stored, always
recomputed; the plan referenced by the latest publication is the one families see.

**Pending events** — events an organiser has created in the organiser application and not
yet applied. Held in their browser, never on the server. Every organiser screen derives
from `committed ++ pending`.

**Sandbox** — the organiser application with a non-empty pending list. Not a mode: an empty pending
list is the ordinary case and needs no separate code path.

**Trace** — the human-readable record of why the solver did what it did. One line
per decision, including the alternatives it rejected. Not a debug log; a
first-class deliverable that organisers read.

**Tag** — a named fact in an occasion profile's vocabulary, optionally pointing at
another entity and optionally carrying a strength. Stored as a generic label.

**Kernel** — the part of the application present in every deployment: event log,
labels and resolver, derivation, solver pipeline, publication, authentication, and
application shells.

**Module** — a selectable unit of domain capability with a stable kebab-case id,
typed parameters, and its own specification in `20.N-<module-id>.md`.

**Occasion profile** — the typed composition of modules and the occasion-specific
vocabulary, policy, parameters, and copy for one deployment. The first profile
is `profiles/familienfreizeit-2027.ts`.

**Strength** — `required` (prunes rooms) or `preferred` (scored). An absent tag
assignment means indifferent.

**Preflight** — checks run on a plan's solver input before party formation, catching
infeasibility and contradictions before any placement runs.
