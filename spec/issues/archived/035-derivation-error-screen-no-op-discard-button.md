---
id: "035"
title: Derivation-error screen shows a discard-drafts button that can be a no-op
status: resolved
severity: gap
category: ui
source: live testing of the inventory redesign (organiser-handoff follow-up session)
related_decisions: []
related_milestones: []
opened: 2026-09-26
---

# Derivation-error screen shows a discard-drafts button that can be a no-op

## Problem

When `deriveWorld` throws while deriving the organiser world,
[`OrganiserApp`](../../../src/app/organiser/organiser-app.tsx) falls back to a
generic error screen (the `!derivation.world` branch, currently around
lines 186–196). That screen unconditionally renders a button labelled
"Änderungsentwürfe verwerfen" that dispatches `{ type: 'discard' }`.

`discard` ([`organiserReducer`'s `discard` case](../../../src/app/organiser/state.ts))
only clears `state.drafts` and resets `change_mode`; it does not touch
`state.committed`. If the derivation failure comes from the **committed**
event log rather than from pending local drafts — for example, after a
profile/schema change makes an already-persisted event invalid under the
current configuration — there are zero drafts to discard. Clicking the
button dispatches `discard` anyway, the reducer produces a state that is
behaviourally identical to before (no drafts existed either way),
`derivation` recomputes from the same unchanged `state.committed`, throws
again, and the identical screen re-renders. From the user's point of view
the button visibly does nothing.

This was hit directly during manual testing: a local dev D1 database still
held events written under an older profile schema (removed room-capacity
label keys), so every screen showed "Die Änderungsentwürfe ergeben noch
keinen gültigen Ereignisstand." with an unconditional, ineffective discard
button. In that case the only real fix was clearing the local database,
not clicking anything in the UI — but the UI never said so.

## Evidence

- The error screen: `organiser-app.tsx` (`!derivation.world` branch), always
  renders the same `<Button ... onClick={() => dispatch({ type: 'discard' })}>
  Änderungsentwürfe verwerfen</Button>` regardless of whether any drafts
  exist.
- `draftCount(state)` (`src/app/organiser/state.ts`) is already the
  project's existing way to check this — it's used for exactly this
  purpose elsewhere, e.g. `src/app/organiser/save-status.tsx`.
- The same file already has a working precedent for the "nothing but a
  reload can help" case: the `load_error` branch a few lines above
  (`organiser-app.tsx`, "Neu laden" button calling
  `window.location.reload()`), and
  [`RouteBoundary`](../../../src/app/components/application/route-states.tsx) uses the
  identical reload pattern for its own unrecoverable-render fallback.

## Recommendation

Branch the `!derivation.world` screen on `draftCount(state) > 0`:

- **Drafts pending**: keep today's behaviour — current copy, "Änderungsentwürfe
  verwerfen" button dispatching `discard`. Discarding can genuinely resolve
  a conflict between committed and draft events in this case.
- **No drafts pending**: the problem is in the committed log itself, which
  discarding cannot affect. Show copy that doesn't imply drafts are the
  cause, and a "Neu laden" button (`window.location.reload()`) instead,
  matching the `load_error` branch's own pattern in the same file.

This is generic organiser-shell code, not specific to the inventory screen
that surfaced it — the fix applies to every organiser route.

## Resolution

The organiser derivation-error screen now offers draft discard only when
pending drafts exist. With no drafts, it identifies the stored event log as the
source of the failure and offers reload. Regression tests cover both actions in
[`derivation-error-state.test.tsx`](../../../test/app/derivation-error-state.test.tsx).

## Related files

- [ui/frontend.md](../../ui/frontend.md)
- [ui/design-system.md](../../ui/design-system.md)
