# Organiser view

The organiser application is an authenticated React host over the derived event
world. The browser receives the committed event log only for an organiser
principal, keeps unapplied events in one reducer, and renders
`derive(committed + pending)` locally.

## Delivered routes

| Route | Behavior |
|---|---|
| `/organiser` | Dashboard with family/person counts, event-head status, diagnostics, and pending-change status |
| `/organiser/families` | Derived family table, search, manual invitation staging, and CSV preview/import staging |
| `/organiser/families/:id` | Derived family detail, person add/edit/withdraw staging, and event history |

The host exposes these kernel-owned screens through the selected-profile screen
registry. Later module screens must register through the same host; no inventory,
solver, workshop, or report screen is registered by the kernel-only profile.

## Pending event workflow

Screen actions add grouped event drafts to the shared pending reducer. The host
derives the prospective world immediately. `Rückgängig` removes the most recent
group, `Verwerfen` clears all pending drafts, and `Anwenden` sends the complete
batch to the Worker.

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

The verified tests cover reducer grouping, local derivation, organiser log/apply
authorization, prospective replay rejection, stale-head responses, route
loading, and the public/private route boundary.
