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
| `UI-06` · `/organiser/families` | Derived family table and manual invitation staging from the header dialog |
| `/organiser/families/:id` | Derived family detail shell; defaults to Zimmer and exposes the four family topics |
| `/organiser/families/:id/:topic` | Family topic route for `zimmer`, `personen`, `essen`, or `workshops` |
| `/organiser/families/:id/:topic/:person_id` | Person-scoped Personen, Essen, or Workshops route with an opaque person id |
| `/organiser/accommodation` | Redirects to the accommodation inventory entry point |
| `/organiser/accommodation/inventory` | Room-inventory buildings, rooms, beds, capacity, traits, cost summary, and creation staging |
| `/organiser/accommodation/assignment` | Deterministic family-to-room review, fixed-assignment action, and browser-printable output |
| `/organiser/workshops` | Workshop landing view with the workshop track, workshop choice and closing decisions, workshop creation/editing, audience filters, and typed leader selection |
| `/organiser/workshops/programme` | Derived one-placement-per-workshop programme review with unscheduled outcomes |
| `/organiser/workshops/participation` | Read-only responsive person-by-slot matrix with linked wish traces |
| `/organiser/workshops/slots` | Event-backed slot creation, editing, and retirement with overlap validation |
| `/organiser/workshops/spaces` | Physical workshop-space inventory and schedule-aware availability context |
| `/organiser/workshops/allocation` | Workshop allocation answers (**Wünsche · Antworten**) |
| `/organiser/workshops/allocation/demand` | Workshop allocation demand (**Wünsche · Nachfrage**) |
| `/organiser/workshops/allocation/trace` | Workshop allocation trace (**Wünsche · Verlauf**) |
| `/organiser/workshops/lists/workshops` | Selected workshop roster with placement, leaders, capacity, and confidential operational fields |
| `/organiser/workshops/lists/persons` | Selected person's slot-by-slot workshop plan |
| `/organiser/workshops/lists/families` | Selected family's member-by-slot workshop plan |
| `/organiser/workshops/lists/rooms` | Selected room schedule with audience and leaders |

The host exposes these kernel-owned and selected-module screens through one screen
registry. The app bar presents four primary areas: Dashboard, Familien,
Unterbringung, and Workshops. Accommodation has page-local secondary links for
Unterkunft and Belegung. The workshop section navigation visibly links Workshops,
Teilnahme, Wünsche, Räume und Slots, and Listen. Teilnahme contains shared
third-level tabs for Personen and Programm; Programm stays selected across programme review URLs. Räume und Slots remains selected for its Räume and
Slots resource routes, and the workshop overview provides local tabs for Workshops,
Leitungen, and Externe Leitungen. Wünsche remains selected across its three
allocation URLs, whose tertiary views are Antworten, Nachfrage, and Verlauf. Listen
provides four URL-backed document views and defaults to the workshop roster. All
routes preserve the shared local-first draft state.

The board's browser print output is rendered from the same prospective assignment
review. Print media hides navigation and interactive review controls, then exposes
the assignment summary, data cut, unplaced-family reasons, diagnostic findings, and
room-by-room occupants and capacity. There is no separate report route or in-app
print control; organisers use the browser's print command.

Family detail keeps the shared `PrimaryNavigation` in the organiser app bar. It
does not add a family-specific secondary navigation level: the four family
topics use `FamilyTopicNavigation`, a thin wrapper around the shared
`TertiaryNavigation`. Personen, Essen, and Workshops add a nested vertical
person selector inside their topic panel; that selector is not another global
navigation level.

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
immediate mode. Family list and detail projections include draft events and mark
them as **Noch nicht angewendet** until persistence succeeds.

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
changes use the same ordinary `LabelSet` and `LabelCleared` drafts as the
family-facing route. Accommodation and workshop sections show their phase's
Zieltermin, the late state with the section's late copy, or a **Festgelegt**
note while the area is closed; a passed Zieltermin never disables editing, and
organisers keep editing a closed area. A governed section is shown only while its
organiser [feature](../architecture/features.md) is effective.

The family identity field is separate from those generic labels. A changed,
non-empty value stages `FamilyDisplayNameChanged`, which replaces only the
family's display-name label after checking the recorded old value. A no-op does
not create an event, and the event payload preserves the old and new names while
preserving the family id, people, memberships, and email label.

The family list provides name, email, and person search; **Alle**,
**Angaben offen**, and **Vollständig** filters; count/status badges; a manual
invitation dialog; a responsive table that becomes labelled family cards; and a
resettable empty result state. Invitation and identity forms use the shared
dialog and ordinary draft workflow. There is no bulk import surface.

The family detail shell renders the prototype's four independently addressable
views:

- **Zimmer** uses the generic profile-driven room controls, including the
  explicit unanswered state, the sleeping-place count, infant bed toggles, and
  the deferred family room note with save/discard actions.
- **Personen** uses a person selector, add/edit form, role and integer age fields,
  and the shared destructive confirmation for `PersonWithdrawn`.
- **Essen** uses the same person selector and the generic person-scoped
  `diet` choice plus `food-note` free-text controls. Both write the configured
  labels through the family-preferences control system; there is no screen-local
  persisted food model or copied prototype data.
- **Workshops** derives official workshops for the selected person, renders up
  to three ranked wishes with reorder/remove actions, and separates assigned,
  sign-up, and interest sections. The finder provides search, unsuitable-item
  visibility, eligibility reasons, age/audience badges, capacity, and the
  corresponding ordinary label events.

All four views preserve the shared shell, URL-backed topic selection, accessible
tabs, empty states, and responsive narrow layout. Prototype-only save-failure
and artificial slow-save switches are not production controls, and the family
detail screen adds no print/export path.

## Workshop behavior

Workshop actions stage ordinary `Workshop*`, `WorkshopSlot*`, and
`WorkshopSpace*` events in the shared local-first pipeline. The overview,
programme and allocation screens render the workshop track from the derived
[phase view](../architecture/phases.md#organiser-surfaces); the overview offers
**Wahl öffnen** before choice opens and **Festlegen**, **Erneut festlegen** and
**Wieder öffnen** afterwards. No phase enum is persisted.
The workshop overview provides a focused add/edit dialog for the core workshop
fields, stages complete `WorkshopAdded` or `WorkshopUpdated` restatements, and
updates the prospective world immediately. Its searchable leader picker preserves
typed internal and existing external leader identities. The overview resolves
audience and participation labels, leader names, demand counts, and one derived
placement per workshop. The programme review derives one slot and one physical
space per workshop and keeps unscheduled workshops visible with a reason; its cells
show the actual day, mark fixed placements, and compare them with the automatic-only
counterfactual. Invalid fixed placements remain visible as blocking findings and do
not fall back silently. The allocation review applies the same shared comparison
to fixed attendance decisions, so organisers can see whether a fixed choice is
unchanged, overrides an automatic choice, has no automatic counterpart, or is
invalid. Both comparisons are derived from the current prospective world.
Slots derive occupancy counts, reject client-visible reversed/overlapping edits before
staging, and use the shared confirmation dialog for retirement. Space cards preserve
profile-derived capabilities and readable blocked-slot labels; capability editing is
still owned by the selected profile/module contract rather than a screen-local field.
Browser print is the only print path; these screens add no export or print button.
External leader contacts are organiser-only, and cancelled workshops leave active
planning. No organiser screen cancels a workshop or lists cancelled workshops.

Workshop allocation is a read-only projection over the current derived world and
solver plan. Antworten shows ranked, no-preference, and missing-answer states;
Nachfrage compares first choices and ranked demand with configured capacity and
placement; Verlauf shows deterministic stages and explanations for capacity, overlap,
leader, eligibility, cancellation, unscheduled, and dropped cases. Group
filters, person tracing, responsive tables/cards, keyboard tertiary navigation, and
browser print use shared workshop components. Fixed violations and unassigned people
remain visible as review notices; the views do not create attendance or roster events.

The **Teilnahme** route presents a person-by-slot overview derived from the same
prospective world and solver plan. Its accessible table has one person column and
equal-width slot columns. Cells show workshop titles with their rank, leader, sign-up,
interest, or fixed-assignment state; a dash marks no assignment in a slot. Rejected
choices stay in the allocation review, while this matrix shows the resulting
programme. People sort by German name, and names link to the person's allocation
trace. Narrow layouts show one card per person; browser print switches back to the
semantic table on A4 landscape, repeats the header and fixed date/revision footer,
and keeps rows together. The view follows the shared light and dark theme tokens.
It adds no print or export action and creates no attendance events.

Workshop list reports are read-only projections over the same world and plan as
every other organiser screen; there is no separate data context to select. They
follow the workshop HTML prototype's list views. Each of the four views (workshop
roster, person plan, family plan, room plan) has a picker for one document with
previous and next buttons; previous and next move focus to the new document's
heading, and each view keeps its own selection in the URL query. Slots read in the
short form "Fr 09:00–11:00"; documents carry a title and metadata lines, without a
kind or status header. A footer "Stand 6. Oktober 2026, 15:15 Uhr · v1396" (plus
"mit ungespeicherten Änderungen" while drafts exist) closes the page at the bottom
of the window.

- Workshop rosters cover placed workshops in programme order, grouped by slot in
  the picker. A one-line confidentiality notice sits above the picker. The
  metadata gives the long slot date, room, leaders (external ones marked
  "extern"), participants against capacity, audience and age range ("ab 18
  Jahren" when open-ended), and how many people have a health note. The table
  shows children's ages as numbers and adults as "erw.", and the person
  `food-note` as the confidential health column.
- Person plans are chosen by name search and list people and external leaders.
  Every configured slot shows the workshop, room, and role; fixed attendance is
  marked, external leaders show the workshops they lead and their available
  slots, and every empty slot of a person the resolver left unassigned shows
  **Offen** with the reason.
- Family plans show each member's workshop, room, and leadership per slot, with
  adults first and **Offen** in every empty slot of an unassigned member.
- Room plans list every slot, including empty ones.

Rosters and family plans switch to labelled cards when the list area is narrower
than 720px; person and room plans stay tables that scroll sideways. Placed
workshops in the Programm grid open their roster, and the traced person in
Wünsche › Verlauf links to their workshop plan.

Browser printing (Ctrl+P) prints only the selected document on A4: black on
white, without screen controls, with repeated table headers and rows that never
split. Rosters add an empty "Anwesend" column and a confidentiality line for
paper, the room plan prints larger for use as a door sign, and the footer is fixed
to the foot of every sheet in all browsers, with a print-only spacer row keeping
table rows clear of it. Print type sizes follow one scale relative to a 10pt base,
with the footer smallest. Every ancestor of the list prints as a plain block of
natural height, so no window-sized frame adds an empty sheet. Markers such as **Offen**, "leitet"
and "extern" print as black outlines on white so they survive greyscale printing.
There is no in-app print, download, or export action.

## Current limits

The active profile contains the kernel `role` trait, accommodation modules, the
profile-driven organiser family controls, and the workshop planning modules.
Assignment review, the narrow event-backed fixed-assignment workflow, opening
workshop choice, and closing and reopening both areas are implemented. Family
magic-link authentication and the minimal family principal endpoint are also
implemented; the family-facing application and full family view of closed results
remain later scope. Workshop fixed attendance and placement decisions are
supported by the event model and read-only review, but the organiser UI has no
controls to author or clear them; the scope question is tracked in
[issue 050](../../spec/issues/open/050-workshop-fixed-decision-authoring.md).
Non-workshop generic reports, plan comparison, and change notifications remain
later scope.

The verified tests cover local derivation, family display-name replacement,
profile control validation, rendered organiser family controls, immediate and
drafting commit timing,
the inline draft workspace, apply-prefix acknowledgement, organiser log/apply
authorization, prospective replay rejection, stale-head responses, workshop overview
labels and placement data, programme date grouping, retirement confirmation, route
loading, and the public/private route boundary. The full unit suite also checks that
the style-guide and screen fixtures derive a multi-state workshop catalogue.
