---
id: "008"
title: M8/M9 need release-control prerequisites that ship in M10
status: resolved
severity: gap
category: process
source: spec-review-2026-09-19
related_decisions: [D16]
related_milestones: [M8, M9, M10]
opened: 2026-09-19
---

# M8/M9 need release-control prerequisites that ship in M10

## Problem

M8/M9 ([`roadmap.md`](../../roadmap.md#m8--organiser-authored-workshop-programme)) require
organiser-authored programme and scheduling behavior before families can safely
see communicated arrangements. The release-control machinery that makes those
views safe is delivered later, so the roadmap must distinguish private organiser
work from family-facing acceptance.

## Resolution

The roadmap now makes M8 and M9 organiser-only milestones. Family authentication,
family-facing controls, communicated arrangements, and release projections are
owned by M10. Families cannot log in during M8 or M9, and M10 is the first family
acceptance gate. D16 therefore remains the authority for family visibility.

## Related files

- [roadmap.md](../../roadmap.md)
