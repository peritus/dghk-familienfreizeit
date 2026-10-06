---
id: "041"
title: PersonUpdated cross-family authorization boundary
status: open
severity: privacy
category: kernel
source: Deep security review
related_decisions: []
related_milestones: [M10]
opened: 2026-10-03
---

# PersonUpdated cross-family authorization boundary

## Problem

Family principals must not update people outside their own family. The current
`PersonUpdated` authorization check uses the `family_id` submitted in the event
payload as the ownership target. A family can therefore name a person belonging
to another family while submitting its own family ID. The event fold accepts the
existing person and can rewrite that person's `member-of` relationship.

Family login and family writes are not live yet. This issue is a blocking
prerequisite: do not enable family users until this boundary is fixed and the
regression tests pass.

## Evidence

- [`authorization.ts`](../../../src/auth/authorization.ts) checks the submitted
  `family_id` for `PersonUpdated` (line 43).
- [`fold.ts`](../../../src/events/fold.ts) resolves the existing `person_id` and
  writes the submitted family relationship (lines 572–596).
- [`worker/index.ts`](../../../src/worker/index.ts) accepts authenticated event
  batches through the shared append path (line 213).

## Recommendation

1. Authorize `PersonUpdated` against the existing person's current family,
   using `person_id` as the ownership target. Do not authorize ownership from
   the submitted `family_id`.
2. Make the fold reject an ordinary person update when the existing person's
   family differs from the submitted family. A deliberate cross-family move,
   if ever required, must be a separate organiser-only event with a separate
   authorization rule.
3. Add regression coverage for the event authorization and API append path:
   - family A can update a person already belonging to family A;
   - family B receives `403` and appends nothing when naming family A's person;
   - forged or mismatched `family_id` values cannot reparent a person;
   - missing, withdrawn, and unknown person targets are rejected;
   - organisers retain the existing legitimate correction path;
   - the derived world is unchanged after every rejected attempt.
4. Keep this issue linked as an explicit M10 acceptance gate. The family login
   and family write UI must not be announced or enabled while it is open.

## Acceptance criteria

- A family principal can update only a person currently belonging to that same
  family.
- A family principal cannot move, rewrite, withdraw, or otherwise mutate a
  person belonging to another family through `PersonUpdated`.
- Rejected cross-family requests append no event and leave the derived world
  unchanged.
- Organiser updates continue to work.
- Unit and Worker/API regression tests cover the cases above.
- M10 family login remains blocked until these checks are green.

## Related files

- [application/authentication.md](../../application/authentication.md)
- [application/family-view.md](../../application/family-view.md)
- [roadmap.md](../../roadmap.md)
- [auth/authorization.ts](../../../src/auth/authorization.ts)
- [events/fold.ts](../../../src/events/fold.ts)
- [worker/index.ts](../../../src/worker/index.ts)
- [authorization tests](../../../test/config/authorization.test.ts)
- [Worker auth tests](../../../test/worker/auth.test.ts)
