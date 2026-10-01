# UI-12 — Workshops

## Audience, purpose, and routes

This is the organiser-only workshop workspace. The prototype's product views
remain separate URLs with page-local workshop navigation:

| View | Route | Purpose |
|---|---|---|
| Workshop overview | `/organiser/workshops` | authoring, lifecycle summary, modes, demand headline, and attention items |
| Externe Leitungen | `/organiser/workshops/externe` | create and edit external leaders, their organiser-only contact metadata, linked workshops, and slot availability |
| Räume und Slots | `/organiser/workshops/spaces` | physical spaces, capacities, capabilities, and per-slot blocking |
| Slots | `/organiser/workshops/slots` | direct event-backed slot creation, retirement, and overlap validation; linked from Räume und Slots |

The section navigation contains only **Workshops** and **Räume und Slots**. The
workshop overview groups **Workshops**, **Leitungen**, and **Externe Leitungen** as
local tabs, while Räume und Slots groups the space and slot resource routes. The
planned product views **Wünsche**, **Teilnahme**, and **Listen** remain reserved and
are not rendered in navigation until their screens exist.

The overview is the landing view. Participation review, demand, solver traces,
and list/report views are product views reached from the workshop workspace and
may receive dedicated URLs as their implementation is delivered.

The four visible lifecycle summaries are:

```text
Workshops anlegen → Wahl offen → Zuordnung prüfen → Festgelegt
```

They summarize independent authoring, choice-cycle, calculation, attendance,
and schedule facts. Communication and release state belong to M10 and do not
appear in the M8 summary. The summary does not replace those states.
There is one current choice cycle only.

## Overview behavior

The whole programme is shown by default, with filters. The shared `Alle`,
`Kinder`, and `Erwachsene` group filter applies to participation, demand, open
cases, and traces where the profile provides those groups. Authoring and space
inventory use their own profile fields instead.

Workshop cards show title, audience, age range, capacity, participation mode,
leaders, demand headline, placement state, and actionable attention. Cancelled
workshops are hidden from active planning and available in a labelled history
view. M8 does not render communication status or release diffs; M10 owns
those release/review surfaces rather than workshop cards.

The implemented authoring foundation is a compact editor dialog for title,
description, audience, age range, capacity, participation mode, resolver needs,
and leaders. Leaders use a typed searchable picker, with internal people and
existing external leaders visibly distinct. The overview stages complete
`WorkshopAdded` or `WorkshopUpdated` restatements through the shared local-first
pipeline. The **Externe Leitungen** view uses the same event-backed pipeline to create and
edit external leaders, including organiser-only phone metadata and one or more
available workshop slots; its list shows linked workshops and derived
availability labels. Cancellation, publication, and other release operations
remain outstanding authoring scope.

Participation modes are profile-configured:

- assigned: rankings feed the deterministic attendance solver;
- sign-up: organisers see a live named list and capacity state;
- interest: organisers see a named interest list, while family sharing follows
  the separate family privacy projection; and
- self-organized: deferred and absent from the active profile.

## Outstanding programme and review behavior

The automatic scheduler is deterministic and explainable. It consumes resolved
multi-value needs/provides capabilities, space-slot blocks, availability,
capacity, leaders, and demand. Fixed attendance and fixed placement decisions
are supported by the domain and diagnostics even when the first UI exposes
automatic allocation only.

Rank count, fairness targets, minimum workshops, `top_n`, fill behavior, and
rank weights come from profile/module configuration. The UI renders those
values and never embeds prototype constants.

Late ranking edits are accepted for the current choice cycle. A reviewed
calculation remains stable until the organiser explicitly recalculates and
reviews it. The local-first event draft/apply/discard pipeline and persistent
save status are used for every mutation.

Capacity reductions that would put current attendance above the new capacity
are blocked, per [D30](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces).

## Privacy and lists

The organiser workspace can open these real product views:

- workshop roster;
- person plan;
- family plan; and
- room/space plan.

Operational rosters may include health and emergency-contact data for the
organiser and assigned workshop leaders only. Confidentiality is explicit in
the report projection and on every printed page. External leader contact data
is organiser-only.

The prototype remains organiser-only. Family rankings, sign-up, interest, and
results use a separate companion design and privacy projection.

## Printing and visual system

There is no application print or export button. Browser printing is supported
through the shared print stylesheet for the current or prospective organiser
plan, with the data context labelled. Released/effective printing belongs to
M10.

Use the neobrutalist design system, page-local section navigation, responsive cards and
accessible tables. All supported screen sizes are equally important. Strong
orange is reserved for actionable attention and is paired with text or a glyph;
warnings never rely on colour alone.
