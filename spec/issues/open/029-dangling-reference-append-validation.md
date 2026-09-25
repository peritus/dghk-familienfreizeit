---
id: "029"
title: Append validation does not reject dangling entity references
status: open
severity: contract-contradiction
category: kernel
source: semantic-coherence-sweep-after-fix
related_decisions: []
related_milestones: [M3, M4]
opened: 2026-09-25
---

# Append validation does not reject dangling entity references

## Problem

The label contract requires resolver values that name entities to resolve before
the event batch is appended. The implementation instead folds the batch,
converts an unresolved reference into a `kernel.dangling-reference` diagnostic,
ignores that diagnostic in the append path, and can persist the invalid label.

This allows a relation such as `separates-from=fam_missing` to enter the event log
even though the contract promises a field-level append error. Later derivation
silently carries the invalid relation as a diagnostic rather than preventing the
invalid event from becoming durable state.

## Evidence

- [`labels-and-constraints.md`](../../architecture/labels-and-constraints.md)
  lines 167–174 require value shape validation and entity-reference resolution
  before append.
- [`resolver.ts`](../../../src/events/resolver.ts) lines 127–135 creates an error
  diagnostic for an unknown referenced entity instead of throwing a validation
  error.
- [`prepare.ts`](../../../src/events/prepare.ts) line 20 derives the prospective
  world but does not inspect its diagnostics before returning events.
- [`worker/index.ts`](../../../src/worker/index.ts) lines 238–245 likewise derives
  and appends without rejecting the dangling-reference diagnostic.
- [`labels-and-constraints.md`](../../architecture/labels-and-constraints.md)
  lines 347–352 describes the diagnostic as a fallback visibility mechanism,
  which conflicts with the stronger append-time rule above.

## Recommendation

Define one append-boundary rule for resolver diagnostics: error-severity dangling
references must fail the batch before storage, with a stable field-level error;
non-blocking diagnostics may remain visible in derived worlds. Apply the same
rule to organiser apply, generic event append, and local preparation, and add
tests for missing, withdrawn, and same-batch-created references.

## Open questions

None for the existing contract; the implementation should honor the append-time
validation rule already specified.

## Related files

- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [architecture/events.md](../../architecture/events.md)
- [src/events/resolver.ts](../../../src/events/resolver.ts)
- [src/events/prepare.ts](../../../src/events/prepare.ts)
- [src/worker/index.ts](../../../src/worker/index.ts)
