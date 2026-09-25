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
members' labels, strictest strength winning.

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

**Pending events** — ordinary events an organiser has created in the organiser
application but whose append has not yet been acknowledged by the Worker. They are
held in the organiser's browser, never on the server. Every organiser screen derives
from `committed ++ pending`.

**Pending buffer** — the ordered client-side collection of pending event groups. It is
application state used for local derivation, discard, retry, and apply-prefix
acknowledgement; it is not persisted domain state.

**Immediate mode** — the organiser UI policy that invokes the ordinary apply command
automatically after local staging.

**Collecting mode** — the organiser UI policy that leaves locally staged events in the
pending buffer until the organiser explicitly chooses **Anwenden**. It is not a second
domain model or server-side sandbox.

**Sandbox** — an informal description of an organiser view with pending events. It is
not an architectural state model; use **pending buffer** and **collecting mode** when
the distinction matters.

**Trace** — the human-readable record of why the solver did what it did. One line
per decision, including the alternatives it rejected. Not a debug log; a
first-class deliverable that organisers read.

**Trait** — a named fact in an occasion profile's vocabulary, optionally pointing at
another entity and optionally carrying a strength. Stored as a generic label.

**Kernel** — the part of the application present in every deployment: event log,
labels and resolver, derivation, solver pipeline, communication, authentication, and
application shells.

**Module** — a selectable unit of domain capability with a stable kebab-case id,
typed parameters, and its own specification in `spec/modules/<module-id>.md`.

**Occasion profile** — the typed composition of modules and the occasion-specific
vocabulary, policy, parameters, and copy for one deployment. The first profile
is `spec/profiles/familienfreizeit-2027.example.ts`.

**Strength** — `required` (prunes rooms) or `preferred` (scored). An absent label
means indifferent.

**Preflight** — checks run on a plan's solver input before placement, catching
infeasibility and contradictions before any placement runs.
