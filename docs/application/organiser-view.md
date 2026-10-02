# Organiser view

The organiser application is an authenticated React host over the derived event
world. The browser receives the committed event log only for an organiser
principal, keeps unapplied draft changes in one reducer, and renders
`derive(committed + drafts)` locally. Every organiser click follows this local-first
path before persistence.

## Delivered routes

| Route | Behavior |
|---|---|
| `/organiser` | Dashboard with family/person counts, diagnostics, and draft-change status |
| `/organiser/families` | Derived family table and manual invitation staging from the header dialog |
| `/organiser/families/:id` | Derived family detail, family identity editing, profile-driven preference controls, Add/Save/Delete person actions, and committed or draft event history |
| `/organiser/accommodation` | Redirects to the accommodation inventory entry point |
| `/organiser/accommodation/inventory` | Room-inventory buildings, rooms, beds, capacity, traits, cost summary, and creation staging |
| `/organiser/accommodation/assignment` | Read-only deterministic family-to-room assignment review with browser-printable output |
| `/organiser/workshops` | Workshop landing view with lifecycle summary, workshop creation/editing, audience filters, and typed leader selection |
| `/organiser/workshops/programme` | Derived one-placement-per-workshop programme review with unscheduled outcomes |
| `/organiser/workshops/slots` | Event-backed slot creation, editing, and retirement with overlap validation |
| `/organiser/workshops/spaces` | Physical workshop-space inventory and schedule-aware availability context |
| `/organiser/workshops/allocation` | Workshop allocation answers (**Wünsche · Antworten**) |
| `/organiser/workshops/allocation/demand` | Workshop allocation demand (**Wünsche · Nachfrage**) |
| `/organiser/workshops/allocation/trace` | Workshop allocation trace (**Wünsche · Verlauf**) |

The host exposes these kernel-owned and selected-module screens through one screen
registry. The app bar presents four primary areas: Dashboard, Familien,
Unterbringung, and Workshops. Accommodation has page-local secondary links for
Unterkunft and Belegung. The workshop section navigation visibly links Workshops,
Programm, Wünsche, and Räume und Slots. Programm remains selected across its programme review
URLs, while Räume und Slots remains selected for its Räume and Slots resource routes,
and the workshop overview provides local tabs for Workshops, Leitungen, and
Externe Leitungen. Wünsche remains selected across its three allocation URLs, whose
tertiary views are Antworten, Nachfrage, and Verlauf. Teilnahme and Listen remain
reserved workshop areas and are not rendered until their screens exist. All routes
preserve the shared local-first draft state.

The board's browser print output is rendered from the same prospective assignment
review. Print media hides navigation and interactive review controls, then exposes
the assignment summary, data cut, unplaced-family reasons, diagnostic findings, and
room-by-room occupants and capacity. There is no separate report route or in-app
print control; organisers use the browser's print command.

## Local-first event workflow

Screen actions add grouped ordinary event drafts to the shared draft reducer. The
host derives the prospective world immediately, increments and briefly flashes the
draft-control count by the number of event records created, and then applies the session's
commit policy:

- Immediate mode is the default for a session and invokes the ordinary apply request
  automatically after local staging.
- Drafting mode is enabled by **Entwurfsmodus starten**. It keeps the same drafts in
  the browser until the organiser chooses **Entwürfe anwenden** in the draft workspace,
  which stays expanded as the final child inside the organiser header while drafting mode is active.

The immediate control uses a Lucide upload-cloud icon. The draft workspace uses a
Lucide cloud-with-pause icon and contains the numeric draft count. It explains that
drafts are local to this browser; other organisers cannot see them until **Entwürfe
anwenden** succeeds. **Entwürfe verwerfen** removes only browser-local drafts and exits
drafting mode. Route navigation preserves the drafting policy; a reload resets it to
immediate mode. Family history includes draft events and marks them as **Noch nicht
angewendet** until persistence succeeds.

Clicks made while an apply request is in flight stay after the submitted prefix. A
successful response acknowledges only its own prefix. A stale head or other failure
preserves local work; an automatic failure opens the draft workspace and switches to
drafting mode.

The Worker exposes `GET /api/organiser/log` and
`POST /api/organiser/apply`. Apply checks the build and compatibility identities,
replays the complete prospective stream before persistence, authorizes every
event, and appends with the expected event head. A stale head returns the
intervening events so the browser can re-derive while preserving its draft
work. Family principals receive no organiser log or apply access.

## Family detail controls

The family detail screen renders the selected profile's `family-preferences`
sections. Family-facing traits are grouped by their configured scope: family
traits edit the family entity, person traits repeat for each family member, and
module controls write the canonical labels supplied by their module. Organiser
changes use the same ordinary `LabelSet` and `LabelCleared` drafts as the later
family route. Accommodation and workshop sections show their configured
deadline and contact copy; a passed deadline is advisory and does not disable
editing.

The family identity field is separate from those generic labels. A changed,
non-empty value stages `FamilyDisplayNameChanged`, which replaces only the
family's display-name label after checking the recorded old value. A no-op does
not create an event, and the event history renders the old and new names while
preserving the family id, people, memberships, and email label.

## Workshop behavior

Workshop actions stage ordinary `Workshop*`, `WorkshopSlot*`, and
`WorkshopSpace*` events in the shared local-first pipeline. The overview presents
the prototype's four lifecycle phases as a summary over independent workshop,
choice-cycle, programme, and allocation facts; it does not persist a phase enum.
The workshop overview provides a focused add/edit dialog for the core workshop
fields, stages complete `WorkshopAdded` or `WorkshopUpdated` restatements, and
updates the prospective world immediately. Its searchable leader picker preserves
typed internal and existing external leader identities. The overview resolves
audience and participation labels, leader names, demand counts, and one derived
placement per workshop. The programme review derives one slot and one physical
space per workshop and keeps unscheduled workshops visible with a reason; its cells
show the actual day and do not expose a no-op action.
Slots derive occupancy counts, reject client-visible reversed/overlapping edits before
staging, and use the shared confirmation dialog for retirement. Space cards preserve
profile-derived capabilities and readable blocked-slot labels; capability editing is
still owned by the selected profile/module contract rather than a screen-local field.
Browser print is the only print path; these screens add no export or print button.
External leader contacts are organiser-only, and cancelled workshops leave active
planning while remaining available to historical reports.

Workshop allocation is a read-only projection over the current derived world and
solver plan. Antworten shows ranked, no-preference, and missing-answer states;
Nachfrage compares first choices and ranked demand with configured capacity and
placement; Verlauf shows deterministic stages and explanations for capacity, overlap,
leader, eligibility, cancellation, unscheduled, retention, and dropped cases. Group
filters, person tracing, responsive tables/cards, keyboard tertiary navigation, and
browser print use shared workshop components. Fixed violations and unassigned people
remain visible as review notices; the views do not create attendance or roster events.

## Current limits

The active profile contains the kernel `role` trait, accommodation modules, the
profile-driven organiser family controls, and the workshop planning modules.
Assignment review and the narrow event-backed fixed-assignment workflow are
implemented. Family authentication and family routes, fixed workshop
attendance/placement decisions, generic reports, plan comparison, release, and
communication remain later scope.

The verified tests cover local derivation, family display-name replacement,
profile control validation, rendered organiser family controls, immediate and
drafting commit timing,
the inline draft workspace, apply-prefix acknowledgement, organiser log/apply
authorization, prospective replay rejection, stale-head responses, workshop overview
labels and placement data, programme date grouping, retirement confirmation, route
loading, and the public/private route boundary. The full unit suite also checks that
the style-guide and screen fixtures derive a multi-state workshop catalogue.
