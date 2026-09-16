# UI-09 — Party review

## Audience, purpose, and route

Organisers review derived sleeping parties before touching the board. Route:
`/admin/parties`. Governing specs: [admin interface](../09-admin-interface.md) §4,
[room assignment](../05-room-assignment.md), and decision [D5](../17-decisions.md#d5-party-formation-is-a-separate-reviewable-phase).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Party review · 18 parties                     [Show warnings] [Pending 2] │
├──────────────────────────────────────────────────────────────────────────┤
│ P07 · 5 people · 4 beds                 [Split] [Merge]                  │
│ Morgan — Alex (38), Jamie (9) · Taylor — Sam (41), Lee (36), Mia (0)     │
│ Requires: private bathroom · contributed by Taylor                       │
│ Formed by mutual room-sharing requests on 12 and 13 Sep                  │
│ ⚠ Combined demand exceeds the largest suitable room                       │
│                                                                          │
│ P08 · 1 person · 1 bed                                      [Merge]       │
│ Rivera — Jo (29) · no required constraints                               │
└──────────────────────────────────────────────────────────────────────────┘
```

Merge and split dialogs explain the resulting constraint and add it to the
shared pending list. Refused merges name the capacity or constraint reason.
Children's room allocation appears as a separate section before parties.

The cards preserve provenance in reading order. Buttons have descriptive names;
warnings are text plus glyph/border, and the pending count is announced after a
merge or split.

## Neobrutalist redesign and components

Render each party as a `Card` with a doubled border when constrained and
`Badge` chips for people, bed demand, and provenance. Use `Button` for Merge and
Split; the resulting constraint preview appears in a `Dialog`. Refusing a
merge uses `Alert`. Applying or discarding the shared pending list uses the
canonical `AlertDialog` composition.
