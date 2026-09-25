# UI-07 — Family detail

## Audience, purpose, and route

An organiser checks people, current family preferences, notes, and the full
event history for one family. Route: `/organiser/families/:id`. Governing spec:
[organiser view](../../application/organiser-view.md) §3 and [data model](../../architecture/data-model.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Families   Morgan family                                  [Invite link] │
├──────────────────────────────────────────────────────────────────────────┤
│ alex@example.com · last seen 14 Sep                                      │
│ PEOPLE                                                                    │
│ Alex Morgan · adult · 38       Jamie Morgan · child · 9     [Edit people]│
│                                                                          │
│ CURRENT PREFERENCES                                                       │
│ Private bathroom · preferred     Accessible room · no preference          │
│ Diet: 1 vegetarian, 1 with meat                                          │
│ ACCOMMODATION RELEASE  ✓ Communicated                                    │
│ [Show before/after diff]                                                  │
│                                                                          │
│ EVENT HISTORY                                                             │
│ 14 Sep 09:01 · This family · chose Private bathroom as preferred          │
│ 12 Sep 14:22 · Organiser Anna · added note about a courtyard window       │
└──────────────────────────────────────────────────────────────────────────┘
```

Show the shared communication badge and expandable privacy-projected diff for each
releasable scope affecting this family. Admins may see affected-family context and
communication actions; the family-facing projection remains read-only. Separate
family free text from organiser-only notes. Loading, missing-family,
and stale-log states explain what happened and offer retry. History is prose,
not raw JSON, and is keyboard-readable in chronological order.

## Neobrutalist redesign and components

Compose the page from `Breadcrumb`, `Card`, `Badge`, and `Tabs` for people,
preferences, and history. Use `Button` for editing and invite actions, with
`Dialog` for the edit form. History entries use a thick left border and actor
`Badge`, not colored timeline dots alone.
