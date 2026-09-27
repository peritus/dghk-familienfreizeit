# UI-12 — Workshops

## Audience, purpose, and route

Organisers review calls and proposals, publish candidate rounds, inspect demand,
edit session details and participation mode, review scheduled offerings and
conflicts, and inspect assigned-mode capacity, rankings and fairness.
Route: `/organiser/workshops`, hosted by [official workshops](../../modules/official-workshops.md).
[workshop scheduling](../../modules/workshop-scheduling.md) contributes
placements and conflicts, [workshop rankings](../../modules/workshop-rankings.md)
contributes demand and the preference heatmap, and [workshop attendance](../../modules/workshop-assignment.md)
contributes intake, fill, cancellations, and fairness data.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Workshops                         [Candidates] [Schedule] [Attendance]    │
│ 24 people · 4 sessions · 2 unscheduled conflicts                         │
├──────────────────────────────────────────────────────────────────────────┤
│ Workshop       Capacity   Filled   Top choice   Warnings                  │
│ Pottery        8          8        6            ✓                         │
│ Hiking         10         9        5            —                         │
│ Archery        6          5        2            ⚠ 1 no top-two choice     │
├──────────────────────────────────────────────────────────────────────────┤
│ PREFERENCE HEATMAP                                                        │
│                   1st choice  2nd choice  3rd choice  assigned            │
│ Alex Morgan       Pottery      Hiking       —           Pottery             │
│ Jamie Morgan      Hiking       Archery      Pottery     Hiking             │
└──────────────────────────────────────────────────────────────────────────┘
```

Round and slot selection changes the view only. Capacity and placement warnings
link to affected sessions and people; the screen does not let an organiser assign
attendance directly. Empty, unranked, unscheduled, and no-offering states remain
distinct.

Placement override actions remain deferred in
[`organiser-placement-overrides`](../../deferred-ideas/organiser-placement-overrides.md).
The workshop screen may link to the relevant configuration surface later; it does
not make direct attendance or accommodation placement a central interaction.

The heatmap has a text table alternative and does not use color alone. On
narrow screens, show one workshop card at a time followed by the ranking list.

## Programme and participation modes

Each session card has an explicit official or self-organised source and an
`assigned`, `sign-up` or `interest` mode and its
shared communication badge. Expanding the badge shows the privacy-appropriate inline
before/after diff; admins see organiser details and the communication action. Assigned
official assigned mode offers rankings/fairness before scheduling; sign-up mode shows a
live list and optional capacity; interest mode shows organiser headcounts without
shared names. Hide irrelevant ranking/solver columns for self-organised workshops.

Setup changes use the shared local-first pipeline. Show draft versus effective communicated details
when they differ, including capacity and slot. Family admission uses the effective
programme, so a draft capacity edit must not suggest places have already changed.
Over-capacity preserves existing names and blocks new admission; warnings link to
the affected workshop. Mode changes show the ordinary label changes or allocation
release dependencies needed before communication; they never silently clear lists.

**An Familien kommunizieren** opens the deferred [UI-11](../../deferred-ideas/release-control-ui.md) with the relevant
candidate, programme, schedule, or attendance scope selected. A slot allocation
action selects the complete slot, never an individual workshop roster. Dependencies
and detailed family-visible diffs are reviewed there, under [release control](../../application/release-control.md).

## Neobrutalist redesign and components

Use `Sidebar`, a `Select` for slot choice, `Card` for workshop summaries, and
`Table` for the accessible heatmap. `Badge` marks capacity and ranking status;
`Tabs` switches between summary and heatmap without changing the selected slot.
Warnings use `Alert` with a glyph and sentence, never saturated color alone.
