# UI-08 — Inventory

The M5 route and its verified current behavior are documented in
[implemented room inventory](../../../docs/modules/room-inventory.md) and the
[implemented organiser view](../../../docs/application/organiser-view.md). The
screen uses the shared local-first event pipeline and is registered only when
`room-inventory` is selected.

The remaining UI work is intentionally downstream of M6: show plan-relative free
capacity and confirmation for changes that affect an existing assignment plan.
These enhancements must continue to use the existing route, event types, and
save-status workspace rather than introducing screen-local persistence.
