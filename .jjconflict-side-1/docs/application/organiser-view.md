# Organiser view

The organiser application is an authenticated React host over the derived event
world. The browser receives the committed event log only for an organiser
principal, keeps unapplied events in one reducer, and renders
`derive(committed + pending)` locally. Every organiser click follows this local-first
path before persistence.

## Delivered routes

| Route | Behavior |
|---|---|
| `/organiser` | Dashboard with family/person counts, event-head status, diagnostics, and pending-change status |
| `/organiser/families` | Derived family table and manual invitation staging |
| `/organiser/families/:id` | Derived family detail, Add/Save/Delete person actions, and committed or pending event history |

The host exposes these kernel-owned screens through the selected-profile screen
registry. Later module screens must register through the same host; no inventory,
solver, workshop, or report screen is registered by the kernel-only profile.

## Local-first event workflow

Screen actions add grouped ordinary event drafts to the shared pending reducer. The
host derives the prospective world immediately, increments and briefly flashes the
collecting-control count by the number of event records created, and then applies the session's
commit policy:

- Immediate mode is the default for a session and invokes the ordinary apply request
  automatically after local staging.
- Collecting mode is enabled by **Änderungen sammeln**. It keeps the same drafts in
  the browser until the organiser chooses **Anwenden** in the review panel, which
  stays expanded inline below the organiser header while collecting mode is active.

The collecting control uses an inline SVG ruler icon and contains the numeric event
count, including zero. The control remains visibly pressed while active and has no
hover movement. The connected **Local changes in this browser** section explains that
the drafts are actively collected only in this browser; other organisers cannot see
them until **Anwenden** succeeds. Clicking the control cannot leave collecting mode
until the drafts are applied or discarded. Discarding removes only browser-local
drafts. Route navigation preserves the collecting policy; a reload resets it to
immediate mode. Family history includes pending events and marks them as **Noch nicht
angewendet** until persistence succeeds.

Clicks made while an apply request is in flight stay after the submitted prefix. A
successful response acknowledges only its own prefix. A stale head or other failure
preserves local work; an automatic failure opens the review panel and switches to
collecting mode.

The Worker exposes `GET /api/organiser/log` and
`POST /api/organiser/apply`. Apply checks the build and compatibility identities,
replays the complete prospective stream before persistence, authorizes every
event, and appends with the expected event head. A stale head returns the
intervening events so the browser can re-derive while preserving its pending
work. Family principals receive no organiser log or apply access.

## Current limits

The active profile currently contains only the kernel `role` trait. Inventory,
assignment, reports, family-facing controls, and module-contributed screens are
specified separately and remain outstanding.

The verified tests cover local derivation, immediate and collecting commit timing,
the inline draft review, apply-prefix acknowledgement, organiser log/apply
authorization, prospective replay rejection, stale-head responses, route loading, and
the public/private route boundary.
