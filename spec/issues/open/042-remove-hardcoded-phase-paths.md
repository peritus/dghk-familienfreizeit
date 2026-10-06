---
id: "042"
title: Remove hardcoded phase, deadline and feature paths
status: open
severity: drift
category: kernel
source: repository-wide sweep for the split of the original phase/feature issue 042
related_decisions: [D22, D28]
related_milestones: [M8, M10]
depends_on: ["044"]
opened: 2026-10-05
---

# Remove hardcoded phase, deadline and feature paths

## Dependencies

Blocked by [044 — phase activation model](044-phase-model.md), and through it by
[043 — module-contributed feature model](043-feature-model.md). Nothing here can
be executed until those contracts are accepted, because most rows are migrations
towards them rather than plain deletions.

This issue is the cleanup half of the original combined phase/feature issue. The
contracts it depends on were split out into 043 and 044 so each could be reviewed
on its own.

## Problem

Adding a central phase and feature layer beside the current local heuristics is
not sufficient. The repository already contains a competing, half-built
implementation of the same ideas, and most of it is copy rather than code: text
that tells the user a capability exists, with nothing behind it.

The scale is the reason this is its own issue. A repository-wide sweep found that
**no event type, label key or derived value anywhere in the repository represents
a phase transition, publication, release, communication, export or reminder.**
The complete event vocabulary is eight kernel types in
[`src/events/types.ts`](../../../src/events/types.ts) plus module-contributed CRUD
and `WorkshopAttendanceFixed`. There is no `Communicated` event in the source at
all, although
[`release-control.md` §3](../../application/release-control.md#3-communication-event-and-append)
specifies one.

Every "Wahl öffnen", "Wahl schließen", "festlegen", "veröffentlichen",
"kommunizieren", "erinnern" and "Historie" string the product renders is
therefore unbacked by construction, not by oversight. Two entire feature files
have no production importer while live screens advertise exactly what they would
have provided.

Implementation acceptance for 044 includes this cleanup. It is not optional
follow-up work, and a new layer must not be added alongside the paths below.

## Classification

Every affected item is classified as one of:

| Class | Meaning |
|---|---|
| `retain` | a generic rendering primitive that stays as it is |
| `migrate` | moves to the central phase or feature projection |
| `replace` | superseded by a typed contribution or domain event |
| `remove` | duplicate, orphaned, or misleading; deleted outright |
| `document` | a `docs/` claim that becomes false and must be rewritten |
| `outstanding` | stays in `spec/` as an explicitly unfinished requirement |

A seventh list, `do-not-touch`, records names that collide with phase and feature
vocabulary but mean something else. It exists to prevent collateral damage.

## Inventory

### retain

| Location | What is there | Note |
|---|---|---|
| [`workflow-stepper.tsx`](../../../src/app/components/shared/ui/workflow-stepper.tsx) | `WorkflowStep` with `complete`/`current`/`upcoming`, mobile collapse, `next_action` slot | Keep unchanged. Its doc comment already disclaims owning workflow state; the defect is entirely in its callers. The component becomes an adapter over the phase view per 044 |
| `Tabs`, `Skeleton`, `Card` footer parts, `AlertDialogTrigger`, bed icons | design-system primitives with no production call site | Keep the components, remove their coverage claims — see `document`. They are unused, not wrong |

### migrate

| Location | What is there | Note |
|---|---|---|
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) overview stepper | four steps whose state is computed from `summary.workshops.length` | Consume a phase track |
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) programme stepper | same four steps, computed differently from `official.workshops.length` and `rankings.rankings.length` | Consume the same track; the divergence disappears |
| [`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx) stepper | same four steps, computed from `projection.has_workshops` and `has_answers` | Consume the same track |
| [`inventory.tsx`](../../../src/app/organiser/screens/inventory.tsx) stepper | accommodation track computed from `summary.buildings.length` | Consume an accommodation track |

The three workshop steppers are three different functions of the same facts, which
is the concrete evidence for 044.

### replace

| Location | What is there | Note |
|---|---|---|
| [`workshop-allocation-view.ts`](../../../src/modules/workshop-rankings/app/workshop-allocation-view.ts) | `has_workshops` and `has_answers` on the projection, computed from array lengths | Replace with phase status; these two booleans are the inference inputs |
| [`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx) | three further ad-hoc definitions of "has answers" in one file — answers length, demand length, and first-stage open count | All three disagree with the projection and with each other |
| [`workshop-allocation.tsx`](../../../src/modules/workshop-rankings/app/components/workshop-allocation.tsx) conflict notice | a de facto `blocked` status derived from violation and unassigned counts, labelled "Prüfung nötig" | Replace with the typed `blocked` status |
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) programme notice | a second de facto `blocked`, labelled "Prüfung erforderlich", derived from unplaced count | Same |
| [`controls.tsx`](../../../src/modules/family-preferences/app/controls.tsx) `deadlineNotice` | builds "Frist bis …" / "Frist vorbei" from a client clock; the `passed` flag only swaps the string and gates nothing | Replace with target-date and closing-date policy per 044 |
| [`src/config/define.ts`](../../../src/config/define.ts) | `ProfileMeta.deadlines` as an untyped `Record<string, string>`; `deadline_scope` hardcoded to two scopes; `deadline_contact` keyed to the same two | Replace with a typed phase window carrying policy, not just an instant |
| [`family-preferences.md` §3](../../modules/family-preferences.md#3-parameters) | the same two-scope shape in the module contract | Must change with the code |

### remove

Phantom copy — text promising a transition, publication, list, communication or
history that no event can produce. All of it is in production screens unless
marked otherwise.

| Location | What is there |
|---|---|
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) | screen description "Anlegen, Wahl öffnen, Zuordnung prüfen und den aktuellen Plan festlegen" — two of the four do not exist |
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) | step description "Die nächste manuelle Freigabe für Familien" — there is no Freigabe action |
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) | "Prüfe Bedarf, Plätze und Überschneidungen, bevor der Plan festgelegt wird." |
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) | "… abgesagte Workshops bleiben in der Historie sichtbar." — no history view exists, and no organiser control emits `WorkshopCancelled`, so the branch is unreachable |
| [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx) | "Externe Leitungen werden bei der Workshopplanung ergänzt." — the only creation screen has no inbound link |
| [`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx) | "Prüfe offene Fälle und Konflikte vor dem Festlegen." |
| [`workshop-allocation.tsx`](../../../src/modules/workshop-rankings/app/components/workshop-allocation.tsx) | "Prüfe die markierten Fälle vor dem Festlegen." |
| [`inventory.tsx`](../../../src/app/organiser/screens/inventory.tsx) | step description "Plan kommunizieren" — no `Communicated` event exists in the source |
| four production steppers | the `Festgelegt` step, a literal `upcoming` in every caller and unreachable by construction, with the description "Plan veröffentlichen und Listen erzeugen" pointing at the orphaned report files below |
| [`reports.tsx`](../../../src/app/organiser/components/workshop/reports.tsx) | `status="Vorläufig, nicht endgültig"` on every print document — every plan is permanently provisional because nothing can make it final |

Orphaned feature code. Keep components that the real feature will reuse; delete
the advertising and the registry claims. Each row states which side it falls on.

| Location | What is there | Disposition |
|---|---|---|
| [`reports.tsx`](../../../src/app/organiser/components/workshop/reports.tsx) | thirteen exports: rosters, per-person, per-family and per-room plan tables and documents, and a list-kind switcher — the whole "Listen erzeugen" capability | No production importer. **Keep the components** for the M11/M13 reports host; remove the coverage entries, the permanent "Vorläufig" status, and the stepper copy that promises them |
| [`participation.tsx`](../../../src/modules/workshop-assignment/app/components/participation.tsx) | ten exports: attendance matrix, group distribution, unrequested assignments, and an open-cases worklist with a "Nächster Schritt" column | No production importer, and the owning module contributes no screen. **Keep the components**; remove the `Familie erinnern` action copy, which promises a notification path that does not exist anywhere |
| [`src/app/organiser/components/workshop/index.ts`](../../../src/app/organiser/components/workshop/index.ts) | a barrel re-exporting both files | **Remove.** It has zero importers and is the only thing making the two files appear reachable |
| [`shared.tsx`](../../../src/app/components/shared/workshop/shared.tsx) | `WorkshopListPicker`, `WorkshopPrintDocument`, `WorkshopConfidentialityNotice` | Reachable only through `reports.tsx`. **Keep**; they are the print primitives the reports host needs |
| [`surface.tsx`](../../../src/modules/room-assignment/app/components/assignment-board/surface.tsx) | a seven-member findings-and-decisions cluster referenced by nothing, not even a story | **Remove.** Its screens now live as deferred-idea examples outside the build |

Story-only phantoms. These advertise organiser transitions in Storybook that the
product cannot perform, and they are what the design surface documents.

| Location | What is there |
|---|---|
| `workflow-stepper.stories.tsx`, `shared.stories.tsx` | a `Wahl schließen` button passed as `next_action` — a prop never used in production |
| `editors.stories.tsx` | the `Wahlphase schließen?` confirmation dialog: "Danach werden keine neuen Antworten mehr angenommen." No event, no handler, and the dialog component itself has no production caller |
| `participation.stories.tsx` | `Alternative bestätigen`, `Wunsch zurückmelden`, `Familie erinnern` rendered as table text, not controls |
| `workshop-allocation.stories.tsx` | "Die Vorschau kann erst nach der Prüfung festgelegt werden." |
| `badge.stories.tsx` | `Entwurf` and `Zurückgehalten`, using the `draft` and `held` status tones that no production code emits |
| `card.stories.tsx` | "Vier Personen · noch nicht veröffentlicht" |

Label drift to collapse while migrating: the second step is `Wahl offen` in one
story and `Wahl öffnen` in all three production screens; the first step's id is
`create` in stories and `authoring` in production; `Vorläufig` is used as a phase
label only in stories, where production uses `Vorbereitung`, `Noch kein
Workshopplan`, `Prüfung erforderlich` and `Zuordnung prüfen`.

Prototype-only phase state: the v16 prototype under
[`spec/html-prototypes/`](../../html-prototypes/import-guide.md) carries a numeric
`phase`, a phase selector control, a "fix the plan" routine that forces phase 4,
post-commitment copy, and a fifth status vocabulary — `Probelauf`, `Vorläufig`,
`Vorschlag`, `Festgelegt` — of which only two ever reached the application.
Remove or retain as a story per the import guide's rule that prototype-only
concepts stay stories until their real contract exists.

### document

`docs/` describes verified behavior per
[`D22`](../../../decisions.md#d22--documentation-follows-implementation-status), so
these statements become false when 044 lands and must be rewritten in the same
change.

| Location | Claim that changes |
|---|---|
| [`docs/application/organiser-view.md`](../../../docs/application/organiser-view.md) | that the workshop landing view carries a "lifecycle summary"; that a passed deadline "is advisory and does not disable editing"; that the overview presents "the prototype's four lifecycle phases as a summary … it does not persist a phase enum"; and the "Current limits" paragraph that serves as the product's hand-maintained feature inventory |
| [`docs/architecture/profile-composition.md`](../../../docs/architecture/profile-composition.md) | the enumerated list of what the profile contract validates, and the enumerated list of profile-build rejections — both gain feature and phase entries |

Two documentation gaps the sweep found, to be fixed here rather than left:

- The stepper is implemented but documented only in
  [`ui/frontend.md`](../../ui/frontend.md), which is `spec/`, not `docs/`. Under
  D22 an implemented behavior belongs in `docs/`. The sentence there also restates
  D28's summary-only claim, so it changes with the D28 amendment.
- [`ui-coverage.ts`](../../../src/app/design/ui-coverage.ts) claims the registry
  "fails closed in CI", but the visual check only iterates the registry, so a
  story absent from it is silently unchecked. Five story files and the routed
  allocation screen have no visual check at all. Either the claim or the mechanism
  must change.

### outstanding

| Item | Note |
|---|---|
| [031 — family projection privacy boundary](031-family-projection-privacy-boundary.md) | A phase and feature view is a new projected shape that lands inside this unresolved boundary. It is a real prerequisite for the family-audience half and was not previously named |

### do-not-touch

These collide with phase and feature vocabulary and mean something else. A rename
or sweep must not catch them.

| Name | Where | Actual meaning |
|---|---|---|
| `WorkshopAllocationTracePhase` | [`workshop-allocation-view.ts`](../../../src/modules/workshop-rankings/app/workshop-allocation-view.ts) | solver trace stage: round, fixed, result |
| `committed` | [`src/events/prepare.ts`](../../../src/events/prepare.ts), organiser state | already appended to the canonical log, not "plan committed" |
| `fixed` | [`src/modules/room-assignment/`](../../../src/modules/room-assignment/index.ts) | a pinned room assignment |
| `features` | [`docs/ui/assignment-board.md`](../../../docs/ui/assignment-board.md) | room amenities |
| `deadline` | `test/bench/derivation.bench.ts` | a benchmark time budget |
| `step` | [`src/solver/types.ts`](../../../src/solver/types.ts) and module stages | solver trace vocabulary |

## Tests

| Test | Why it changes |
|---|---|
| `test/app/workflow-navigation.test.tsx` | asserts the three-state union, the derived current index and the German mobile summary copy |
| `test/config/profile.test.ts` | asserts the two deadline instants verbatim, and builds synthetic profiles supplying `deadline_scope` and `deadline_contact` |
| `test/storybook/style-guide.spec.ts` | iterates the coverage registry; removing or renaming entries breaks it |
| `test/solver/workshop-assignment-prototype-dataset.test.ts` | asserts `has_workshops` and `has_answers` directly |

Visual baselines: seventeen snapshots exist whose only purpose is to pin the
appearance of components no route can reach, and fourteen further snapshot files
have no matching coverage entry or story at all — they belong to screens that now
live as deferred-idea examples outside the build. The registry also contains four
duplicate ids, which generate duplicate tests writing the same snapshot file.
Re-baselining is broader than the files listed above, because every screen that
renders a stepper appears in other snapshots.

One finding sets the risk level for all of the copy removal: **no test anywhere
asserts the strings `Frist`, `Festgelegt`, `Wahl öffnen`, `Zuordnung prüfen`,
`Belegung prüfen`, `Vorbereitung` or `Späte`.** The phantom copy can be removed
without a single assertion failing — which also means the current wrong semantics
were never pinned down, and the replacement needs new coverage rather than
adjusted coverage.

## Acceptance

- Every row above is resolved to its stated class, and no row is silently dropped.
- No competing phase, deadline or workflow path remains: one authoritative phase
  and feature projection, and no screen-local status calculation.
- Every `docs/` statement listed under `document` is rewritten in the same change
  as the behavior it describes.
- Decision amendments required by 043 and 044 are applied to the decision entries
  and to every dependent document in the same change, not deleted.
- No component that the real feature will reuse is deleted; only its advertising
  copy, its registry claims and its dead barrel.
- Copy that remains makes no claim the append path cannot enforce.
- New coverage exists for the replacement behavior, given that none exists for
  the behavior being removed.

## Out of scope

The sweep that produced this inventory also found defects that are not about
phases or features. They are recorded here so they are not lost, and they are
deliberately **not** part of this issue — folding them in would recreate the
reviewability problem that splitting the original issue was meant to solve. Each
warrants its own entry in this catalog.

1. **No family surface exists.** The application registers no family route, and
   no trait sets `family_writable`, so a family `LabelSet` can only ever be
   rejected. The family-preference controls render solely from the organiser's
   family-detail screen, yet their copy and the profile's `family_facing` help
   text address families directly. A family session can also be minted and
   redeemed with nowhere to land.
2. **Magic-link delivery copy with no mail mechanism.** The login screen states
   "Magic Link gesendet. Bitte prüfe Dein Postfach und öffne den Link." No mail
   sender exists in the repository, and the login endpoint reports acceptance
   even for unknown and rate-limited addresses.
3. **Draft-persistence copy with no client storage.** The save-status surface
   states that changes "bleiben in diesem Browser, bis du sie speicherst", while
   no browser storage is used anywhere; a reload discards drafts silently.
4. **Unenforced constraints.** "Du meldest Dich verbindlich an." and its
   organiser mirror "Mit der Anmeldung ist der Platz sofort reserviert." promise
   a reservation, but the sign-up label key has no validator and sign-up
   workshops never enter capacity accounting. The "Bis zu 3 Wünsche" limit is not
   enforced in the append path either.
5. **Hardcoded rules that ignore configured parameters.** The family completeness
   quota is a literal role-based rule rather than the configured value, and the
   organiser ranking control hardcodes three rather than reading the configured
   maximum, so copy and control agree with configuration only by coincidence.
6. **Design-registry rot.** Coverage entries pointing at orphaned sources, four
   duplicate ids, entries whose source names a story rather than a renderable,
   and style-guide prose asserting component behavior the code does not have.
7. **Dead exported helpers.** An event-type label map and nine route builders
   with no call sites, plus two registered organiser routes with no inbound link.
8. **Comment drift.** The kernel event union is described in a neighbouring
   comment as seven types; it has eight.

## Related files

- [decisions.md](../../../decisions.md)
- [roadmap.md](../../roadmap.md#m8--organiser-authored-workshop-programme)
- [modules/contract.md](../../modules/contract.md)
- [modules/family-preferences.md](../../modules/family-preferences.md#3-parameters)
- [application/release-control.md](../../application/release-control.md#3-communication-event-and-append)
- [ui/frontend.md](../../ui/frontend.md)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
- [html-prototypes/import-guide.md](../../html-prototypes/import-guide.md)
- [043 — module-contributed feature model](043-feature-model.md)
- [044 — phase activation model](044-phase-model.md)
- [031 — family projection privacy boundary](031-family-projection-privacy-boundary.md)
- [docs/application/organiser-view.md](../../../docs/application/organiser-view.md)
- [docs/architecture/profile-composition.md](../../../docs/architecture/profile-composition.md)
- [docs/ui/assignment-board.md](../../../docs/ui/assignment-board.md)
- [src/events/types.ts](../../../src/events/types.ts)
- [src/events/prepare.ts](../../../src/events/prepare.ts)
- [src/solver/types.ts](../../../src/solver/types.ts)
- [src/config/define.ts](../../../src/config/define.ts)
- [src/app/components/shared/ui/workflow-stepper.tsx](../../../src/app/components/shared/ui/workflow-stepper.tsx)
- [src/app/components/shared/workshop/shared.tsx](../../../src/app/components/shared/workshop/shared.tsx)
- [src/app/design/ui-coverage.ts](../../../src/app/design/ui-coverage.ts)
- [src/app/organiser/screens/workshops.tsx](../../../src/app/organiser/screens/workshops.tsx)
- [src/app/organiser/screens/workshop-allocation.tsx](../../../src/app/organiser/screens/workshop-allocation.tsx)
- [src/app/organiser/screens/inventory.tsx](../../../src/app/organiser/screens/inventory.tsx)
- [src/app/organiser/components/workshop/index.ts](../../../src/app/organiser/components/workshop/index.ts)
- [src/app/organiser/components/workshop/reports.tsx](../../../src/app/organiser/components/workshop/reports.tsx)
- [src/modules/family-preferences/app/controls.tsx](../../../src/modules/family-preferences/app/controls.tsx)
- [src/modules/room-assignment/index.ts](../../../src/modules/room-assignment/index.ts)
- [src/modules/room-assignment/app/components/assignment-board/surface.tsx](../../../src/modules/room-assignment/app/components/assignment-board/surface.tsx)
- [src/modules/workshop-assignment/app/components/participation.tsx](../../../src/modules/workshop-assignment/app/components/participation.tsx)
- [src/modules/workshop-rankings/app/workshop-allocation-view.ts](../../../src/modules/workshop-rankings/app/workshop-allocation-view.ts)
- [src/modules/workshop-rankings/app/components/workshop-allocation.tsx](../../../src/modules/workshop-rankings/app/components/workshop-allocation.tsx)
