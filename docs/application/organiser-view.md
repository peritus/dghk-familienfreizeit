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
| `/organiser/families` | Derived family table and manual invitation staging |
| `/organiser/families/:id` | Derived family detail, Add/Save/Delete person actions, and committed or draft event history |
| `/organiser/inventory` | Room-inventory buildings, rooms, beds, capacity, traits, cost summary, and creation staging |
| `/organiser/board` | Read-only deterministic family-to-room assignment review with browser-printable output |
| `/organiser/workshops` | Workshop landing view with lifecycle summary, authoring, audience filters, and typed leader selection |
| `/organiser/workshops/programme` | Derived one-placement-per-workshop programme review with unscheduled outcomes |
| `/organiser/workshops/slots` | Event-backed slot creation and retirement with overlap validation |
| `/organiser/workshop-spaces` | Physical workshop-space inventory and schedule-aware availability context |

The host exposes these kernel-owned and selected-module screens through one screen
registry. The room-inventory module registers the inventory screen, room-assignment
registers the board screen, and the selected workshop modules register the workshop
routes. Workshop navigation uses horizontal tabs while each tab remains independently
addressable and preserves the shared local-first draft state.

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

## Workshop behavior

Workshop actions stage ordinary `Workshop*`, `WorkshopSlot*`, and
`WorkshopSpace*` events in the shared local-first pipeline. The overview presents
the prototype's four lifecycle phases as a summary over independent workshop,
choice-cycle, programme, and allocation facts; it does not persist a phase enum.
The programme review derives one slot and one physical space per workshop and
keeps unscheduled workshops visible with a reason. Browser print is the only print
path; these screens add no export or print button. External leader contacts are
organiser-only, and cancelled workshops leave active planning while remaining
available to historical reports.

## Current limits

The active profile contains the kernel `role` trait, accommodation modules, and
the workshop planning modules. Assignment review and the narrow event-backed
fixed-assignment workflow are implemented. Fixed workshop attendance/placement
decisions, family-facing controls, generic reports, plan comparison, release, and
communication remain later scope.

The verified tests cover local derivation, immediate and drafting commit timing,
the inline draft workspace, apply-prefix acknowledgement, organiser log/apply
authorization, prospective replay rejection, stale-head responses, route loading, and
the public/private route boundary.
