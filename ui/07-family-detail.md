# UI-07 — Family detail

## Audience, purpose, and route

An organiser checks people, current attendee preferences, notes, and the full
event history for one family. Route: `/admin/families/:id`. Governing spec:
[admin interface](../09-admin-interface.md) §3 and [data model](../02-data-model.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Families   Morgan family                                  [Invite link] │
├──────────────────────────────────────────────────────────────────────────┤
│ alex@example.com · last seen 14 Sep                                      │
│ PEOPLE                                                                    │
│ Alex Morgan · adult · 38       Jamie Morgan · child · 9     [Edit people]│
│                                                                          │
│ CURRENT PREFERENCES                                                       │
│ Private bathroom · preferred     Indoor sleeping · required              │
│ Wants to share with Taylor family                                        │
│                                                                          │
│ EVENT HISTORY                                                             │
│ 14 Sep 09:01 · This family · chose Indoor sleeping as required            │
│ 12 Sep 14:22 · Organiser Anna · added note about a courtyard window       │
└──────────────────────────────────────────────────────────────────────────┘
```

Separate attendee free text from admin-only notes. Loading, missing-family,
and stale-log states explain what happened and offer retry. History is prose,
not raw JSON, and is keyboard-readable in chronological order.
