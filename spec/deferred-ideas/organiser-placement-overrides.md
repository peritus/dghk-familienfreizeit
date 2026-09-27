# Organiser placement overrides

This is accepted but deferred scope. The active room-assignment module remains
responsible for deterministic placement, diagnostics, traces, and the ordinary
`LabelSet` capability described in the room-assignment and labels-and-constraints
specifications. This document defers only the prominent organiser UI for manual
placement overrides.

The exceptional UI may later allow an organiser to express a room preference or
forced placement through the existing event-backed label mechanism. It must use
the shared organiser draft/apply/discard pipeline, re-derive locally, preserve
solver diagnostics, and never become a second placement state store.

The former illustrative implementation is retained as non-executable examples:
[`ui/organiser-decisions.example.tsx`](ui/organiser-decisions.example.tsx),
[`ui/organiser-decisions.stories.example.tsx`](ui/organiser-decisions.stories.example.tsx),
The former UI-13 screen contract is retained in
[`organiser-placement-overrides-ui.md`](organiser-placement-overrides-ui.md).
