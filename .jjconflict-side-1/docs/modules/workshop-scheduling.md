# Workshop scheduling

Scheduling derives event-backed `workshop-slot` entities and one placement per
active workshop. A placement contains the existing workshop identity, one slot,
and one physical workshop space. There is no second placement identity.

The automatic stage is deterministic. It checks slot ordering and overlap, space
availability and capacity, explicit space-slot blocks, resolver capabilities, and
leader conflicts. A workshop without a feasible placement remains visible in the
programme review with an explainable unscheduled result.

Organisers maintain slots at `/organiser/workshops/slots` and review placements at
`/organiser/workshops/programme`. Slot retirement preserves event history and
removes the slot from current planning. Fixed placement decisions are a supported
future extension of the event-backed contract; the initial organiser surface is
automatic-only.
