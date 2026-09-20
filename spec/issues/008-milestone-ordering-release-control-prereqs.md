---
id: "008"
title: M8/M9 need release-control prerequisites that ship in M12
status: open
severity: gap
category: process
source: spec-review-2026-09-19
related_decisions: [D16]
related_files:
  - ../roadmap.md
opened: 2026-09-19
---

# M8/M9 need release-control prerequisites that ship in M12

## Problem

M8/M9 (`../roadmap.md:156`) require communicated views and programme
admission, but the release-control machinery that makes those views safe to
show only appears in M12. These milestones cannot safely expose draft state
in the meantime — building them as currently ordered risks a window where
family-facing screens show data release control hasn't cleared yet.

## Recommendation

Move the minimal release-aware read/write prerequisites earlier in the
roadmap, or explicitly split M8/M9 into a private-development-surface phase
and a post-M12 acceptance phase. Review the ordering before M8; do not
bypass D16 to satisfy an earlier screen-completion gate.

## Open questions

1. Pull forward a minimal release-control read/write slice into M8/M9, or
   split those milestones into pre-M12 (private) and post-M12 (accepted)
   phases?
