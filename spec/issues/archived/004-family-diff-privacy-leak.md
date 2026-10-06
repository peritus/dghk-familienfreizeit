---
id: "004"
title: Family "changed" badge can reveal that an uncommunicated candidate exists
status: resolved
severity: privacy
category: module:release-control
source: coherence-audit-2026-09-19, spec-review-2026-09-19
related_decisions: [D16]
opened: 2026-09-19
---

# Family "changed" badge can reveal that an uncommunicated candidate exists

## Problem

This is the highest domain-privacy risk found across both review passes.

`deferred-ideas/release-control-ui.md:18-24` defines one badge vocabulary for every
surface: `✓` communicated, `?` changed since communication (confirmation
needed), `—` never communicated. [`ui/screens/family-assignment.md:44-46`](../../ui/screens/family-assignment.md) puts that
badge on family cards: "Every releasable room or workshop result carries the
shared `✓`, `?`, or `—` communication badge. Families can expand `?` to see
their own before/after result at the reviewed `input_seq`." [`application/family-view.md:82-84`](../../application/family-view.md)
repeats it.

This is set against: `application/release-control.md:99-100` ("No accommodation or
allocation is shown before its first communication"); `application/release-control.md:129`
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

## Resolution

Chose the first option from the open question: restrict family before/after
to communicated content only, with the badge itself also restricted rather
than left showing `?` over safe content. No D16 revision needed — this
fully realizes D16's existing rejected-alternative principle ("exposing the
entire current world reveals unfinished arrangements") rather than
reopening it, same pattern as issue 006's D4 realization.

Root cause: `application/release-control.md`'s `CommunicationScopeView` had one
`status: CommunicationScopeStatus` field reused verbatim by both audiences,
and stated outright that "both projections use the same status and diff
semantics." §6's derivation computes `status: 'changed'` and
`newer_events: true` by comparing current candidate (draft) content against
last communicated content — so `'changed'` is fundamentally a
draft-vs-communicated comparison, and showing it to a family (regardless of
what diff content is or isn't redacted underneath it) directly discloses
that an uncommunicated change exists.

Fix: introduced `FamilyScopeStatus = 'never-communicated' | 'communicated'`
and a distinct `FamilyScopeView` type in
`application/release-control.md` §1, computed solely from a scope's
`Communicated` event history — never from a comparison against current or
draft world state. It deliberately has no `'changed'` member, no
`current_input_seq`, and no `newer_events`, since all three are positioned
relative to live/draft state. When `communicated`, its `diff` compares the
two most recent communications (both already-released facts), matching what
the existing UI text described as "before/after result at the reviewed
`input_seq`" — that part of the design was already safe; only the badge's
status computation was the leak.

Updated four consumer surfaces to match:
1. `application/release-control.md` §6 ("Outstanding changes report") now states
   explicitly that its `status`/`newer_events` derivation against candidate
   content is organiser-only, producing `CommunicationScopeView`.
2. [`application/family-view.md`](../../application/family-view.md) ("Communicated arrangements") now describes
   `FamilyScopeStatus` and the communication-to-communication diff, instead
   of "the shared communication status."
3. [`ui/screens/family-assignment.md`](../../ui/screens/family-assignment.md) now describes the family's two-state
   badge (`✓`/`—`, no `?`), expanding to the previous-communication diff.
4. `deferred-ideas/release-control-ui.md`'s badge section is now explicitly
   organiser-only (renamed "Organiser inline status and diff"), with a new
   paragraph describing the family's separate two-state badge and explaining
   why no "newer changes exist" indicator may appear on any family-facing
   surface.
5. [`application/reports.md`](../../application/reports.md) now states that family/shared reports consume
   `FamilyScopeView`, never `CommunicationScopeView` — this was a third leak
   surface the investigation found, not cited in the original issue text.

Closing note, not further action: sibling issue 016 (missing `unavailable`
status for reproducibility mismatches) touches the same
`CommunicationScopeStatus` union but for an unrelated reason — `unavailable`
reflects the family's own historical reproducibility, not draft existence,
so it is not a privacy leak. `FamilyScopeStatus` can gain an `'unavailable'`
member in that issue's own pass without touching this fix.

## Related files

- `deferred-ideas/release-control-ui.md`
- [ui/screens/family-assignment.md](../../ui/screens/family-assignment.md)
- [application/family-view.md](../../application/family-view.md)
- `application/release-control.md`
- [application/reports.md](../../application/reports.md)
