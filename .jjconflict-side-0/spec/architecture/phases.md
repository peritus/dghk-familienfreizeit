# Phases

Phases describe where an occasion stands: what families and organisers can do
now, what comes next, and which planning results families see. They activate
[features](features.md), give screens one shared workflow status, and decide when
a solver result is shown to families. Nothing below is implemented yet.

## 1. Terminology

- **Area** — a part of the occasion whose solver result is closed and published
  as a whole. The active profile has two: **Unterkunft** (accommodation) and
  **Workshops**.
- **Phase** — a typed, module-owned lifecycle context, such as workshop choice,
  that activates features and has a derived status. A phase is not stored; its
  status is derived from events, profile dates, and `now`.
- **Track** (**Ablauf**) — the ordered steps shown for one area.
- **Step** (**Schritt**) — the compact presentation of a track position in a
  stepper. Presentation only, never domain state.
- **Target date** (**Zieltermin**) — an advisory date. Passing it marks a phase
  late; it never disables an action.
- **Closing** (**Festlegen**) — the organiser decision that closes an area's
  inputs and records its current solver result as the result families see.
- **Closed result** — the solver-output slice recorded by the latest closing
  event of an area.
- **Reopening** — the organiser decision that opens a closed area's inputs again.
  Families keep seeing the last closed result until the area is closed again.
- **Readiness** — a module-owned fact saying whether a phase's outcome can be
  produced now, with the findings that prevent it.

There is no enforced date-based cut-off. A date can only make a phase late; only
an organiser closing event stops family input.

## 2. Phase definitions

A module declares its phases alongside its features. Phase ids follow the feature
id pattern, `<module-id>.<phase>`.

```ts
type PhaseDefinition = {
  id: PhaseId
  area: AreaId                               // 'accommodation' | 'workshops'
  opens:
    | { kind: 'always' }
    | { kind: 'event'; event: EventType }    // a module-owned organiser event
  target: boolean                            // whether the profile may set a Zieltermin
  closed_by_area: boolean                    // whether the area's closing ends it
  readiness?: PhaseReadiness                 // pure, over the module's derived facts
}
```

Features bind to phases through `requires_phases` and `activation_mode`
([features](features.md) §3). Bindings are positive only: a phase never lists the
features it deactivates. A phase that is not active removes every feature bound to
it from effective availability. Phases add no availability layer of their own.

Profile composition fails when a phase id is duplicated or malformed, its area is
not contributed by a selected module, its opening event is not an event of the
owning module, or a feature binds an unknown phase.

### Profile dates

Dates are profile data and change only through a deployment (D12). A typed
`meta.phase_dates` list replaces the untyped `meta.deadlines`:

```ts
phase_dates: [
  { phase: 'family-preferences.accommodation-preferences', target_at: '2027-03-31T21:59:59Z' },
  { phase: 'workshop-rankings.choice', target_at: '2027-04-15T21:59:59Z' },
]
```

Profile composition fails when an entry names an undeclared phase, a phase that
does not accept a target, or the same phase twice. Event-backed date editing is not part of this contract.

## 3. Status derivation

```ts
type PhaseStatus = 'upcoming' | 'open' | 'late' | 'closed'

type PhaseView = {
  phase: PhaseId
  status: PhaseStatus
  target_at: string | null
  readiness: { ready: true } | { ready: false; findings: readonly FindingRef[] }
  closed: { seq: number; at: string } | null
}
```

- `upcoming` — an event-opened phase whose opening event has not been appended;
- `open` — the phase is open and its target, if any, has not passed;
- `late` — the phase is open and its target has passed;
- `closed` — `closed_by_area` is set and the latest area event is a closing
  event rather than a reopening.

Readiness is separate from status. An open phase can be not ready, shown as
**Prüfung erforderlich** or the concrete blocker. Completion is the closing event
itself; there is no separate `complete` status.

`derive(events, config)` stays pure and clock-free (D15, D26). It folds opening,
closing, and reopening events into per-area facts. The phase view is computed
afterwards by a pure function of the derived world, the profile dates, and `now`.
The Worker passes the request time; the organiser application passes the browser
time. No append validation depends on `now`, because no phase enforces a date.

## 4. Tracks in the active profile

| Track | Step | Status source |
|---|---|---|
| Workshops | **Workshops anlegen** | complete when the catalogue has at least one active workshop |
| Workshops | **Wahl öffnen** | complete once `WorkshopChoiceOpened` is appended |
| Workshops | **Zuordnung prüfen** | current while the choice phase is open or late; its readiness shows blockers |
| Workshops | **Festgelegt** | complete while the area is closed |
| Unterkunft | **Zimmerwünsche** | current while the preferences phase is open or late; shows the Zieltermin |
| Unterkunft | **Zuordnung prüfen** | readiness of the room assignment |
| Unterkunft | **Festgelegt** | complete while the area is closed |

Each step's stepper state (`complete`, `current`, `upcoming`) is a fixed mapping
in the owning module's code over the phase view. `WorkflowStepper` stays a
presentation adapter: every caller renders the track from the phase view and no
screen derives a step from local facts. The overview, programme, and allocation
screens render the same workshop track.

The active profile's phases:

| Phase | Area | Opens | Target | Closed by area |
|---|---|---|---|---|
| `family-preferences.accommodation-preferences` | accommodation | always | yes | yes |
| `room-assignment.review` | accommodation | always | no | no |
| `workshop-rankings.choice` | workshops | `WorkshopChoiceOpened` | yes | yes |
| `workshop-assignment.review` | workshops | always | no | no |

### Feature bindings

The phases refine the first feature set ([features](features.md) §8):

| Feature | Requires phases | Change |
|---|---|---|
| `family-preferences.accommodation-preferences` | `family-preferences.accommodation-preferences` | new; governs the controls of sections whose `phase` is that phase, split from `family-preferences.preferences` |
| `family-preferences.preferences` | — | governs the remaining profile-trait controls |
| `workshop-rankings.ranking` | `workshop-rankings.choice` | bound |
| `official-workshops.sign-up`, `official-workshops.interest` | `workshop-rankings.choice` | bound; `official-workshops` gains an `enhances` on `workshop-rankings` |
| `official-workshops.family-catalogue` | `workshop-rankings.choice` | new, family audience read-only; the organiser equivalent is `official-workshops.catalogue` |
| `workshop-rankings.allocation-review` | — | gains the `open-choice` action writing `WorkshopChoiceOpened` |
| `workshop-assignment.closing` | `workshop-assignment.review` | new, organiser; actions `close` and `reopen` writing `WorkshopsClosed` and `WorkshopsReopened` |
| `room-assignment.closing` | `room-assignment.review` | new, organiser; actions `close` and `reopen` writing `AccommodationClosed` and `AccommodationReopened` |

A phase binding to a phase of a module that is not selected is a composition
error ([features](features.md) §5), so `official-workshops` binds the choice phase
only when `workshop-rankings` is selected; otherwise its sign-up and interest
features carry no phase binding.

## 5. Organiser events

| Event | Owner | Effect |
|---|---|---|
| `WorkshopChoiceOpened` | `workshop-rankings` | Opens the choice phase; families see the live catalogue and may rank, sign up, and register interest |
| `WorkshopsClosed` | `workshop-assignment` | Closes the workshop area's inputs and records its result |
| `WorkshopsReopened` | `workshop-assignment` | Opens the workshop area's inputs again |
| `AccommodationClosed` | `room-assignment` | Closes the accommodation inputs and records its result |
| `AccommodationReopened` | `room-assignment` | Opens the accommodation inputs again |

These are organiser-only events. There is no generic phase-advance event. Opening
workshop choice is not undone; the area's closing and reopening govern input
afterwards.

### Closing payload

A closing payload records the area's solver-output slice and nothing else:

```ts
type WorkshopsClosedPayload = {
  placements: readonly { workshop_id: string; slot_id: string; space_id: string }[]
  attendance: readonly { person_id: string; workshop_id: string }[]
  unassigned: readonly { person_id: string; slot_id: string }[]
  build_revision: string
  compatibility_revision: number
}

type AccommodationClosedPayload = {
  placements: readonly { family_id: string; room_id: string; place_ids: readonly string[] }[]
  unplaced: readonly { family_id: string }[]
  build_revision: string
  compatibility_revision: number
}
```

Payloads contain ids only, in a canonical order ending in ids. Titles, room
names, slot times, and other descriptors stay live. Solver traces, scores,
findings, and notes are never recorded. Attendance covers solver-assigned
workshops; sign-up and interest participation stays live.

The client never supplies the result. A closing request carries only the head
sequence the organiser reviewed. The Worker:

1. authenticates and authorises the organiser;
2. refuses with the ordinary stale-head response when the log head differs from
   the reviewed sequence;
3. derives the world at the head and refuses while the area's review phase is
   not ready;
4. computes the payload from that derivation and appends the closing event
   atomically.

The solver remains the only producer of assignments (D6): the closing event
records its output as an organiser decision and does not let anyone write an
assignment. The revisions in the payload attribute which code produced the result;
a later deployment does not change a closed result.

Closing an already closed area records a corrected result without reopening
inputs. Reopening has no payload.

## 6. What families see

Families see the current world, privacy-projected by the Worker (D15), with one
exception: an area's solver result is visible only as its latest closed result.

- Before an area's first closing, families see no assignment for it.
- Own people, preferences, rankings, free text, and live sign-up or interest are
  current immediately after a successful append.
- The workshop catalogue and its live descriptors are visible once workshop
  choice is open. Before that, families see no workshop.
- After closing, the family sees its own placements and attendance from the
  closed result, joined to live descriptors. A referenced entity that no longer
  exists is shown as **nicht mehr verfügbar**, never guessed.
- A person withdrawn after closing is not shown; current authorisation always
  applies.
- A cancelled workshop in the closed result is shown as cancelled, from the live
  cancellation fact.
- When an area has been closed more than once, the family may expand a
  before/after comparison between its two most recent closed results, limited to
  its own family.

The family view never shows the difference between a closed result and the
current derivation, never shows that an area is being prepared, and never receives
findings, traces, scores, notes, or other families' restricted values. The privacy
boundary in [issue 031](../issues/open/031-family-projection-privacy-boundary.md)
remains authoritative for family projections.

| Field | Source | Organiser | Family |
|---|---|---|---|
| Rooms, places, workshop placements and attendance | latest closed result | closed and current | own family, closed only |
| Descriptors (names, titles, times, cancellation) | current world | full | own family-visible values |
| Own people, preferences, rankings, live participation | current world | full | own family |
| Phase status and target dates | phase view | full | status, Zieltermin, and closing time |
| Findings, traces, scores, notes, readiness causes | current world | full | never |

## 7. Organiser review and differences

Organisers work on the live world. For a closed area, the review screens show the
difference between the latest closed result and the current derivation: added,
removed and moved families or people, with affected families. A change and its
reversal leave no difference. The organiser dashboard lists each closed area that
differs from its closed result and links to its review screen.

**Festlegen** opens a read-only review before appending: the closed result to be
recorded, its difference from the previous closed result (or the full initial
result), affected families, and blocking findings. Previewing appends nothing.
Printed lists for a closed area use the closed result, so paper matches what
families see; the list footer names the closing time.

## 8. Wording

| Concept | UI wording |
|---|---|
| phase track | **Ablauf**, or the area name |
| step | **Schritt** |
| target date | **Zieltermin** |
| closing | **Festlegen**; closed state **Festgelegt** |
| reopening | **Wieder öffnen** |
| not ready | **Prüfung erforderlich**, or a concrete blocker |

Target-date copy never implies a cut-off:

```text
Zieltermin: 31. März 2027
Änderungen bleiben danach möglich, werden aber als verspätet markiert.
```

Closed-input copy names the organiser decision, not a date:

```text
Die Zimmerwünsche sind festgelegt. Für Änderungen wende dich bitte an das Organisationsteam.
```

## 9. Milestones

- [M8](../roadmap.md#m8--organiser-authored-workshop-programme) delivers the phase
  contract, the phase view, both organiser tracks, the workshop and accommodation
  opening, closing, and reopening events, the closing review, differences, and
  printed lists from the closed result.
- [M10](../roadmap.md#m10--family-access-and-release-control) delivers the family
  side: target-date notices, closed-input copy, the family composition in §6, and
  the before/after comparison.

## 10. Verification

- Status derivation for every status, including a target passing while open and
  reopening after closing, with an injected `now`.
- Profile-build failures from §2.
- Feature availability following phase status, including the ranking feature
  becoming unavailable when workshops close and available again on reopening.
- Closing: stale-head refusal, not-ready refusal, server-computed payload equal to
  the reviewed derivation, a corrected re-close, and a payload unchanged by a
  later deployment.
- Family composition: nothing before first closing, the closed result after it,
  live descriptors, an unavailable referenced entity, a withdrawn person, a
  cancelled workshop, and the own-family before/after comparison.
- Organiser differences: none after closing, a moved person after an edit, none
  after reverting it.
- Browser coverage of every stepper caller rendering the shared track, and of the
  closing review.
