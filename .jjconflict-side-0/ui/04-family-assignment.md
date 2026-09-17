# UI-04 — Family assignment

## Audience, purpose, and route

A family sees its room and workshop results through `/family`. Governing spec:
[family view](../10-family-view.md) §2 and [decisions D14/D16](../17-decisions.md).

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Family view                                             Sign out    │
│ Your arrangements                                                      │
│ Please bring your own towel                                             │
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
│ [Review my preferences]     Something wrong? [Contact the organisation team]│
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile variant (360px)

Cards stack in this order: announcement, room, people in room, workshops,
contact action. The room card uses large text for the room number and never
requires a table or horizontal scrolling.

## States and privacy

Support an available result, no assignment yet, and temporary service failure states.
Never show scores, parties, solver language, unpublished changes, organisation-team notes,
or another family's preferences. Read-only controls must look disabled only
when necessary; prefer plain text and a clear result label.

## Neobrutalist redesign and components

Use a high-contrast announcement `Alert`, a primary room `Card` with an offset
shadow, and `Badge` elements for result status and room capabilities. Workshop
results are smaller `Card` rows. `Button` actions remain outlined and full-width
on mobile; “Contact the organisation team” is secondary to the family result.
