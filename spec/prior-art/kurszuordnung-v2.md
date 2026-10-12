# Kurszuordnung_V2.xlsx

`Kurszuordnung_V2.xlsx` is the spreadsheet a previous organiser used to plan
children's courses for the previous year's event. It is analysed here because it
solved, by hand, the part of the problem the repository's
[workshop scheduling](../../docs/modules/workshop-scheduling.md) leaves to stable
order: deciding which courses run at the same time. The spreadsheet is not
committed; its anonymised wish data is the
[`kurszuordnung-v2.kdl` fixture](../../test/fixtures/workshop-assignment/kurszuordnung-v2.kdl).

## What the spreadsheet does

The spreadsheet does not assign children to courses. It scores a course-to-slot
plan that an organiser types in by hand, and it shows which course pairs should
not share a slot.

It contains no macros, no Excel Solver model, and no scenarios. Apart from an
AutoFilter range there are no defined names. The plan column holds typed
constants, so every other calculation only reacts to the organiser's edits.

## Sheet layout

The workbook has one sheet, `Kinderwunsch`.

| Range | Content |
|---|---|
| `A3:A68` | 66 children, anonymised as `Kind 01` to `Kind 66` |
| `B:D` | Wunsch 1 to 3: course letters A to M, in order of preference |
| `E` | Erfüllt: per-child score |
| `E1` | Scoring: total score |
| `F:H` | Zeitslot 1 to 3: the slot of each wish |
| `L3:M15` | The plan: each course (M) and its slot 1, 2, or 3 (L) |
| `N3:Z15` | Co-selection matrix over courses A to M |

## Formulas

### Slot lookup (`F:H`)

```text
=IF(ISBLANK($B3), 0, XLOOKUP($B3, $M$3:$M$15, $L$3:$L$15))
```

Each wish is looked up in the plan table. A blank wish yields slot `0`.
`XLOOKUP` requires Excel 2021 or Microsoft 365.

### Per-child score (`E`)

```text
=IF(AND(F≠G, F≠H, G≠H), 2,
    IF(OR(F≠G, F≠H), 1, 0))
```

A child can attend one course per slot, so the score is the number of distinct
slots among the three wishes minus one:

- 2: all three wishes are in different slots, so all three can be attended;
- 1: two wishes share a slot, so two of three can be attended;
- 0: all wishes share one slot, so only one can be attended.

The second condition omits `G≠H`, which is correct: once "all different" is
excluded, both remaining comparisons are false only when all three slots are
equal.

### Total (`E1`)

```text
=SUBTOTAL(109, E3:E68)
```

`109` sums only visible rows, so the AutoFilter on `A2:H68` gives subtotals for
a filtered group. The saved plan scores 90 of a possible 132.

### Co-selection matrix (`N3:Z15`)

Each cell sums nine `COUNTIFS` terms, one for every combination of the three wish
columns:

```text
COUNTIFS(B, column_course, B, row_course) + COUNTIFS(B, column_course, C, row_course) + …
```

- Off the diagonal, a cell counts children who chose both courses in any order.
  The matrix is symmetric.
- On the diagonal, a cell counts the children who chose that course: total
  demand, from 1 for course F to 39 for course J.
- A colour scale covers only the upper triangle without the diagonal, so large
  pair counts stand out.

## Workflow

The spreadsheet supports manual hill-climbing:

1. Read the colour-scaled matrix for course pairs many children chose together.
2. Edit column L so those pairs, and popular courses, land in different slots.
3. Read `E1` and repeat until it stops improving.

Room, capacity, and leader constraints are not represented and had to be kept
in mind by the organiser.

## Weaknesses

- **Blank wishes inflate the score.** A blank wish gets slot `0`, which never
  matches a real slot. A child with two wishes in different slots scores 2, the
  same as a child whose three wishes are all attendable. Eight children have a
  blank wish; six of them score 2 with only two attendable courses, and two
  score 1 with only one.
- **The score counts third courses.** `E` rewards attending all three wishes.
  When the target is two courses per child, as in the
  [active profile](../../docs/modules/workshop-assignment.md), maximising `E1`
  optimises courses nobody receives.
- **Rank and capacity are ignored.** A first wish counts the same as a third, and
  course J's 39 interested children have no capacity limit.
- **Fixed ranges.** Rows 3 to 68 and courses A to M are hard-coded in every
  formula.

## Plan quality

The figures in this section come from an exhaustive search over all 531,441
plans for the spreadsheet's wishes (3¹³ plans with course A fixed to slot 1,
since slot numbers are interchangeable). The search ran outside the repository;
the plans it identifies are verified through the real solver by
[`workshop-assignment-kurszuordnung-v2.test.ts`](../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts).

| Measure | Hand-made plan | Best plan | Plans strictly better |
|---|---|---|---|
| Spreadsheet `E1` | 90 | 99 | 25,312 (4.8 %); the median plan scores 78 |
| Children whose wishes span at least two slots | 61 | 64 | 32,560 |

The hand-made plan is in the top five percent by its own score, so the manual
method worked. It is not optimal for the two-course target:

| Slot | Hand-made plan | Best plan for two courses per child |
|---|---|---|
| 1 | A, C, J, L | A, I, J, L |
| 2 | B, F, H, K, M | B, C, E, H, M |
| 3 | D, E, G, I | D, F, G, K |

Under the best plan, every child who named at least two courses can attend two;
the two remaining children named a single course. It also places 55 children in
their first and second wish, against 48 for the hand-made plan, and spreads
demand more evenly (65, 67, and 56 wishes per slot against 80, 64, and 44). The
plan with the highest `E1` (99) gives only 60 children two courses, which is the
cost of optimising third courses under a two-course target.

The hand-made plan misses three children whose wishes all fall in one slot:
one chose B, K, and M (slot 2), and two chose A, C, and J (slot 1).

## Comparison with the repository

| Step | Spreadsheet | Repository |
|---|---|---|
| Course to slot | The organiser, by hand, guided by the matrix and `E1` | [First feasible slot and space in stable order](../../docs/modules/workshop-scheduling.md); wishes are not read |
| Child to course | Not modelled | [Rounds by wish rank](../../docs/modules/workshop-assignment.md) with capacity, eligibility, leader, and overlap checks |
| Co-selection | Matrix before planning | The "Gewählte Kurse überschneiden sich" finding after placement, for pairs that share a slot |
| Demand | Matrix diagonal | Demand summary and the "Mehr Wünsche als Plätze" finding |
| Explanation | None | Rejection reasons per wish in the allocation trace |

With the same assumptions as the spreadsheet — the hand-made plan as fixed
placements, no capacity limit, and three courses per child — the repository's
attendance equals the number of distinct slots among each child's wishes. That
is the spreadsheet's score plus one, without the blank-wish inflation: 148
assignments against an `E1` of 90 over 66 children. Under the active two-course
target, the same plan gives 61 children two courses and five children one.

Automatic placement over the fixture's five spaces fills slots in course order
and gives 59 children two courses. With thirteen spaces it puts every course in
the first slot, and each child receives one course.

## What the spreadsheet teaches

- **The slot plan is the main lever.** The spreadsheet spent its effort on which
  courses run together and none on per-child assignment. On the same wishes,
  that choice decides between 59 and 64 children with two courses, a difference
  the attendance rounds cannot recover.
- **Co-selection is a planning input.** The matrix told the organiser what to
  separate before deciding. The repository reports the same counts only for
  pairs that already share a slot.
- **One number and a fast loop.** Editing one cell and reading one score let a
  non-programmer reach the top five percent of plans.
- **A person deciding is acceptable.** The plan had to be understandable and
  defensible, which matches the reviewability argument of
  [D4](../../decisions.md#d4--stable-sorted-greedy-not-integer-programming).
- **The objective must follow the policy.** A score that counts courses the
  policy never hands out optimises the wrong plan.
- **Incomplete answers are normal.** Eight of 66 children left a wish blank.
- **Demand is uneven.** Course J drew 39 of 66 children and course F one, so
  capacity, which the spreadsheet ignores, decides outcomes for popular courses.
- **Exhaustive search does not scale.** Thirteen courses in three slots can be
  searched completely; the repository's 33-workshop fixture cannot.

The resulting proposals are recorded in
[demand-aware workshop scheduling](../deferred-ideas/demand-aware-workshop-scheduling.md).

## Open questions

1. How were children assigned to courses after the slot plan was fixed?
2. What capacities, rooms, and leaders did each course have?
3. Were children's ages or audiences restricted per course?
4. Which slot plan was used at the event, and did it differ from the saved one?
