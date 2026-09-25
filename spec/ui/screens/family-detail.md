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
│ ┌──────────────┬──────────────┬───────────────┬────────────────────────┐ │
│ │ Vorname      │ Nachname     │ Rolle         │ Aktionen               │ │
│ │ [Vorname   ] │ [Nachname  ] │ [Rolle     ▼] │[Neue Person hinzufügen]│ │
│ │ [Alex      ] │ [Morgan    ] │ [Erwachsene▼] │[Speichern] [Löschen]  │ │
│ └──────────────┴──────────────┴───────────────┴────────────────────────┘ │
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
preferences, and history. The people section follows the shared editable-table
pattern: the first row adds a person, existing people are edited in place, and
Save/Delete actions stay in the same row. At narrow widths the table becomes
labeled person cards. History entries use a thick left border and actor
`Badge`, not colored timeline dots alone.

## Family identity

Place an editable family identity block beside the family heading. It shows the
current family `display-name` in a required text field with a clear save action.
This is the organiser-facing family name used by family lists, headings, plans,
and reports; it is distinct from the `family-name` field on each person.

Saving a changed value stages one `FamilyDisplayNameChanged` event through the
ordinary local-first draft, derivation, authorisation, and append path. Immediate
mode applies it automatically; drafting mode keeps it with the other local
drafts. The response and family history show the changed value only after the
append succeeds, while a failed or stale apply preserves the unsaved edit and
explains what happened. The event records the old value for readable history but
never changes `family_id`, person identities, memberships, email routing, or
relationship labels.

The control is organiser-only on this screen. It must not be implemented as a
generic `LabelSet`, because `display-name` is a kernel setup-owned label. Empty
values are rejected, and a no-op save does not emit an event.
