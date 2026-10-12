---
id: "052"
title: Make fixed workshop attendance easy to inspect
status: open
severity: gap
category: ui
source: organiser workflow feedback
related_milestones: [M8]
opened: 2026-10-12
---

# Make fixed workshop attendance easy to inspect

## Problem

The organiser UI supports fixed person-to-workshop attendance, but the controls
and the resulting list are easy to miss. The workshop overview shows a fixed
attendance count on each workshop. Under **Wünsche** → **Feste Teilnahmen**, an
organiser can select a person and a workshop, choose **Fest zuordnen**, and see
or remove existing pairs in a person-first list. There is no clearly surfaced
workshop-first view that identifies which people are fixed to each workshop.
This makes it difficult to answer “who is fixed to this workshop?” from the
workshop overview, even though [UI-12](../../ui/screens/workshops.md) requires
organisers to inspect explicitly fixed attendance.

The person-to-workshop attendance decision is distinct from a fixed workshop
placement in the programme (time and space). Authoring and clearing those
placements are tracked separately in
[issue 050](050-workshop-fixed-decision-authoring.md).

## Evidence

- The [allocation screen](../../../src/app/organiser/screens/workshop-allocation.tsx)
  provides the fixed-attendance form and person-first list.
- The [workshop overview card](../../../src/modules/official-workshops/app/components/authoring.tsx)
  displays a count of fixed attendees per workshop.
- The [workshop report projection](../../../src/modules/workshop-assignment/app/workshop-reports-view.ts)
  labels fixed attendance in person plans; the workshop roster does not identify
  which individual attendees are fixed.
- [UI-12](../../ui/screens/workshops.md) records the current allocation controls
  and requires review of fixed attendance.

## Recommendation

Add a workshop-first list of fixed person-to-workshop attendance, reachable from
the workshop overview and clearly labelled **Fest zugeordnet**. Keep the
existing person/workshop authoring and removal controls easy to reach, and make
the attendance decision visually distinct from a fixed programme placement.

## Acceptance criteria

- An organiser can open the fixed-attendance list from the workshop overview.
- The list shows each fixed workshop and the people assigned to it, and supports
  identifying workshops with fixed attendees.
- The existing **Fest zuordnen** and removal actions remain discoverable from
  the workshop area.
- The UI distinguishes fixed attendance from a fixed programme placement.

## Related files

- [UI-12 — Workshops](../../ui/screens/workshops.md)
- [Workshop assignment](../../modules/workshop-assignment.md)
- [Issue 050 — fixed workshop placements](050-workshop-fixed-decision-authoring.md)
