# Implemented room assignment

The selected `room-assignment` module is implemented and documented in
[`docs/modules/room-assignment.md`](../../docs/modules/room-assignment.md).
That document is authoritative for the verified whole-family placement solver,
derived organiser board, browser-printable assignment output, fixed-assignment
workflow, diagnostics, and test evidence. The event log remains the only
persisted domain state.

The sections below retain only boundaries and consumers that remain outside the
implemented module.

## 1. Purpose and boundary

The active module places whole families into rooms and places. Sleeping parties
and child rooms remain separate deferred modules:

- [`sleeping-parties`](../deferred-ideas/sleeping-parties.md)
- [`child-rooms`](../deferred-ideas/child-rooms.md)

Selecting either module changes the placement input and requires a coordinated
profile, solver, board, report, and fixture update.

## 8. Rules and scoring

The verified hard rules, scoring terms, and deterministic ordering are
implemented in the linked documentation. Future
placement modules must consume the normalized solver boundary rather than
interpreting raw profile labels or event payloads.

## 10. Output and diff

The implemented plan output is documented with the solver behavior. Explicit
plan comparison and closing the accommodation area are separate future
consumers; the current board is an organiser-only current-state projection.

## 11. Remaining consumers

The module currently contributes the organiser board and browser-printable
assignment output. The following remain outside this delivered scope:

- plan inspection and comparison, which is accepted but deferred in
  [`plan-inspection-and-comparison`](../deferred-ideas/plan-inspection-and-comparison.md);
- `AccommodationClosed` and `AccommodationReopened`, the closing review and the
  accommodation track ([phases](../architecture/phases.md) §4–5), and family/shared
  reports from the closed result, which belong to the M8 phase and M10
  family-access work.
