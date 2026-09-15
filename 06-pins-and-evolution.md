# 06 — Pins and how the solver learns

The mechanism by which admin judgement becomes algorithm improvement instead of
accumulating as permanent manual work.

---

## 1. The premise

Version 1 of the solver will be wrong about things. Not broken — wrong in the
sense of not yet knowing rules that the organisers hold in their heads and have
never written down. Admins will override it. Those overrides are the most
valuable data the system produces, because each one is a labelled example:
*given this input, the correct answer was this*, written by a domain expert, as a
side effect of doing work they had to do anyway.

Two things follow:

1. An override must record **why**, in a form that can be queried.
2. When the solver learns the rule, the override must be **findable and
   retirable**, or it becomes permanent sediment that quietly cancels out the
   improvement.

---

## 2. Reason codes

A closed enum. Six values. Free text sits alongside in `note`, never instead.

The reason free text is not enough: the value of recording reasons is being able
to ask "which pins exist because the solver does not understand a rule" — that
question is the product backlog, and no amount of grep over prose answers it
reliably.

| Code | Means | The fix lives in | Retirable |
|---|---|---|---|
| `MISSING_CONSTRAINT` | The solver does not know this rule exists | **A registry entry**, or solver code if a new mechanism is needed | **Yes. This is the backlog.** |
| `MISSING_DATA` | The solver knows the rule; the input was absent or wrong | A tag assignment, or the import | Yes, when the data arrives |
| `SCORING_DISAGREEMENT` | The solver understood everything; the admin prefers a different trade-off | A tag weight or a geometry weight, tuned offline | Sometimes |
| `OPERATIONAL` | A fact about the physical world the model does not hold | Inventory model, or a capability tag | Yes, once modelled |
| `IRREDUCIBLE` | Human knowledge that should not be encoded | Nowhere | No |
| `UNCLASSIFIED` | Not yet triaged | — | — |

### On `UNCLASSIFIED`

Requiring a taxonomy decision in the middle of a drag would make admins avoid the
board, and an avoided board means a spreadsheet. So pins may be created
unclassified, and the dashboard carries a persistent, un-dismissable count:
**"9 pins need a reason."**

Unclassified pins are visible debt. They cannot be retired by the loop (there is
nothing to check against) and they are excluded from the quality metric. That is
enough pressure without blocking the work.

### On `IRREDUCIBLE`

This bucket should be much smaller than it feels, and a growing `IRREDUCIBLE`
count means the model is missing something rather than that the world is
unusually complicated.

The canonical example: *"these two families had a falling-out, keep them apart."*
This looks irreducible — it is gossip, it is social, you cannot put it in a
spreadsheet. But it is precisely an `apart-from` relation tag, which the model
already holds, so it is a `MISSING_DATA` pin that resolves the moment someone
enters the tag — and now, stronger than in rev1, it needs no migration at all.
See [14-tags](14-tags.md) §2; the tag exists specifically to keep this class of
knowledge out of `IRREDUCIBLE`.

Genuinely irreducible: *"the Beckers are hosting the Saturday evening thing, put
them near the hall so they can slip out"* — a one-off circumstance that will not
recur and is not worth a data model. Even here, ask once whether it is really a
`proximity_to(room)` preference in disguise.

**Review rule:** if `IRREDUCIBLE` exceeds a quarter of active pins, the model is
under-specified. Treat it as a design smell, not a fact of life.

---

## 3. Capture

Every pin records what the solver was going to do:

```ts
solver_said: {
  room_id: 'rm_0022',
  score: 14,
  terms: [['exactFit', 10], ['ensuitePreferred', 6], ['orphanBed', -8]]
} | null
```

Taken from the current draft plan at the moment of pinning. Three uses:

- **Retirement checking becomes a comparison, not a re-solve.** Cheap enough to
  run on every page load.
- **The disagreement survives the pin.** After retirement you still have a record
  of what the solver used to think and what a human corrected it to.
- **It makes the triage screen readable.** "The solver wanted Room 22 for 14
  points; you moved them to Room 9" is a sentence an admin can respond to.

`null` when the party was unplaced in the draft, which is itself informative —
a pin on an unplaced party is almost always `MISSING_CONSTRAINT` or a capacity
problem rather than a scoring disagreement.

---

## 4. The retirement loop

Because `solve()` is pure and fast, "is this pin still load-bearing" is a
counterfactual you can simply run.

```
for each active pin P:
    snapshot' = snapshot without P
    plan'     = solve(snapshot', config)
    where     = room of P's people in plan'

    if where == P.target:                    → REDUNDANT
    elif distance(where, P.target) is small  → NEAR
    else                                     → LOAD-BEARING
```

At roughly 40 active pins and 55 parties, that is 40 solves. Single-digit
milliseconds each. Run it on every dashboard load.

"Distance is small" needs a definition: same building and floor, or an adjacency
distance of 1. The point of the NEAR bucket is to separate "the solver basically
agrees now" from "the solver still has no idea", because the first is a quick
confirm and the second is a backlog item.

### The panel

Permanent on the admin dashboard:

> **Pin health — 31 active**
> **9 redundant** — the solver now reaches the same answer unaided. *Review and retire →*
> **4 near** — would land within one room of your choice. *Review individually →*
> **18 load-bearing** — still doing real work.
> **9 need a reason** — unclassified.

Retiring emits `AdminUnpinned { reason: 'absorbed', by_version }`.

Retirement is never automatic. The loop proposes; a human confirms. Two reasons:
a redundant pin may be redundant by coincidence — two changes cancelling — and
more importantly, the confirmation is the moment the admin notices the solver got
better, which is the feedback that keeps them engaged with improving it rather
than routing around it.

### Batch retirement

The redundant bucket gets a single "retire all 9" action with a confirmation
listing each. Making this one click matters: if retirement is tedious, pins
accumulate, and accumulated pins hide the solver's true quality.

---

## 5. Pins as a regression corpus

Every pin — active or retired — is a test case a domain expert wrote.

```
test/fixtures/pins/
  2026-09-14-p07-ensuite-ground-floor.json
  2026-09-18-k3-sibling-together.json
  ...
```

Each fixture holds:

```json
{
  "snapshot_seq": 1183,
  "person_ids": ["per_a1", "per_a2"],
  "expected_room": "rm_0014",
  "reason_code": "MISSING_CONSTRAINT",
  "note": "Weber grandparents need ground floor",
  "retired_at": "2026-09-22",
  "retired_by_version": "1.4.0"
}
```

CI runs the whole corpus against every solver change:

- **Retired fixtures must still pass unaided.** A version that breaks a
  previously-absorbed pin is a regression, and it is visible in the PR.
- **Active fixtures are expected to fail.** They are the backlog. When one starts
  passing, CI says so — "solver 1.5.0 now satisfies 3 previously load-bearing
  pins" — which is the most motivating line in the build output.

This is a free, growing, domain-expert-authored test suite, and it is the main
reason the pin taxonomy is worth the discipline.

---

## 6. The quality metric

**Pins required to reach an acceptable plan.**

```
v1.0.0  →  41 pins
v1.1.0  →  33
v1.2.0  →  33     (weight tuning only, no new rules)
v1.3.0  →  19     (added keep_apart + ground-floor preference)
v1.4.0  →  11
```

Grounded in real judgement by the people who actually know the answer, rather
than in a synthetic benchmark. Plotted on the dashboard.

Two caveats worth building in:

- **Exclude `IRREDUCIBLE` and `UNCLASSIFIED`** from the count. Neither is
  addressable by the solver, so including them makes the metric unmoving and
  therefore ignorable.
- **Count at publication time**, not continuously. Mid-week the number is noise;
  at publication it means "this is what it took to ship a plan we were happy
  with".

---

## 7. From pin to rule — the workflow

The loop this whole document exists to support:

rev1's eight steps collapse:

```
1. Admin drags a party. Pin created, UNCLASSIFIED.
2. Triage. Classified MISSING_CONSTRAINT: "Weber grandparents need ground floor."
3. Cluster. Three pins all mention stairs. That is a tag, not three exceptions.
4. Add one registry entry: needs-ground-floor, satisfiedBy ground-floor,
   familyFacing tri-state. The capability derives from room.floor.
   One file. No migration. No form work.
5. Deploy. Backfill the three families with admin-emitted TagSet events.
6. The retirement loop puts all three pins in the redundant bucket. Retire.
```

Six steps, one of which is a deploy. What is *not* needed any more: a schema
migration, an event type, a form control, a rule file.

Step 3 is still where the judgement is and where the taxonomy earns itself. A
query over `reason_code = 'MISSING_CONSTRAINT'` sorted by creation date, with
notes visible, is the entire tooling requirement.

### The three stages

| Stage | Cost | When |
|---|---|---|
| **Pin** | A drag plus a reason code. No deploy. | One-off, or still being understood |
| **Tag** | A registry entry. Deploy, no migration. | Recurring; the constraint has a shape |
| **Typed field** | Migration plus deploy. | Structural — counted, branched on, or in every query |

The third stage is now rare. Most constraints stop at stage two, because a
registry entry already gets a form control and a trace label. Promote only
when the fact becomes structural in the sense of [14-tags](14-tags.md) §2.

### A new metric

Alongside "pins required", track **pins absorbed per tag introduced**. A
registry entry that retires five pins is the shape to look for when triaging;
one that retires one is probably still a pin.

---

## 8. Party-level pins

Placement is the obvious place to override. **Party formation is the more
important one**, and it is easy to forget.

`AdminMergedParties` and `AdminSplitParty` carry the same reason codes and go
through the same retirement loop. The counterfactual is the same shape: re-run
party formation without the override and see whether the derived parties match.

They matter more because a wrong party makes *every* downstream placement wrong,
and because placement pins created on top of a wrong party are conflicts waiting
to happen — the pin's people stop being one party the moment formation changes.

Typical party-level pins and their eventual homes:

| Situation | Code | Fix |
|---|---|---|
| "The Webers asked verbally to be with the Brauns" | `MISSING_DATA` | Enter the co-room request |
| "Split the grandparents out, they need quiet" | `MISSING_CONSTRAINT` | A quiet/mobility preference |
| "These two single-parent families should pair up" | `MISSING_CONSTRAINT` | A pairing suggestion rule, or leave it human |
| "Don't merge A and B, they only *think* they get on" | `IRREDUCIBLE` | Genuinely this one |

The party review screen shows merge and split pins inline with the derived
provenance, so an admin reading a party sees both what the algorithm concluded
and what a human overrode.

---

## 9. What this costs

Honest accounting, since the discipline is not free:

- One extra field on every override, plus a nag until it is filled in.
- A triage habit, maybe twenty minutes a week.
- ~150 lines for the retirement loop and its panel.
- A fixture file per pin and a CI job that runs them.

What it buys: a solver that measurably improves during the run-up instead of
staying at v1 quality while manual work accumulates, and a set of regression
tests nobody had to sit down and write.

For a one-weekend event this is arguably over-engineering, and it would be if the
plan were computed once. It is not — it is recomputed for six weeks as
registrations trickle in, and over six weeks the difference between a solver that
learns and one that does not is the difference between eleven manual overrides
and forty-one.

The accounting improves under rev2: the cost of acting on a triaged pin drops
from a migration to a registry entry, which is the main thing that made rev1's
discipline expensive.
