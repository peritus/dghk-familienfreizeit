---
id: "027"
title: Remove room designations from room inventory
status: archived
severity: contract-contradiction
category: module:room-inventory
source: approved domain clarification
related_decisions: [D2, D5, D6]
opened: 2026-09-22
---

# Remove room designations from room inventory

## Resolution

Room inventory now models only physical accommodation: buildings, rooms, beds,
places, capacity, room traits, and bed retirement. Every live room is an ordinary
room-assignment candidate. Assignment applies capacity, resolved requirements,
exclusions, separations, organiser decisions, and retirement state.

Person and family roles remain independent of room inventory, and domain state
remains event-log-only with read models derived in memory.

## Related files

- [room inventory](../../modules/room-inventory.md)
- [room assignment](../../modules/room-assignment.md)
- [inventory UI](../../ui/screens/inventory.md)
- [occasion profile](../../profiles/familienfreizeit-2027.example.ts)
