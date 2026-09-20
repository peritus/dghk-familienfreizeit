# Domain glossary

Used consistently throughout. Where a word here differs from ordinary usage, this
document wins.

**Family** — a typed entity representing the unit of identity and
authentication. Its email, display name, and membership labels are event-backed.

**Person** — a typed entity representing one human. Birthdate, role, bed demand,
and family membership are labels interpreted by occasion configuration.

**Placement unit** — the set of People placed in one room together. In the active
scope it is exactly one Family's non-withdrawn People, derived on every solver
run and never stored. Its requirements are the union of the Family's and its
members' tags, strictest strength winning.

**Place** — one sleeping position. A single bed is one Place. A double bed is two
Places. This is the atomic unit of capacity. Rooms have Beds; Beds have Places.

**Constraint** — an event-backed, human-readable matching fact such as a person
needing a room capability or two families needing to stay apart. Constraints
reference stable entities, never derived placement units.

**Plan** — the complete solver result for the event log through an `input_seq`:
assignments, unplaced families, diagnostics, and a full decision trace. Plans are
deterministic values derived on demand. A plan's identity is its `input_seq`,
`build_revision`, and `compatibility_revision`.

**Release control** — the kernel capability governing when selected arrangements
become visible to families. Its authoritative contract is [06-release-control](../application/release-control.md).

**Communication** — an organiser's reviewed release action. `Communicated` records
the basis sequence and selected scopes; email notification is optional and separate.

**World** — the complete derived state for one event prefix: projections, summaries,
plan, diagnostics and release references. Produced by `derive(events, config)` and
never stored. Audience responses select permitted content under release control.

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
labels and resolver, derivation, solver pipeline, communication, authentication, and
application shells.

**Module** — a selectable unit of domain capability with a stable kebab-case id,
typed parameters, and its own specification in `spec/modules/<module-id>.md`.

**Occasion profile** — the typed composition of modules and the occasion-specific
vocabulary, policy, parameters, and copy for one deployment. The first profile
is `spec/profiles/familienfreizeit-2027.example.ts`.

**Strength** — `required` (prunes rooms) or `preferred` (scored). An absent tag
assignment means indifferent.

**Preflight** — checks run on a plan's solver input before placement, catching
infeasibility and contradictions before any placement runs.
