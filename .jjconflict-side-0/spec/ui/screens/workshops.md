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
| Wünsche · Antworten | `/organiser/workshops/allocation` | ranked answers, explicit no-preference, and missing-answer states |
| Wünsche · Nachfrage | `/organiser/workshops/allocation/demand` | first-choice and ranked demand against capacity and placement |
| Wünsche · Verlauf | `/organiser/workshops/allocation/trace` | deterministic solver trace with explanatory outcomes |
| Workshoplisten | `/organiser/workshops/lists/workshops` | one printable roster per selected workshop, with capacity, leaders, and organiser-only sensitive fields |
| Personenpläne | `/organiser/workshops/lists/persons` | one selected person's slot-by-slot workshop plan |
| Familienpläne | `/organiser/workshops/lists/families` | one selected family's member-by-slot workshop plan |
| Raumpläne | `/organiser/workshops/lists/rooms` | one selected room's scheduled workshops, audience, and leaders |

The section navigation contains **Workshops**, **Programm**, **Wünsche**, **Räume und Slots**, and **Listen**. The
workshop overview groups **Workshops**, **Leitungen**, and **Externe Leitungen** as
local tabs, while **Programm** groups the three programme review URLs (**Ganzes
Programm**, **Nicht eingeplant**, and **Überschneidungen**) as page-local tabs, and
Räume und Slots groups the space and slot resource routes. The
The **Wünsche** entry is selected for all three allocation URLs and its tertiary
navigation contains **Antworten**, **Nachfrage**, and **Verlauf**. **Listen** has
the four URL-backed views above and defaults to the workshop roster.

The overview is the landing view. Participation review remains an outstanding
product view. Workshop allocation demand and solver traces are delivered through
the three allocation routes above.

The overview, programme and allocation screens render the same workshop track
from the [phase view](../../architecture/phases.md) §4:

```text
Workshops anlegen → Wahl öffnen → Zuordnung prüfen → Festgelegt
```

No screen derives a step from local facts. **Wahl öffnen** appends
`WorkshopChoiceOpened`; **Festlegen** opens the closing review and appends
`WorkshopsClosed`; **Wieder öffnen** appends `WorkshopsReopened`. While the area is
closed, the screens show the difference between the closed result and the current
derivation. There is one current choice cycle only.

## Overview behavior

The whole programme is shown by default, with filters. The shared `Alle`,
`Kinder`, and `Erwachsene` group filter applies to participation, demand, open
cases, and traces where the profile provides those groups. Authoring and space
inventory use their own profile fields instead.

Workshop cards show title, audience, age range, capacity, participation mode,
leaders, demand headline, placement state, and actionable attention. Cancelled
workshops are hidden from active planning and available in a labelled history
view. Workshop cards carry no phase badges; the track and the closed-area
difference carry that state.

The implemented authoring foundation is a compact editor dialog for title,
description, audience, age range, capacity, participation mode, resolver needs,
and leaders. Leaders use a typed searchable picker, with internal people and
existing external leaders visibly distinct. The overview stages complete
`WorkshopAdded` or `WorkshopUpdated` restatements through the shared local-first
pipeline. The **Externe Leitungen** view uses the same event-backed pipeline to create and
edit external leaders, including organiser-only phone metadata and one or more
available workshop slots; its list shows linked workshops and derived
availability labels. Cancellation remains outstanding authoring scope.

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

Rank count, assignment target, and unfulfilled-choice handling come from
profile/module configuration. The UI
renders those values and never embeds prototype constants. Per
[D31](../../../decisions.md#d31--automatic-workshop-attendance-is-limited-to-chosen-workshops),
unfulfilled choices remain unassigned rather than being filled with an
unchosen workshop.

Late ranking edits are accepted for the current choice cycle. A reviewed
calculation remains stable until the organiser explicitly recalculates and
reviews it. The local-first event draft/apply/discard pipeline and persistent
save status are used for every mutation.

Capacity reductions that would put current attendance above the new capacity
are blocked, per [D30](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces).

## Privacy boundary

Operational rosters may include health and emergency-contact data for the
organiser and assigned workshop leaders only. Confidentiality is explicit in
the report projection and on every printed page. External leader contact data
is organiser-only. The list reports remain organiser-only.

The prototype remains organiser-only. Family rankings, sign-up, interest, and
results use a separate companion design and privacy projection.

## Printing and visual system

There is no application print or export button. Browser printing is supported
through the shared print stylesheet. While the workshop area is open, lists print
the organiser plan without a data context label; once it is closed, they print the
closed result and name the closing time ([phases](../../architecture/phases.md) §7).

Use the neobrutalist design system, page-local section navigation, responsive cards and
accessible tables. All supported screen sizes are equally important. Strong
orange is reserved for actionable attention and is paired with text or a glyph;
warnings never rely on colour alone.
