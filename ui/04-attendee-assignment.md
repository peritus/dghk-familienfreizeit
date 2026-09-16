# UI-04 — Published attendee assignment

## Audience, purpose, and route

A family sees only its published room and workshop results. Route: `/family`
after publication. Governing spec: [attendee view](../10-family-portal.md)
§2 and [decisions D14/D16](../17-decisions.md).

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Attendee view                                             Sign out    │
│ Your arrangements                                                      │
│ Published 20 September · Please bring your own towel                   │
├──────────────────────────────────────────────────────────────────────┤
│ YOUR ROOM                                                              │
│ ┌──────────────────────────────────────────────────────────────────┐   │
│ │ Room 12 · Main House · first floor                              │   │
│ │ 4 places · Private bathroom                                     │   │
│ │ Alex Morgan · Jamie Morgan                                     │   │
│ └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ YOUR WORKSHOPS                                                          │
│ Saturday morning · Alex: Pottery                                       │
│ Saturday morning · Jamie: Hiking                                       │
│                                                                          │
│ [Review my preferences]     Something wrong? [Contact organisers]       │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile variant (360px)

Cards stack in this order: announcement, room, people in room, workshops,
contact action. The room card uses large text for the room number and never
requires a table or horizontal scrolling.

## States and privacy

Support published, no assignment yet, and temporary service failure states.
Never show scores, parties, solver language, unpublished changes, admin notes,
or another family's preferences. Read-only controls must look disabled only
when necessary; prefer plain text and a clear “published” label.
