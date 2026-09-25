# Self-organized sessions

This accepted module contract is deferred from the active roadmap. It is the
canonical specification for a future promotion; it is not selected by the
Familienfreizeit 2027 profile.

Module id `self-organized-sessions` · factory `selfOrganizedSessions`

Self-organized sessions use the common programme-session identity but follow a
separate path from official proposal review and ranking.

## 1. Dependencies and ownership

Requires [programme core](../modules/programme-core.md). It owns self-organised mode,
immediate publication, proposer-selected placement, and the organiser override
of that placement.

The module does not depend on call for papers, workshop ranking, or workshop
attendance.

## 2. Placement and participation

A proposer may select a configured slot and workshop space. The placement is
validated against configured availability and capacity. An organiser may record
an explicit override for a conflict or capacity issue; the override remains
visible as a diagnostic and is not a hidden mutation of the event log.

Self-organised sessions may be represented by the common schedule boundary for
programme consistency, but they do not enter candidate rounds, ranking, demand
summaries, or solver attendance allocation.

## 3. Tests

Fixtures cover immediate publication, proposer-selected placement, invalid
availability or capacity, organiser override, and exclusion from official
ranking and attendance outputs.
