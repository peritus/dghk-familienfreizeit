# Phases

Phases describe where an occasion stands: what families and organisers can do
now, what comes next, and which planning results families see. They activate
[features](features.md), give screens one shared workflow status, and decide when
a solver result is shown to families.

The organiser side — phase definitions and dates, status derivation, both
tracks, the opening, closing and reopening events with Worker-filled payloads,
the closing review, differences, and printed workshop lists — is implemented and
documented in [implemented phases](../../docs/architecture/phases.md). The
sections below keep their numbers; a delivered section points to its
documentation, and the outstanding requirements remain here.

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

Delivered: [phases and dates](../../docs/architecture/phases.md#phases-and-dates). Profile dates change only through a deployment (D12); event-backed date editing is not part of this contract.

## 3. Status derivation

Delivered: [facts and status](../../docs/architecture/phases.md#facts-and-status). There is no enforced date-based cut-off; only an organiser closing event stops family input.

## 4. Tracks in the active profile

Delivered: the workshop and accommodation tracks and the feature bindings are documented under [organiser surfaces](../../docs/architecture/phases.md#organiser-surfaces) and [facts and status](../../docs/architecture/phases.md#facts-and-status).

## 5. Organiser events

Delivered: [organiser decisions](../../docs/architecture/phases.md#organiser-decisions). The solver remains the only producer of assignments (D6): a closing records its output as an organiser decision, the Worker computes it, and a later deployment does not change a closed result.

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
boundary in [issue 031](../issues/archived/031-family-projection-privacy-boundary.md)
remains authoritative for family projections.

| Field | Source | Organiser | Family |
|---|---|---|---|
| Rooms, places, workshop placements and attendance | latest closed result | closed and current | own family, closed only |
| Descriptors (names, titles, times, cancellation) | current world | full | own family-visible values |
| Own people, preferences, rankings, live participation | current world | full | own family |
| Phase status and target dates | phase view | full | status, Zieltermin, and closing time |
| Findings, traces, scores, notes, readiness causes | current world | full | never |

## 7. Organiser review and differences

The closing review, the organiser differences, the dashboard Hinweis, and printed
workshop lists from the closed result are
[delivered](../../docs/architecture/phases.md#organiser-surfaces). Outstanding:
printed accommodation lists for a closed area use its closed result and name the
closing time, so paper matches what families see.

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

- [M10](../roadmap.md#m10--family-access-and-release-control) delivers the family
  side: target-date notices and closed-input copy on the family view, the family
  composition in §6, and the before/after comparison.
- The report host delivers printed accommodation lists from the closed result
  (§7).

## 10. Verification

Outstanding with the family composition:

- Family composition: nothing before first closing, the closed result after it,
  live descriptors, an unavailable referenced entity, a withdrawn person, a
  cancelled workshop, and the own-family before/after comparison.
- Family notices: Zieltermin, late, and closed-input copy on the family view.
