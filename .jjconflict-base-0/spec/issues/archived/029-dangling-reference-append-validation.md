---
id: "029"
title: Append validation does not reject dangling entity references
status: resolved
severity: contract-contradiction
category: kernel
source: semantic-coherence-sweep-after-fix
related_decisions: []
related_milestones: [M3, M4, M5]
opened: 2026-09-25
---

# Append validation does not reject dangling entity references

## Problem

The label contract requires resolver values that name entities to resolve before
the event batch is appended. The implementation instead folded the batch,
converted an unresolved reference into a `kernel.dangling-reference` diagnostic,
and could persist the invalid label.

## Resolution

The append boundary now rejects error-severity `kernel.dangling-reference`
diagnostics after prospective replay. Organiser apply, generic event append, and
local batch preparation use the same `assertAppendableWorld` rule. References to
entities created in the same batch resolve successfully; references to absent or
withdrawn entities fail before storage. Derived worlds continue to retain the
diagnostic for read-side visibility.

No decision was changed. The implementation follows the existing append-time
validation contract in the labels and constraints specification.

## Related files

- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [architecture/events.md](../../architecture/events.md)
- [src/events/fold.ts](../../../src/events/fold.ts)
- [src/events/prepare.ts](../../../src/events/prepare.ts)
- [src/worker/index.ts](../../../src/worker/index.ts)
- [test/events/prepare.test.ts](../../../test/events/prepare.test.ts)
