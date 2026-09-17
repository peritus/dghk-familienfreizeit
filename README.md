# DGHK Familienfreizeit — modular event planning

## Reading order

| # | Document | What it settles |
|---|---|---|
| 01 | [Architecture](01-architecture.md) | Module composition, request lifecycle, and boundaries |
| 02 | [Data model](02-data-model.md) | Generic identity, labels, relationships, and projections |
| 03 | [Event model](03-events.md) | Generic event envelope, replay, and lifecycle |
| 04 | [Labels and constraints](04-labels-and-constraints.md) | Tag vocabulary, resolver operators, and validation |
| 05 | [Room assignment](05-room-assignment.md) | Generic room modules and deterministic placement |
| 06 | [Workshop assignment](06-workshop-assignment.md) | Generic ranking and workshop modules |
| 07 | [Materials coordination](07-materials.md) | Generic requests, commitments, and fulfillment |
| 08 | [Constraint health](08-constraint-health.md) | Preflight, diagnostics, and regression corpus |
| 09 | [Organiser view](09-organiser-view.md) | Organisation-team surfaces and module-provided screens |
| 10 | [Family view](10-family-view.md) | Family-facing controls, privacy, and family workflows |
| 11 | [Authentication](11-authentication.md) | Magic links, sessions, and threat model |
| 12 | [Frontend](12-frontend.md) | Rendering, enhancement, styling, and board island |
| 13 | [Deployment](13-deployment.md) | One profile per deployment, migrations, secrets, and email |
| 14 | [Testing](14-testing.md) | Generic module contracts and event fixtures |
| 15 | [Roadmap](15-roadmap.md) | Delivery milestones and cut lines |
| 16 | [Occasion profiles](16-occasion-profiles.md) | Profile contract and configuration rules |
| 17 | [Decisions](17-decisions.md) | Architectural decisions and their accepted alternatives |
| 18 | [German translation guidelines](18-german-translation-guidelines.md) | Family-facing terminology and translation rules |
| 19 | [Reports](19-reports.md) | Report catalogue, audience scopes, responsive behavior, and browser printing |

## What this is

A small web application composed from reusable occasion modules. A deployment
selects one occasion profile, which may assign people to rooms, workshops, or both.
The first deployed profile is `familienfreizeit-2027`.

Families state preferences. They never assign anything. A deterministic
algorithm produces a complete proposal. Organisers review it, override where their
judgement beats the algorithm's, and publish. Overrides are recorded with a
reason so the algorithm can be taught to stop needing them.

## The shape of the problem

Three things make this harder than a seating chart:

**The assignable unit is not the family.** A family of five might sleep as a
party of two adults in one room while its three children sleep in a children's
room with children from four other families. The unit that must stay together is
derived from stated preferences, not from the family structure. We call it a
*party*, and forming parties correctly is a separate problem from placing them.

**Preferences conflict and the conflicts are not symmetrical.** Two families both
asking to room together is a merge. One family asking to room with another is a
wish. A family requiring an ensuite is a hard constraint. A family preferring one
is worth six points. The distinction has to live in the data model, not in
someone's head.

**The plan changes until the day before.** People register late, drop out, change
their minds about the children's room. Each change means a re-run. If the
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
`config_hash`, and `solver_version`.

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

**Occasion profile** — the typed composition of modules and the occasion-specific
vocabulary, policy, parameters, and copy for one deployment. The first profile
is `profiles/familienfreizeit-2027.ts`.

**Strength** — `required` (prunes rooms) or `preferred` (scored). An absent tag
assignment means indifferent.

**Preflight** — checks run on a plan's solver input before party formation, catching
infeasibility and contradictions before any placement runs.
