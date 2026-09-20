---
id: "006"
title: Room/workshop assignment don't fully realize D4's stability contract
status: needs-decision
severity: contract-contradiction
category: kernel
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: [D4]
related_files:
  - ../modules/room-assignment.md
  - ../modules/workshop-assignment.md
  - ../architecture/solver-contract.md
opened: 2026-09-19
---

# Room/workshop assignment don't fully realize D4's stability contract

## Problem

D4 (`../../decisions.md` — "stable sorted-greedy with bounded repair, not
integer programming") requires retaining feasible assignments unless
coverage or repair justifies a move. Room assignment
(`../modules/room-assignment.md:103`) has no previous-placement retention phase.
Workshop assignment (`../modules/workshop-assignment.md:161`) retains assignments
but supplies no repair procedure for moving a flexible incumbent to
accommodate someone with only one eligible workshop. Stable sorting alone
does not guarantee stability when a new participant sorts before an existing
one, and the deterministic source of "the previous plan" also needs
definition for ordinary `derive(events, config)`.

## Recommendation

Define the deterministic event-prefix anchor for "previous", retention
phases, bounded repair limits and trace reasons in the solver and both
assignment contracts before M5/M6/M10. A mutable previous-plan cache is not
an acceptable shortcut — `derive(events, config)` remains authoritative. If
stability is to be weakened instead, explicitly revisit D4. Add fixtures for
a harmless arrival and a constrained arrival requiring a flexible incumbent
to move.

## Open questions

1. What is the deterministic anchor for "the previous plan" under
   `derive(events, config)`?
2. What are the bounded-repair limits, and should D4 be revisited if they
   turn out to be impractical?
