# Self-organized workshops

This accepted module contract is deferred from the active roadmap. It is not
selected by the Familienfreizeit 2027 profile.

Module id `self-organized-workshops` · factory `selfOrganizedWorkshops`

The future source creates direct `workshop` identities through a proposer-owned
workflow. It must compose with the active workshop, space, slot, ranking, and
attendance contracts without introducing a second workshop identity or a second
relationship engine.

## 1. Dependencies and ownership

The module owns proposer attribution, approval, immediate publication, and a
proposer-selected placement. It does not own official workshop content,
current-cycle ranking values, physical spaces, or attendance allocation.

## 2. Placement and participation

A proposer may request a configured slot and workshop space. The placement is
validated against availability, capacity, capabilities, and leader conflicts.
An organiser may record an explicit event-backed override for a blocking decision;
the override remains visible in diagnostics and review.

Self-organized workshops do not enter the active profile until this contract is
promoted and its affected binding decisions are reviewed. Promotion must define
how their workshop identities appear in the current choice cycle and how their
participation mode interacts with attendance.

## 3. Tests

Fixtures cover proposer publication, invalid availability or capacity, organiser
override, replay at an event cut, and exclusion from the active profile before
promotion.
