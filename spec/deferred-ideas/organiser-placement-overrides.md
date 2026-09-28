# Organiser placement overrides

This document now defers only richer placement-override workflows. The active
room-assignment board implements the narrow fixed-assignment workflow described
in the module specification: it writes paired event-backed labels, re-derives
locally, keeps invalid fixed assignments visible, and offers removal through the
shared organiser draft pipeline.

Future UI may allow an organiser to express a room preference or broader forced
placement workflow through the existing event-backed label mechanism. It must use
the shared organiser draft/apply/discard pipeline, re-derive locally, preserve
solver diagnostics, and never become a second placement state store.

The former illustrative implementation is retained as non-executable examples:
[`ui/organiser-decisions.example.tsx`](ui/organiser-decisions.example.tsx),
[`ui/organiser-decisions.stories.example.tsx`](ui/organiser-decisions.stories.example.tsx),
The former UI-13 screen contract is retained in
[`organiser-placement-overrides-ui.md`](organiser-placement-overrides-ui.md).
