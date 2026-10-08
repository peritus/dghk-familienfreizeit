# Workshop cancellation authoring and history

This contract is accepted but deferred, outside the active roadmap and the M8
acceptance gate. Promotion follows the [deferred-scope policy](README.md):
explicit user scope approval, review of affected binding decisions, and
reinsertion into an active roadmap milestone.

The event-backed workshop model, cancellation fact, organiser authoring
foundation, and current module behavior are documented in
[official workshops](../../docs/modules/official-workshops.md).
The remaining work is the organiser cancellation surface and its verification.

## Cancellation authoring and history

- Add an organiser action that emits the existing `WorkshopCancelled` event,
  including its optional reason, through the shared local-first workflow.
- Remove cancelled workshops from active planning and make their retained status
  accessible in a clearly labelled organiser history view.
- Keep cancellation feasibility in the derived attendance result; cancellation
  must not silently rewrite fixed or ranked attendance facts.
- Cover authoring, active-list exclusion, history visibility, replay, and resulting
  allocation diagnostics with fixtures and tests.

Acceptance: organisers can cancel a workshop with an optional reason, find the
cancelled workshop in labelled history, and inspect the resulting attendance
outcomes. The event and solver behavior already exist; the remaining work is the
organiser surface and its verification.
