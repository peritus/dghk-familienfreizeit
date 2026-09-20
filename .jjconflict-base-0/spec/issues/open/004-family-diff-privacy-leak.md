---
id: "004"
title: Family "changed" badge can reveal that an uncommunicated candidate exists
status: needs-decision
severity: privacy
category: module:release-control
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: [D16]
opened: 2026-09-19
---

# Family "changed" badge can reveal that an uncommunicated candidate exists

## Problem

This is the highest domain-privacy risk found across both review passes.

[`ui/screens/release-control.md:18-24`](../../ui/screens/release-control.md) defines one badge vocabulary for every
surface: `✓` communicated, `?` changed since communication (confirmation
needed), `—` never communicated. [`ui/screens/family-assignment.md:44-46`](../../ui/screens/family-assignment.md) puts that
badge on family cards: "Every releasable room or workshop result carries the
shared `✓`, `?`, or `—` communication badge. Families can expand `?` to see
their own before/after result at the reviewed `input_seq`." [`application/family-view.md:82-84`](../../application/family-view.md)
repeats it.

This is set against: [`application/release-control.md:99-100`](../../application/release-control.md) ("No accommodation or
allocation is shown before its first communication"); [`application/release-control.md:129`](../../application/release-control.md)
(communicated content is "Fixed until a later communication supersedes that
scope; never join it to current draft descriptors"); and [`application/reports.md:71-72`](../../application/reports.md)
("A family report uses the release-control projection. It must not reveal
held arrangements or private constraint decisions.")

There is a defensible reading where both sides of the family diff sit at the
reviewed `input_seq`, revealing nothing held — but then the diff has no
content, and `?` by UI-11's own legend still announces to the family that an
unconfirmed change to their room exists, which an organiser's review is not
itself authorized to communicate (an organiser's review is not a
communication, per D16).

## Recommendation

Explicitly restrict family before/after values to communicated content;
pending organiser changes may have a non-content indication only (or none).
The alternative — a separately authorized preview-sharing capability — would
require reviewing D16 and its privacy consequences, and is a decision-review
matter, not an implicit implementation choice. Before M8/M12, add a test
proving a family's response cannot disclose an uncommunicated room or
workshop through a diff; no such projection exists yet in M0.

## Open questions

1. Restrict family before/after to communicated content only (badge without
   revealing content), or pursue an explicit, separately authorized
   preview-sharing capability that revisits D16?

## Related files

- [ui/screens/release-control.md](../../ui/screens/release-control.md)
- [ui/screens/family-assignment.md](../../ui/screens/family-assignment.md)
- [application/family-view.md](../../application/family-view.md)
- [application/release-control.md](../../application/release-control.md)
- [application/reports.md](../../application/reports.md)
