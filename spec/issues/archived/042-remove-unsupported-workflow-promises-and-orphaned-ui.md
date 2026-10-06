---
id: "042"
title: Remove unsupported workflow promises and orphaned UI
status: resolved
severity: drift
category: ui
source: repository-wide review of unsupported workflow copy and unreachable UI surfaces
related_decisions: [D28]
related_milestones: [M8]
opened: 2026-10-05
---

# Remove unsupported workflow promises and orphaned UI

## Scope boundary

This cleanup has no prerequisite. It removes misleading copy, unreachable UI
surfaces and inaccurate visual-coverage claims without choosing a feature or
phase contract. [043](043-feature-model.md) remains an independent feature-model
design, and [044](044-phase-model.md) depends on 043 alone.

Phase-dependent stepper, deadline and projection behavior belongs to 044. Those
items are itemized in its implementation scope so this issue can be completed
independently.

## Problem

The product renders copy and story affordances for actions that have no current
append path, and it retains an unreachable assignment-board surface. The visual
coverage registry also claims to fail closed while silently skipping stories
that are not registered. These can be cleaned up before the feature and phase
designs are settled.

This issue only owns corrections that are valid regardless of the eventual phase
model. Phase labels, local status calculations, deadlines and their documentation
remain in 044; this issue must preserve D28's current four-step workshop summary.

## Classification

Every affected item is classified as one of:

| Class | Meaning |
|---|---|
| `retain` | a generic rendering primitive that stays as it is |
| `remove` | duplicate, orphaned, or misleading; deleted outright |
| `correct` | copy or coverage claims are made accurate without defining new behavior |

A `do-not-touch` list records names that collide with phase and feature vocabulary
but mean something else. It exists to prevent collateral damage.

## Inventory

### retain

| Location | What is there | Note |
|---|---|---|
| [`workflow-stepper.tsx`](../../../src/app/components/shared/ui/workflow-stepper.tsx) | `WorkflowStep` with `complete`/`current`/`upcoming`, mobile collapse, `next_action` slot | Keep unchanged. Its doc comment already disclaims owning workflow state; 044 may use it as a presentation adapter |
| `Tabs`, `Skeleton`, `Card` footer parts, `AlertDialogTrigger`, bed icons | design-system primitives with no production call site | Keep the components; correct or remove misleading coverage claims. They are unused, not wrong |

### Phase-dependent scope owned by 044

Stepper state, local status calculations, deadline configuration and
phase-derived copy are intentionally outside this issue. See
[044's phase-dependent implementation scope](044-phase-model.md#phase-dependent-implementation-scope)
for the retained implementation scope and acceptance criteria.

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
Orphaned feature code. Keep components that the real feature will reuse; delete
the advertising and the registry claims. Each row states which side it falls on.

| Location | What is there | Disposition |
|---|---|---|
| [`reports.tsx`](../../../src/app/organiser/components/workshop/reports.tsx) | thirteen exports: rosters, per-person, per-family and per-room plan tables and documents, and a list-kind switcher — the whole "Listen erzeugen" capability | No production importer. **Keep the components** for the M11/M13 reports host; remove the coverage entries and the stepper copy that promises them |
| `src/modules/workshop-assignment/app/components/participation.tsx` (deleted) | ten exports: attendance matrix, group distribution, unrequested assignments, and an open-cases worklist with a "Nächster Schritt" column | No production importer, and the owning module contributes no screen. **Keep the components**; remove the `Familie erinnern` action copy, which promises a notification path that does not exist anywhere |
| `src/app/organiser/components/workshop/index.ts` (deleted) | a barrel re-exporting both files | **Remove.** It has zero importers and is the only thing making the two files appear reachable |
| [`shared.tsx`](../../../src/app/components/shared/workshop/shared.tsx) | `WorkshopListPicker`, `WorkshopPrintDocument`, `WorkshopConfidentialityNotice` | Reachable only through `reports.tsx`. **Keep**; they are the print primitives the reports host needs |
| [`surface.tsx`](../../../src/modules/room-assignment/app/components/assignment-board/surface.tsx) | a seven-member findings-and-decisions cluster referenced by nothing, not even a story | **Remove.** Its screens now live as deferred-idea examples outside the build |

Story-only phantoms. These advertise organiser transitions in Storybook that the
product cannot perform. Remove the fake controls and workflow claims while
keeping generic component examples that do not imply a product transition.

| Location | What is there |
|---|---|
| `workflow-stepper.stories.tsx`, `shared.stories.tsx` | a `Wahl schließen` button passed as `next_action` — a prop never used in production |
| `editors.stories.tsx` | the `Wahlphase schließen?` confirmation dialog: "Danach werden keine neuen Antworten mehr angenommen." No event, no handler, and the dialog component itself has no production caller |
| `participation.stories.tsx` | `Alternative bestätigen`, `Wunsch zurückmelden`, `Familie erinnern` rendered as table text, not controls |
| `workshop-allocation.stories.tsx` | "Die Vorschau kann erst nach der Prüfung festgelegt werden." |
| `badge.stories.tsx` | `Entwurf` and `Zurückgehalten` as product workflow states; generic badge-tone examples may remain if clearly presented as visual samples |
| `card.stories.tsx` | "Vier Personen · noch nicht veröffentlicht" as a product workflow claim |

Stepper label drift and prototype-only phase state are phase-design questions and
are retained in 044's migration inventory. This issue must not choose phase names
or amend D28.

### correct

| Location | What must become accurate |
|---|---|
| [`ui-coverage.ts`](../../../src/app/design/ui-coverage.ts) | The claim that visual coverage fails closed, or the mechanism, so unregistered stories cannot silently escape the check |
| Visual story inventory and style guide | Five story files and the routed allocation screen currently have no visual check; duplicate ids create duplicate snapshots; entries may name orphaned sources or stories instead of renderables; style-guide prose may assert behavior the components do not have |

Phase-related documentation and the family projection privacy prerequisite are
owned by 044 and remain subject to its design gates.

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
| `test/storybook/style-guide.spec.ts` | iterates the coverage registry; removing or renaming entries breaks it |
| Visual checks and baselines | cover the routed allocation screen and registered stories consistently, remove snapshots for genuinely orphaned surfaces, and eliminate duplicate snapshot ids |

Visual baselines: seventeen snapshots exist whose only purpose is to pin the
appearance of components no route can reach, and fourteen further snapshot files
have no matching coverage entry or story at all — they belong to screens that now
live as deferred-idea examples outside the build. The registry also contains four
duplicate ids, which generate duplicate tests writing the same snapshot file.
Re-baselining is broader than the files listed above, because every screen that
renders a stepper appears in other snapshots.

The inventory found no test asserting most of the unsupported action copy. This
cleanup should add or adjust assertions for the accurate copy and coverage
registry behavior it leaves behind. Phase labels and deadline behavior are
covered by 044.

## Acceptance

- Every cleanup row above is resolved, with phase-dependent rows left to 044.
- Production and Storybook copy no longer promises unsupported actions, history,
  reminders or publication; generic visual examples remain clearly illustrative.
- The unreachable assignment-board surface and genuinely dead barrel are
  removed, while report and participation primitives planned for later hosts are
  retained.
- Visual coverage is accurate and cannot silently omit an unregistered story;
  duplicate coverage ids and snapshots are resolved.
- D28's four-step summary and phase labels are unchanged by this issue. Decision
  amendments remain with 043 and 044 and must be reviewed before their
  implementation begins.
- No component that the real feature will reuse is deleted; only its advertising
  copy, its registry claims and its dead barrel.
- Remaining copy makes no claim about append paths or transitions that do not
  exist.
- Coverage exists for the corrected copy, retained illustrative stories and
  fail-closed visual coverage behavior.

## Out of scope

The review also found defects that are not about unsupported workflow copy,
unreachable UI or visual coverage. They are recorded here so they are not lost,
and are deliberately **not** part of this issue; each warrants its own entry in
this catalog.

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
6. **Dead exported helpers.** An event-type label map and nine route builders
   with no call sites, plus two registered organiser routes with no inbound link.
7. **Comment drift.** The kernel event union is described in a neighbouring
   comment as seven types; it has eight.

## Resolution

Every row is resolved; the phase-dependent rows remain with
[044](044-phase-model.md#phase-dependent-implementation-scope), and
D28's four-step summary and stepper labels are unchanged.

- **Production copy.** The overview description, the `Wahl öffnen` step
  description, the external-leader empty state, the cancelled-workshop history
  line, and the three "vor dem Festlegen" review notices in
  [`workshops.tsx`](../../../src/app/organiser/screens/workshops.tsx),
  [`workshop-allocation.tsx`](../../../src/app/organiser/screens/workshop-allocation.tsx)
  and the [allocation module component](../../../src/modules/workshop-rankings/app/components/workshop-allocation.tsx)
  now describe only available behavior.
  [`workshop-workflow-copy.test.tsx`](../../../test/app/workshop-workflow-copy.test.tsx)
  asserts the corrected copy against the prototype dataset.
- **Story phantoms.** The `Wahl schließen` `next_action` examples, the
  `Wahlphase schließen?` dialog copy, the participation action texts, the
  allocation commitment line, the `Entwurf`/`Zurückgehalten` badges and the
  card publication claim are removed or replaced with illustrative copy. The
  draft and held badge tones remain as a labeled tone sample.
- **Orphaned code.** The workshop barrel is deleted. The assignment-board
  [`surface.tsx`](../../../src/modules/room-assignment/app/components/assignment-board/surface.tsx)
  keeps `ScreenFrame`, which the routed assignment board imports; the seven
  unreferenced members are deleted.
- **Reports.** Since this issue was filed, the workshop list screen
  ([`workshop-reports.tsx`](../../../src/app/organiser/screens/workshop-reports.tsx))
  became the production host for `reports.tsx` and the shared print primitives.
  Their coverage entries and snapshots therefore remain. Participation keeps its
  components and stories, registered with a snapshot exemption because no route
  renders it.
- **Visual coverage.** [`ui-coverage.ts`](../../../src/app/design/ui-coverage.ts)
  registers every Storybook story exactly once, with the renderable as its
  source. The [Storybook visual test](../../../test/storybook/style-guide.spec.ts)
  rejects unregistered stories and stale entries, and
  [`ui-coverage.test.tsx`](../../../test/app/ui-coverage.test.tsx) rejects
  duplicate ids, missing or story-file sources and unexplained snapshot
  exemptions. The four duplicate ids, the fourteen snapshots without a story and
  the two participation snapshots are removed; the five uncovered story files,
  the remaining uncovered stories and a new routed allocation screen story are
  registered and baselined. The rule is documented in
  [docs/ui/storybook.md](../../../docs/ui/storybook.md).

## Related files

- [decisions.md](../../../decisions.md)
- [roadmap.md](../../roadmap.md#m8--organiser-authored-workshop-programme)
- [ui/screens/workshops.md](../../ui/screens/workshops.md)
- [docs/ui/assignment-board.md](../../../docs/ui/assignment-board.md)
- [src/app/components/shared/ui/workflow-stepper.tsx](../../../src/app/components/shared/ui/workflow-stepper.tsx)
- [src/app/components/shared/workshop/shared.tsx](../../../src/app/components/shared/workshop/shared.tsx)
- [src/app/design/ui-coverage.ts](../../../src/app/design/ui-coverage.ts)
- [src/app/organiser/screens/workshops.tsx](../../../src/app/organiser/screens/workshops.tsx)
- [src/app/organiser/screens/workshop-allocation.tsx](../../../src/app/organiser/screens/workshop-allocation.tsx)
- [src/app/organiser/components/workshop/reports.tsx](../../../src/app/organiser/components/workshop/reports.tsx)
- [src/modules/room-assignment/app/components/assignment-board/surface.tsx](../../../src/modules/room-assignment/app/components/assignment-board/surface.tsx)
- [test/storybook/style-guide.spec.ts](../../../test/storybook/style-guide.spec.ts)
