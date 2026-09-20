---
id: "005"
title: Reviewed-prefix confirmation has no concurrent-live-state contract
status: needs-decision
severity: contract-contradiction
category: module:release-control
source: spec-review-2026-09-19
related_decisions: []
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
validation requirements" — confirmation validates the reviewed sequence, but
release consistency also depends on current participation. Example: an
organiser previews switching a workshop from sign-up to assigned; someone
signs up before confirmation. Accepting the old preview would retain an
incompatible label.

## Recommendation

Preserve the reviewed held content, but atomically revalidate its
composition with current live participation at append time and reject new
conflicts. Alternatives are invalidating every review on any head change, or
blocking relevant live writes during review. Select and document the
concurrency rule before M9/M12; include a race fixture and
notification-recipient semantics. This requires release-contract review, not
an implicit implementation choice.

## Open questions

1. Atomic revalidation against live participation at confirm time,
   invalidate-on-any-head-change, or block live writes during review — which
   concurrency rule should [`application/release-control.md`](../../application/release-control.md) adopt?

## Related files

- [application/release-control.md](../../application/release-control.md)
