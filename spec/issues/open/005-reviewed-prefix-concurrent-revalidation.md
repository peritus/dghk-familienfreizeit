---
id: "005"
title: Reviewed-prefix confirmation lacks concurrent-live-state revalidation
status: needs-decision
severity: contract-contradiction
category: module:release-control
source: spec-review-2026-09-19
related_decisions: [D16]
related_milestones: [M9, M11, M14]
opened: 2026-09-19
---

# Reviewed-prefix confirmation has no concurrent-live-state contract

## Problem

[`application/release-control.md`](../../application/release-control.md) §7 (Detailed preview and confirmation) permits
confirmation of an older reviewed prefix despite newer events, while §5
requires the prospective family composition to satisfy mode, capacity and
participation invariants. Example: a mode-change review clears incompatible
sign-ups, then a family adds a sign-up under the still-communicated old mode
before confirmation. Validation only at the reviewed prefix misses the new,
now-incompatible live label.

A second framing of the same gap: "concurrent communication has contradictory
validation requirements" — the current contract explicitly permits confirmation
of the reviewed prefix after a concurrent append, while §5 also requires
prospective validation against live participation. The contract does not say
whether that validation is evaluated against the reviewed prefix, the current
head, or both, nor how the append-time check atomically prevents an invalid
combination. Example: an organiser previews switching a workshop from sign-up
to assigned; someone signs up before confirmation. Accepting the old preview
without a current-head check would retain an incompatible label.

The latest release-control text therefore resolves the question of whether every
head change invalidates a review: it says that unrelated concurrent appends do
not refresh the held diff. It does not resolve the remaining live-state race or
define the notification recipient result for that race.

## Recommendation

Preserve the reviewed held content, but atomically revalidate its composition
with current live participation at append time and reject new conflicts. The
alternatives are invalidating every review on any head change or blocking
relevant live writes during review. Select and document the concurrency rule
before M9/M11; include a race fixture and notification-recipient semantics.
This requires release-contract review, not an implicit implementation choice.

## Open questions

1. Atomic revalidation against live participation at confirm time,
   invalidate-on-any-head-change, or block live writes during review — which
   concurrency rule should [`application/release-control.md`](../../application/release-control.md) adopt?

## Related files

- [application/release-control.md](../../application/release-control.md)
