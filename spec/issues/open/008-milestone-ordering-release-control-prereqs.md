---
id: "008"
title: M8/M9 need release-control prerequisites that ship in M11
status: open
severity: gap
category: process
source: spec-review-2026-09-19
related_decisions: [D16]
related_milestones: [M8, M9, M11]
opened: 2026-09-19
---

# M8/M9 need release-control prerequisites that ship in M11

## Problem

M8/M9 ([`roadmap.md`](../../roadmap.md#m8--family-authentication-and-preference-controls)) require
families to see communicated arrangements and use the effective communicated
programme for admission, but the release-control machinery that makes those
views safe to show is delivered in M11. The roadmap now names the release
dependency in M9 and lists historical composition in M11, but it still does not
say which M8/M9 work is private development-only and which family-facing
behavior is deferred until the M11 boundary exists. Building the milestones as
currently ordered risks a window where family-facing screens show draft state.

## Recommendation

Move the minimal release-aware read/write prerequisites earlier in the roadmap,
or explicitly split M8/M9 into a private-development-surface phase and a
post-M11 acceptance phase. Review the ordering before M8; do not bypass D16 to
satisfy an earlier screen-completion gate.

## Open questions

1. Pull forward a minimal release-control read/write slice into M8/M9, or
   split those milestones into pre-M11 (private) and post-M11 (accepted)
   phases?

## Related files

- [roadmap.md](../../roadmap.md)
