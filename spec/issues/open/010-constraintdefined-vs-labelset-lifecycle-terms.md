---
id: "010"
title: ConstraintDefined vs LabelSet lifecycle terminology is inconsistent
status: open
severity: drift
category: kernel
source: ad-hoc-terminology-review-2026-09-19
related_decisions: [D18]
opened: 2026-09-19
---

# ConstraintDefined vs LabelSet lifecycle terminology is inconsistent

## Problem

The distinction between *defining* a resolver vocabulary entry
(`ConstraintDefined`) and *applying*/*clearing* a decision label (`LabelSet`/
`LabelCleared`) is not consistently named across documents, including their
German equivalents. The terminology review's proposed German mapping is
Definition (defining), Vorgabe (applying/setting a decision), Angabe
setzen/aufheben (family-facing set/clear), but this has not been reconciled
against [`ui/german-translation-guidelines.md`](../../ui/german-translation-guidelines.md).

## Recommendation

Pick one consistent English/German term pair for each of the three
lifecycle actions (define a vocabulary entry / set a decision label / clear
a decision label) and apply it uniformly across [`architecture/labels-and-constraints.md`](../../architecture/labels-and-constraints.md),
[`architecture/events.md`](../../architecture/events.md), and [`ui/german-translation-guidelines.md`](../../ui/german-translation-guidelines.md).

## Open questions

1. Confirm the proposed German mapping (Definition / Vorgabe / Angabe
   setzen–aufheben) against existing usage in
   [`ui/german-translation-guidelines.md`](../../ui/german-translation-guidelines.md).

## Related files

- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [architecture/events.md](../../architecture/events.md)
- [ui/german-translation-guidelines.md](../../ui/german-translation-guidelines.md)
