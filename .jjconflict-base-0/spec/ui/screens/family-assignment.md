# UI-04 — Family assignment

## Audience, purpose, and route

A family sees its fixed accommodation and workshop results alongside current
information and privacy-projected inline comparisons through `/family`. Governing
specs: [family view](../../application/family-view.md) §1–2,
[phases](../../architecture/phases.md) §6, and [decisions D14/D16](../../../decisions.md).

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

Support each area independently: accommodation may be fixed before workshops, or
the reverse. Also support no result yet, a cancelled workshop, a live sign-up that
conflicts with the fixed attendance, and a referenced room or workshop that is no
longer available. Show each area's own state instead of one global page state. Own
answers and live materials/participation remain current.

Every room or workshop result carries a two-state family badge, `✓` fixed or `—`
not yet fixed; no changed state exists on this screen. Families can expand `✓` to
see the comparison with the previous fixed result, when one exists. No state,
badge, or control on this screen indicates that the organisers are preparing a
change. Reviewing preferences opens UI-03 controls with the relevant Zieltermin or
closed-input notice. Workshop cards distinguish assigned results, live sign-ups and
non-binding interest; assigned results come only from the closed result
([phases](../../architecture/phases.md) §6).
Never show scores, parties, solver language, organiser-only explanations, organisation-team notes,
or another family's preferences. Read-only controls must look disabled only
when necessary; prefer plain text and a clear result label.

## Neobrutalist redesign and components

Use a high-contrast occasion-notice `Alert`, a primary room `Card` with an offset
shadow, and `Badge` elements for result status and room capabilities. Workshop
results are smaller `Card` rows. `Button` actions remain outlined and full-width
on mobile; “Contact the organisation team” is secondary to the family result.
