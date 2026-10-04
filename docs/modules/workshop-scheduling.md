# Workshop scheduling

Scheduling derives event-backed `workshop-slot` entities and one placement per
active workshop. A placement contains the existing workshop identity, one slot,
and one physical workshop space. There is no second placement identity.

Slots persist their canonical `starts_at` and `ends_at` instants and have no
capacity. The organiser form accepts a start datetime and a positive integer
duration in minutes, then derives `ends_at` before staging the slot event.
Workshop capacity belongs to workshops and physical capacity belongs to spaces.

The automatic stage is deterministic. It checks slot ordering and overlap, space
availability and capacity, explicit space-slot blocks, resolver capabilities, and
leader conflicts. A workshop without a feasible placement remains visible in the
programme review with an explainable unscheduled result.

Organisers maintain slots at `/organiser/workshops/slots` and review the programme
at `/organiser/workshops/programme`. Its companion views are
`/organiser/workshops/programme/unplaced` for infeasible workshops and
`/organiser/workshops/programme/overlaps` for ranked choices that share a slot.
Slot retirement preserves event history and removes the slot from current planning.
Fixed placement decisions are a supported future extension of the event-backed
contract; the initial organiser surface is automatic-only.
