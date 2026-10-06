# Phases

Phases describe where an occasion stands and decide when a solver result is
recorded as the result families see. The organiser side is implemented; the
family composition of closed results remains in the
[outstanding phase specification](../../spec/architecture/phases.md).

## Phases and dates

Modules declare phases through the `phases` contribution kind, typed in
[`src/config/phases.ts`](../../src/config/phases.ts):

| Phase | Area | Opens | Target date | Closed by area |
|---|---|---|---|---|
| `family-preferences.accommodation-preferences` | accommodation | always | yes | yes |
| `room-assignment.review` | accommodation | always | no | no |
| `workshop-rankings.choice` | workshops | `WorkshopChoiceOpened` | yes | yes |
| `workshop-assignment.review` | workshops | always | no | no |

Target dates are typed profile data in `meta.phase_dates`; the active profile
sets 31 March 2027 for accommodation preferences and 15 April 2027 for workshop
choice. Composition rejects duplicate or misnamed phases, unknown areas, opening
events of another module, dates for undeclared or untargeted phases, duplicate
or non-UTC dates, and family-preferences sections naming undeclared phases.

## Facts and status

`derive` stays clock-free. It records each opening, closing and reopening event
as a phase fact (`world.phase_facts`): the opened phases and, per area, every
closing with its payload and the latest closing or reopening. Projected worlds
keep the timing of these facts but not closing payloads.

[`src/derive/phases.ts`](../../src/derive/phases.ts) derives the phase view
afterwards from the facts, the profile dates, and an explicit `now` — request
time in the Worker, browser time in the organiser application:

- `upcoming` — an event-opened phase whose opening event is absent;
- `open` — open, and its target date has not passed;
- `late` — open after its target date; nothing is disabled;
- `closed` — the area's latest closing or reopening event is a closing.

Readiness stays separate from status. The room review is ready when the current
plan has no blocking room-assignment preflight finding and every fixed room
decision holds. The workshop review is ready once workshop choice is open, every
active workshop is placed, every fixed placement and attendance decision holds,
and no other workshop preflight finding blocks the plan. The family wish
features require their phase, so they are effective only while it is open or
late; the organiser wish features require none.

## Organiser decisions

| Event | Owner | Effect |
|---|---|---|
| `WorkshopChoiceOpened` | `workshop-rankings` | Opens workshop choice; once only, and only with an active workshop |
| `WorkshopsClosed`, `WorkshopsReopened` | `workshop-assignment` | Close or reopen the workshop area |
| `AccommodationClosed`, `AccommodationReopened` | `room-assignment` | Close or reopen the accommodation area |

All are organiser-only and staged like any other organiser edit. A closing is
staged with an empty payload; on `/api/organiser/apply`, after the stale-build
and stale-head checks, the Worker derives the world after the committed log and
the batch's preceding events, runs the solver, refuses with
`409 area_not_ready` and the findings while the area's review phase is not
ready, and fills the closing with the area's solver-output slice — ids only, in
canonical order — and both revisions. A closing staged with a result is
rejected, and closings cannot be appended through `/api/events`. Reopening
requires a closed area. The workshop payload records placements, attendance,
and unassigned people; the accommodation payload records each family's room and
places and the unplaced families.

The `closed_results` contribution kind supplies each area's payload accessor
and the comparison that attributes added, removed and moved arrangements to
families ([`src/modules/workshop-assignment/closed-result.ts`](../../src/modules/workshop-assignment/closed-result.ts),
[`src/modules/room-assignment/closed-result.ts`](../../src/modules/room-assignment/closed-result.ts)).
Text fixtures write a closing result as one `result_json` property.

## Organiser surfaces

- **Tracks.** The workshop overview, programme and allocation screens render one
  workshop track (Workshops anlegen, Wahl öffnen, Zuordnung prüfen, Festgelegt),
  and the inventory renders the accommodation track (Zimmerwünsche, Zuordnung
  prüfen, Festgelegt), each a fixed module-owned mapping over the phase view
  through `WorkflowStepper`.
- **Decisions.** **Wahl öffnen**, **Festlegen**, **Erneut festlegen** and
  **Wieder öffnen** are confirmed decisions in the stepper actions. The closing
  review shows the affected families, the difference from the previous closed
  result or the full first result, and the blocking findings, and cannot be
  confirmed while not ready. A staged closing shows as pending until the filled
  event returns.
- **Differences.** The allocation screen and the assignment board show the
  difference between the latest closed result and the current derivation; the
  dashboard lists each closed area that differs, linking to its review screen.
- **Notices.** Family-preferences sections show the Zieltermin, the late state
  with the section's late copy, or the closed area; the programme and allocation
  notices list the workshop review's blocking findings.
- **Lists.** While the workshop area is closed, the workshop lists print its
  closed result with live descriptors, and the print stamp names the closing
  time.

## Verification

Composition, phase-view, closed-result, lifecycle-fixture, Worker closing,
track, notice, organiser surface and browser tests live in
`test/config/phases.test.ts`, `test/config/phase-view.test.ts`,
`test/config/tracks.test.ts`, `test/events/closed-results.test.ts`,
`test/events/phase-lifecycle.test.ts`, `test/events/workshops.test.ts`,
`test/worker/closing.test.ts`, `test/app/area-closing.test.tsx`,
`test/app/phase-notice.test.tsx`, `test/app/workshop-choice.test.tsx`,
`test/app/workshop-lists.test.tsx`, and `test/browser/phases.spec.ts`.
