---
id: "028"
title: Cold lazy organiser route exceeds the app test timeout
status: open
severity: gap
category: tooling
source: semantic-coherence-sweep-after-fix
related_decisions: []
related_milestones: [M4]
opened: 2026-09-25
---

# Cold lazy organiser route exceeds the app test timeout

## Problem

The app test suite gives the direct organiser navigation test only the default
one-second Testing Library wait while the organiser application is loaded through
React lazy routing. In a cold full-suite run, the test can remain on the loading
skeleton until the assertion times out even though the route eventually works.

The failure makes the aggregate CI result dependent on transform/cache state and
obscures real route regressions.

## Evidence

- [`test/app/shell.test.tsx`](../../../test/app/shell.test.tsx) line 101 waits for
  `Was braucht heute Aufmerksamkeit?` immediately after opening `/organiser`.
- Two consecutive cold full-suite runs produced 80 passing tests and one failure
  at that assertion, with the DOM still showing `RouteLoading`.
- Running the same test in isolation passed.
- The production build, bundle/runtime tests, and all four Playwright route tests
  passed, showing that the failure is test timing rather than a confirmed runtime
  route failure.

## Recommendation

Make the app test deterministic without weakening the route contract: either
await a route-specific readiness signal with an explicit justified timeout, or
preload the lazy organiser module in the app test setup. Keep the assertion on the
dashboard heading and add a cold-cache or repeated-run check so the aggregate
suite remains reliable.

## Open questions

None.

## Related files

- [test/app/shell.test.tsx](../../../test/app/shell.test.tsx)
- [src/app/app.tsx](../../../src/app/app.tsx)
- [test/browser/routes.spec.ts](../../../test/browser/routes.spec.ts)
