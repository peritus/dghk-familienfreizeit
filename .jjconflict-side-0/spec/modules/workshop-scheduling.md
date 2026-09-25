# Workshop scheduling

Module id `workshop-scheduling` · factory `workshopScheduling`

Workshop scheduling places official scheduleable sessions into configured slots
and workshop spaces. It also consumes self-organised placement contributions but
does not change their proposer-selected semantics.

## 1. Dependencies and inputs

Requires [programme core](programme-core.md) and [workshop space](workshop-space.md).
Official and self-organised modules contribute typed session values when selected.
The stage consumes configured slots and spaces, resolved constraints, organiser
placement decisions, and the ranking demand summary.

## 2. Stages

The schedule stage runs after the pre-schedule demand summary and before final
attendance assignment. It assigns selected official sessions to zero or more
offerings, each with a session, slot, and space identity.

Hard checks cover availability, capacity, leader conflicts, configured typed
interest-group separation, and organiser-fixed placements. Configured integer
demand terms are soft scoring inputs after hard feasibility. Every placement,
rejection, unscheduled outcome, and conflict has a deterministic trace.

An official session that cannot be placed remains an explicit unscheduled outcome
with a blocking diagnostic. It is not silently removed from the candidate round,
and schedule release is blocked until the conflict is resolved.

## 3. Outputs and boundaries

The module owns scheduled-offering identities, schedule conflicts, unscheduled
outcomes, demand-aware placement output, and the schedule release scope. It does
not assign people to offerings. [Workshop attendance](workshop-assignment.md)
consumes its output.

## 4. Tests

Fixtures cover deterministic placement, availability, capacity, leader conflicts,
interest-group separation, fixed placements, unscheduled outcomes, multiple
offerings for one session, demand scoring, and shuffle invariance.
