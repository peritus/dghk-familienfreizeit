# UI-03 — Family preferences

## Audience, purpose, and route

An invited family records and revises its own people, room preferences, food
information, workshop rankings and live participation. Route: `/family`, before
and after its areas are closed.
Governing specs: [family view](../../application/family-view.md), [labels and
constraints](../../architecture/labels-and-constraints.md), and [occasion profiles](../../profiles/contract.md).

This is one scrolling page, not a wizard. Controls come from the active
occasion profile's `family_facing` entries.

The organiser family-detail screen already uses this same control contract and
section configuration. This document specifies the later family route. Family
magic-link authentication is implemented, but the family-facing application and
full family-view response remain outstanding; organiser controls do not provide
those family-facing functions.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Family view                                      Saved just now  Sign out│
│ Welcome, Morgan family                                                     │
│ Your organisation team will assign rooms. Answers can change until 31 Mar     │
├──────────────────────────────────────────────────────────────────────────┤
│ 1  PEOPLE                                                                  │
│ Morgan Alex · adult · 38       Morgan Jamie · child · 9       [Edit people]│
│                                                                          │
│ 2  ROOM PREFERENCES                                                        │
│ Private bathroom       ( ) Required  (•) Preferred  ( ) No preference      │
│ Accessible room        ( ) Required  ( ) Preferred  (•) No preference      │
│ Anything else?  [                                                     ]    │
│ The organisation team can read this note.                                  │
│                                                                          │
│ 3  WORKSHOPS                                                               │
│ Saturday morning · Alex   1. Pottery   2. Hiking   3. —                   │
│ Saturday morning · Jamie  1. Hiking    2. Archery  3. Pottery             │
│                                                                          │
│ 4  FOOD                                                                    │
│ Alex   Diet [ vegetarian ▼ ]   Allergies [                           ]     │
│ Jamie  Diet [ with meat   ▼ ]  Allergies [                           ]     │
└──────────────────────────────────────────────────────────────────────────┘
```

## Mobile variant (360px)

```text
┌──────────────────────────────┐
│ Family view       Saved ✓  │
│ Welcome, Morgan family       │
│                              │
│ PEOPLE                         │
│ Alex · adult · 38             │
│ Jamie · child · 9             │
│ [ Edit people ]               │
│                              │
│ ROOM PREFERENCES              │
│ Private bathroom              │
│ [ Required ] [ Preferred ]    │
│ [ No preference ]             │
│ Anything else?                │
│ [                          ]  │
│                              │
│ WORKSHOPS                     │
│ Alex · Saturday morning       │
│ [1 Pottery                 ]  │
│ [2 Hiking                  ]  │
│                              │
│ FOOD                          │
│ Alex  [ vegetarian       ▼ ]  │
└──────────────────────────────┘
```

## Behavior and states

Save each change on input and show “Saving”, “Saved”, or a recoverable error. A
failed save returns the control to its stored state and says so; nothing is queued
in the browser ([family view](../../application/family-view.md) §3). Empty workshop rankings and incomplete
people data are warnings, not invented validation rules. Closing an area adds UI-04
arrangement cards; it does not replace this page or make current answers disappear.
Accommodation and workshop sections show their own **Zieltermin**; a passed target
marks the section late and does not disable controls. Once the organisers close an
area, its section shows saved answers read-only with the closed-input notice until
the area is reopened ([phases](../../architecture/phases.md) §8).

Workshop rows appear once workshop choice is open and show the control for their mode: rankings, a sign-up
join/leave button with current availability, or a non-binding interest toggle.
Interest names are never shared. A failed last-place sign-up returns the control to
its saved state with a clear full-capacity message. Own rankings can remain visible
as inactive choices after a programme change. See [phases](../../architecture/phases.md) §6
for the response projection; controls do not choose result cuts themselves.

Controls need visible labels, grouped radio semantics, touch targets of at least
44px, keyboard navigation, and text equivalents for pending or mutual requests.

## Neobrutalist redesign and components

Make each numbered section a `Card` with a bold heading and small completion
`Badge`. Use `RadioGroup` for tri-state preferences, `Combobox` for the person
picker, `Checkbox` for toggles, `Select` for workshop ranks and diet, and
`Textarea` for free text. Use `Sonner` for save feedback.

On mobile, cards remain stacked and controls become full-width. A picker uses a
`Drawer` or `Sheet`; the selected result stays visible as a bordered `Badge`
row.
