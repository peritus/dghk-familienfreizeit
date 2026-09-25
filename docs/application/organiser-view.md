# Organiser view

The organiser application is an authenticated React host over the derived event
world. The browser receives the committed event log only for an organiser
principal, keeps unapplied draft changes in one reducer, and renders
`derive(committed + drafts)` locally. Every organiser click follows this local-first
path before persistence.

## Delivered routes

| Route | Behavior |
|---|---|
| `/organiser` | Dashboard with family/person counts, event-head status, diagnostics, and draft-change status |
| `/organiser/families` | Derived family table and manual invitation staging |
| `/organiser/families/:id` | Derived family detail, Add/Save/Delete person actions, and committed or draft event history |
| `/organiser/inventory` | Room-inventory buildings, rooms, beds, capacity, traits, cost summary, and creation staging |

The host exposes these kernel-owned and selected-module screens through one screen
registry. The room-inventory module registers the inventory screen; solver, workshop,
and report screens remain unselected.

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

## Current limits

The active profile currently contains the kernel `role` trait and the room-inventory
module. Assignment, reports, and family-facing controls remain outstanding.

The verified tests cover local derivation, immediate and drafting commit timing,
the inline draft workspace, apply-prefix acknowledgement, organiser log/apply
authorization, prospective replay rejection, stale-head responses, route loading, and
the public/private route boundary.
