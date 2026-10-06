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

**Phase** — a typed, module-owned lifecycle context, such as workshop choice, whose
status (`upcoming`, `open`, `late`, `closed`) is derived and which activates
features ([phases](phases.md)).

**Area** — a part of the occasion whose solver result is closed and shown to
families as a whole: **Unterkunft** or **Workshops**.

**Closed result** — the solver-output slice, ids only, recorded by an area's latest
closing event; families see it instead of the current derivation.

**Zieltermin** — an advisory target date. Passing it marks a phase late and never
disables an action.

**Closing** (**Festlegen**) — the organiser decision that closes an area's inputs
and records its current solver result as the closed result. Reopening opens the
inputs again; email notification is optional and separate.

**World** — the complete derived state for one event prefix: projections, summaries,
plan, diagnostics and closed results. Produced by `derive(events, config)` and
never stored. Audience responses select permitted content under [phases](phases.md).

**Draft events** — ordinary events an organiser has created in the organiser
application but whose append has not yet been acknowledged by the Worker. They are
held in the organiser's browser, never on the server. Every organiser screen derives
from `committed ++ drafts`.

**Draft buffer** — the ordered client-side collection of draft event groups. It is
application state used for local derivation, discard, retry, and apply-prefix
acknowledgement; it is not persisted domain state.

**Immediate mode** — the organiser UI policy that invokes the ordinary apply command
automatically after local staging.

**Drafting mode** — the organiser UI policy that leaves locally staged events in the
draft buffer until the organiser explicitly chooses **Entwürfe anwenden**. It is not a
second domain model or server-side workspace.

**Draft workspace** — the organiser UI area that presents draft changes and their
apply/discard actions. It is a presentation surface, not a second state model.

**Trace** — the human-readable record of why the solver did what it did. One line
per decision, including the alternatives it rejected. Not a debug log; a
first-class deliverable that organisers read.

**Trait** — a named fact in an occasion profile's vocabulary, optionally pointing at
another entity and optionally carrying a strength. Stored as a generic label.

**Kernel** — the part of the application present in every deployment: event log,
labels and resolver, derivation, solver pipeline, phases, authentication, and
application shells.

**Module** — a selectable unit of domain capability with a stable kebab-case id,
typed parameters, and its own specification in `spec/modules/<module-id>.md`.

**Feature** — a module-owned product capability, such as a screen, family control,
or action, that the profile selects, a deployment binding may switch, and a phase
may activate. Its effective availability is derived per request and never stored
([features](features.md)). A room's physical attribute is an **amenity**, not a
feature.

**Occasion profile** — the typed composition of modules and the occasion-specific
vocabulary, policy, parameters, and copy for one deployment. The first profile
is `spec/profiles/familienfreizeit-2027.example.ts`.

**Strength** — `required` (prunes rooms) or `preferred` (scored). An absent label
means indifferent.

**Preflight** — checks run on a plan's solver input before placement, catching
infeasibility and contradictions before any placement runs.
