# UI-04 — Family assignment

## Audience, purpose, and route

A family sees communicated accommodation and workshop results alongside current
information through `/family`. Governing spec:
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

Cards stack in this order: occasion notice, room, people in room, workshops,
contact action. The room card uses large text for the room number and never
requires a table or horizontal scrolling.

## States and privacy

Support partial availability per scope: accommodation may be communicated before
workshop allocations, and individual workshop details may be available independently.
Also support no allocation yet, cancelled workshop, pending sign-up/allocation
adjustment, and revision-mismatch unavailable states. Show the relevant communication
status instead of one global page state. Own answers and live materials/participation
remain current, including during a scope's unavailable state.

Reviewing preferences opens UI-03 controls with the normal deadline policy. Workshop
cards distinguish assigned results, live sign-ups and non-binding interest. They use
[release control](../06-release-control.md) and cannot join draft programme labels
into communicated cards.
Never show scores, parties, solver language, held arrangement changes, organisation-team notes,
or another family's preferences. Read-only controls must look disabled only
when necessary; prefer plain text and a clear result label.

## Neobrutalist redesign and components

Use a high-contrast occasion-notice `Alert`, a primary room `Card` with an offset
shadow, and `Badge` elements for result status and room capabilities. Workshop
results are smaller `Card` rows. `Button` actions remain outlined and full-width
on mobile; “Contact the organisation team” is secondary to the family result.
