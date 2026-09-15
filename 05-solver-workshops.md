# 05 — The workshop solver

A separate pure function, same contract as the room solver.

```ts
solveWorkshops(snapshot: Snapshot, config: SolverConfig): WorkshopPlan
```

Structurally simpler than room assignment — people are individuals here, not
parties — but the fairness requirement makes the objective more interesting.

---

## 1. What "fair" means, decided explicitly

"Fair" is not a property an algorithm can have by accident, and it is not a thing
you can leave to a scoring function's discretion. It has to be a stated
objective that a human agreed to.

**Primary objective:** minimise the number of people who receive *none* of their
top two choices, counted across the whole weekend.

**Secondary objective:** minimise the number of people who receive none of their
choices at all.

**Tertiary:** maximise total satisfied rank weight.

The ordering matters. Optimising total satisfaction alone produces a plan where
thirty people get their first choice in every slot and eight people get nothing
anywhere, which scores well and is indefensible. The primary objective
deliberately caps the upside of making an already-happy person happier.

### The fairness ledger

The mechanism that makes it work across slots rather than within them:

```ts
type Ledger = Map<PersonId, {
  satisfiedTop2: number     // slots where they got choice 1 or 2
  satisfiedAny: number
  slotsSeen: number
}>
```

Carried forward as slots are processed in order. Contention in slot 3 is resolved
in favour of whoever has done worst in slots 1 and 2.

Without the ledger you get per-slot fairness, which is not fairness: the same
person can lose every coin-flip all weekend. With it, losing early actively
improves your odds later, which is what people mean by fair when they say it.

---

## 2. Algorithm

Slots are processed in `slot.sort_key` then `slot.id` order — chronological. The
ledger threads through.

### Per slot

```
eligible(person, workshop) :=
     person is not withdrawn
 and person.role != 'infant'
 and (workshop.min_age is null or ageAt(person) >= workshop.min_age)
 and (workshop.max_age is null or ageAt(person) <= workshop.max_age)
 and workshop is not cancelled

── Step 0: constraints ───────────────────────────────────────
Apply required workshop constraints for this slot. Decrement capacity. Mark those
people assigned for this slot. Conflicts (over-capacity, ineligible)
are reported, never silently resolved.

── Step 1: first choices ─────────────────────────────────────
For each workshop w in slot, in (sort_key, id) order:
  claimants = unassigned eligible people whose rank-1 for this slot is w
  if claimants.length <= remaining capacity:
      assign all
  else:
      sort claimants by:
        1. ledger.satisfiedTop2 asc      ← the fairness lever
        2. ledger.satisfiedAny  asc
        3. alternativeCount     asc      ← fewest other eligible workshops
        4. person_id            asc      ← total order
      assign the first `remaining capacity`
      the rest stay unassigned and fall through to step 2

── Step 2: cancellation sweep ────────────────────────────────
Any workshop whose step-1 intake is below min_capacity is cancelled.
Release everyone assigned to it back to unassigned.
If anything was cancelled, restart the slot from step 0 with the
reduced workshop set. At most one restart per slot — a second-order
cancellation is reported rather than cascaded.

── Step 3: second choices ────────────────────────────────────
Same procedure as step 1, over rank-2 preferences, for people still
unassigned.

── Step 4: remaining ranks ───────────────────────────────────
Ranks 3..n in order, same procedure.

── Step 5: fill ──────────────────────────────────────────────
People still unassigned are placed in any eligible workshop with
remaining capacity, chosen by:
  1. most remaining capacity   ← spreads the load
  2. workshop sort_key
  3. workshop id
Flagged in the trace as "no stated preference satisfied".

── Step 6: ledger update ─────────────────────────────────────
For every person, record whether this slot satisfied top-2 / any.
Carry to the next slot.
```

### On the cancellation restart

Bounded at one restart per slot, deliberately. A second cancellation caused by
the first is possible in principle and vanishingly unlikely in practice with
twenty-four workshops. Reporting it rather than looping keeps termination
obvious and keeps the trace readable. If it ever fires, an admin adjusts
`min_capacity` and re-runs.

### Co-assignment groups

A `workshop-with` relation tag at `mutual-required` forms a group that the
workshop solver treats as **one claimant**, per slot. The group's preference
ordering is the sum of its members' ranks for that workshop, lowest first; an
unranked workshop counts as `n + 1` for that member. Ties break on the lowest
member `person_id`.

If a group's size exceeds the remaining capacity of every workshop it could
otherwise claim, the group is split and reported rather than cascaded — the
same shape as the room solver's unplaceable-merge guard. Trace format in
[14-tags](14-tags.md) §7.

### On people with no preferences

Someone who never submitted rankings has an empty preference list and goes
straight to step 5. They are counted in the ledger as `satisfiedTop2: 0`, which
means they get priority in later slots — which is arguably wrong, since they
expressed no wish to satisfy.

Decision: **people with no preferences for a slot do not accrue ledger deficit
for that slot.** `slotsSeen` increments only when they ranked something.
Otherwise non-participation would be rewarded with priority.

---

## 3. No clash, structurally

The unique index `plan_workshop_assignment(snapshot_id, person_id, slot_id)` makes a
double-booking unstorable.

The solver assigns at most one workshop per person per slot by construction —
step 1 through 5 each skip already-assigned people — so the index should never
fire. It exists so that if a refactor breaks that invariant, the failure is a
write error in an admin's face rather than a family discovering the clash on
Saturday morning.

---

## 4. Output

```ts
type WorkshopPlan = {
  assignments: Array<{ personId: string, workshopId: string, slotId: string }>
  cancelled: Array<{ workshopId: string, intake: number, minCapacity: number }>
  unassigned: Array<{ personId: string, slotId: string, reason: string }>
  conflicts: Array<{ constraintKey: string, reason: string }>
  trace: TraceEntry[]
  stats: {
    perSlot: Array<{
      slotId: string
      assigned: number
      firstChoice: number
      top2: number
      noPreferenceSatisfied: number
      unassigned: number
    }>
    overall: {
      peopleWithNoTop2AnySlot: number      // ← the primary objective
      peopleWithNothingAnySlot: number     // ← the secondary
      totalRankWeight: number
    }
    fillRate: Array<{ workshopId: string, assigned: number, capacity: number }>
  }
}
```

`peopleWithNoTop2AnySlot` is the headline number. It is the objective, it goes on
the dashboard, and it is what an organiser quotes when someone complains.

### Trace shape

Per slot, per workshop, one block:

> **Samstag Vormittag — Töpfern** (capacity 12, ages 8+)
> 17 people ranked this first. 12 assigned, 5 to second choices.
> Assigned ahead of others on fairness: Braun Mia (no top-2 in slot 1),
> Weber Nils (no top-2 in slot 1).
> Deferred: Müller Jonas → Klettern (rank 2), Schmidt Lena → Kochen (rank 2), …

And per slot, a summary:

> **Samstag Vormittag** — 96 assigned, 71 first choice, 89 top-two,
> 4 with no stated preference satisfied, 0 unassigned.
> **Holzwerkstatt cancelled** (intake 3, minimum 6); its 3 participants
> redistributed.

---

## 5. Workshop constraints

The same generic constraint resolver is used for workshop matching. A custom
`needs-provides` or `groups-with` label is visible in the trace and can be
cleared by an admin; there is no separate pin lifecycle.

Common real cases and where they belong:

| Situation | Reason code | Eventual fix |
|---|---|---|
| "Lena must be with her brother, she's anxious" | `MISSING_CONSTRAINT` | A `workshop-with` tag |
| "This workshop needs one older kid to help" | `MISSING_CONSTRAINT` | A per-workshop age-mix rule |
| "Tim's rankings were entered wrong" | — | Fix the ranking; clear any compensating constraint |
| "Klettern needs 2 free spots for late signups" | `OPERATIONAL` | Model reserved capacity on the workshop |
| "Ada would hate this even though she ranked it" | `IRREDUCIBLE` | Nothing; genuinely a judgement call |

Correcting the ranking is preferable to leaving a compensating constraint in
place. The constraint screen should suggest clearing one when it duplicates a
stated preference that was previously missed because of bad data.

---

## 6. Sharp edges

**Capacity far exceeding demand.** If total workshop capacity greatly exceeds
headcount, almost everyone gets their first choice, the ledger never engages, and
the fairness machinery is inert. That is the correct behaviour and looks like a
bug to anyone reading the code for the first time. The slot summary should say
"no contention" explicitly rather than showing an empty fairness section.

**Age bands that partition the population.** If workshops in a slot have
non-overlapping age bands and one band is oversubscribed while another is empty,
step 5 cannot rescue anyone — nobody is eligible for the free places. The
`unassigned` reason must name the band, not just say "full":
`"no eligible workshop with capacity; 14 free places exist in ages 4–7 workshops"`.

**Preferences submitted after a plan is published.** Standard staleness handling:
the dashboard shows the count, the background solve shows whether it would change
anything. A workshop change is much less disruptive than a room change, so
consider a lower threshold for re-publishing workshops than for rooms — though
publishing them together keeps the mental model simple, and simplicity is worth
more here than optimality.

**One ranked list per person per slot, not per family.** Families will want to
enter these together, and the UI does present them together — but they are
per-person data, because a 9-year-old and a 40-year-old do not want the same
workshop. Do not let the form shape collapse the model shape. This is also the
justification for keeping the ranking value scoped to one person and slot — see
[14-tags](14-tags.md) §7.
