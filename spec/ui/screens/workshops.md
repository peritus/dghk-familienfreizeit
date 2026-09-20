# UI-12 — Workshops

## Audience, purpose, and route

Organisers edit workshop details and participation mode, inspect live sign-ups and
interest counts, and review assigned-mode capacity, rankings and fairness.
Route: `/organiser/workshops`. Governing specs: [workshops](../../modules/workshops.md), [workshop rankings](../../modules/workshop-rankings.md), and [workshop assignment](../../modules/workshop-assignment.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Workshops                                  [Saturday morning ▼]           │
│ 24 people · 4 workshops · 2 places remain                                │
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

Slot selection changes the view only. Capacity warnings link to affected
people; the screen does not let an organiser assign directly. Empty and
unranked states distinguish “no response” from “no workshop available”.

An Add organiser decision action opens the shared [decision form](constraints.md)
with the selected workshop and slot context. It can add matching, exclusion,
separation, or eligibility labels through the fixed resolver. It uses
the existing pending/apply flow and offers one optional note; applied labels show
the existing event author and timestamp. The derived assignment and findings
update through the ordinary solver.

The heatmap has a text table alternative and does not use color alone. On
narrow screens, show one workshop card at a time followed by the ranking list.

## Programme and participation modes

Each workshop card has an explicit `assigned`, `sign-up` or `interest` mode and its
shared communication badge. Expanding the badge shows the privacy-appropriate inline
before/after diff; admins see organiser details and the communication action. Assigned
mode offers rankings/fairness; sign-up mode shows a
live list and optional capacity; interest mode shows organiser headcounts without
shared names. Hide irrelevant ranking/solver columns for self-organised workshops.

Setup changes use pending/Apply. Show draft versus effective communicated details
when they differ, including capacity and slot. Family admission uses the effective
programme, so a draft capacity edit must not suggest places have already changed.
Over-capacity preserves existing names and blocks new admission; warnings link to
the affected workshop. Mode changes show the ordinary label changes or allocation
release dependencies needed before communication; they never silently clear lists.

**An Familien kommunizieren** opens [UI-11](release-control.md) with this
programme scope selected. A slot allocation action selects the complete slot,
never an individual workshop roster. Dependencies and detailed family-visible diffs
are reviewed there, under [release control](../../application/release-control.md).

## Neobrutalist redesign and components

Use `Sidebar`, a `Select` for slot choice, `Card` for workshop summaries, and
`Table` for the accessible heatmap. `Badge` marks capacity and ranking status;
`Tabs` switches between summary and heatmap without changing the selected slot.
Warnings use `Alert` with a glyph and sentence, never saturated color alone.
