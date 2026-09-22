# Optional design: party review

*Status:* Not part of the active UI catalogue. This screen belongs to the
sleeping-parties and child-rooms module boundary.

## Audience, purpose, and route

Organisers would review derived sleeping parties before touching the board. Proposed
route: `/organiser/parties`. Governing specs: [organiser view](../application/organiser-view.md),
[sleeping parties](sleeping-parties.md), and decision [D5](../../decisions.md#d5--sleeping-parties-and-child-rooms-are-outside-the-active-placement-model).

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

Merge and split dialogs explain the resulting organiser decision and add it to the
shared pending list. Refused merges name the capacity or constraint reason.

The cards preserve provenance in reading order. Buttons have descriptive names;
warnings are text plus glyph/border, and the pending count is read out after a
merge or split.

## Neobrutalist redesign and components

Render each party as a `Card` with a doubled border when constrained and
`Badge` chips for people, bed demand, and provenance. Use `Button` for Merge and
Split; the resulting constraint preview appears in a `Dialog`. Refusing a
merge uses `Alert`. Applying or discarding the shared pending list uses the
canonical `AlertDialog` composition.
