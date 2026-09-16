# UI-03 — Attendee preferences

## Audience, purpose, and route

An invited family records and revises its own people, room preferences, shared
family requests, and workshop rankings. Route: `/family` before publication.
Governing specs: [attendee view](../10-family-portal.md), [labels and
constraints](../04-labels-and-constraints.md), and [event profiles](../16-event-profiles.md).

This is one scrolling page, not a wizard. Controls come from the active
occasion profile's `attendeeFacing` entries.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Attendee view                                      Saved just now  Sign out│
│ Welcome, Morgan family                                                     │
│ Your organisers will assign rooms. You can change these answers until 20 Sep│
├──────────────────────────────────────────────────────────────────────────┤
│ 1  PEOPLE                                                                  │
│ Morgan Alex · adult · 38       Morgan Jamie · child · 9       [Edit people]│
│                                                                          │
│ 2  ROOM PREFERENCES                                                        │
│ Private bathroom       ( ) Required  (•) Preferred  ( ) No preference      │
│ Indoor sleeping        (•) Required  ( ) Preferred  ( ) No preference      │
│                                                                          │
│ 3  SHARING                                                                  │
│ [ Search families… ]                                                       │
│ ✓ Taylor family · mutual request     Rivera family · awaiting response    │
│                                                                          │
│ 4  WORKSHOPS                                                               │
│ Saturday morning · Alex   1. Pottery   2. Hiking   3. —                   │
│ Saturday morning · Jamie  1. Hiking    2. Archery  3. Pottery             │
│                                                                          │
│ 5  ANYTHING ELSE?                                                          │
│ [                                                                      ]   │
│ Organisers can read this note.                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

## Mobile variant (360px)

```text
┌──────────────────────────────┐
│ Attendee view       Saved ✓  │
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
│                              │
│ SHARING                       │
│ [ Search families… ]          │
│ ✓ Taylor family               │
│                              │
│ WORKSHOPS                     │
│ Alex · Saturday morning       │
│ [1 Pottery                 ]  │
│ [2 Hiking                  ]  │
│                              │
│ ANYTHING ELSE?                │
│ [                          ]  │
└──────────────────────────────┘
```

## Behavior and states

Save each change on input, show “Saving”, “Saved”, or a recoverable error, and
retain unsent input if the network fails. Empty workshop rankings and incomplete
people data are warnings, not invented validation rules. Before publication,
show an editable state; after publication this route becomes UI-04.

Controls need visible labels, grouped radio semantics, touch targets of at least
44px, keyboard navigation, and text equivalents for pending or mutual requests.

## Neobrutalist redesign and components

Make each numbered section a `Card` with a bold heading and small completion
`Badge`. Use `RadioGroup` for tri-state preferences, `Combobox` for family
search, `Checkbox` for child choices, `Select` for workshop ranks, and
`Textarea` for the note. Use `Sonner` for save feedback.

On mobile, cards remain stacked and controls become full-width. A picker uses a
`Drawer` or `Sheet`; the selected result stays visible as a bordered `Badge`
row.
