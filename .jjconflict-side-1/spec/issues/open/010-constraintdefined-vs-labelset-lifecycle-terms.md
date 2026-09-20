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

## Evidence

`ConstraintDefined` is not an actual event type: [`architecture/events.md`](../../architecture/events.md)
defines only `FamilyInvited`, `FamilyEmailChanged`, `PersonAdded`,
`PersonUpdated`, `PersonWithdrawn`, `LabelSet`, and `LabelCleared`. A
repository-wide search finds `ConstraintDefined` used nowhere except this
issue and [issue 017](017-requirement-capability-resolver-representation.md:121).
Resolver vocabulary is declared at profile/code time, not through an event:
[`architecture/labels-and-constraints.md:242`](../../architecture/labels-and-constraints.md) already states "No event
defines or retires the token" for free-form organiser values, and fixed
vocabulary is compiled into modules/profiles (M2), never appended to the
event log.

[`ui/german-translation-guidelines.md:43-49,78-82`](../../ui/german-translation-guidelines.md) already gives a single,
consistent family-facing mapping for the two lifecycle actions that *are*
events: **Angabe machen / Angabe ändern** for `LabelSet`, **Angabe
aufheben** for `LabelCleared`, and **Vorgabe** for the calculated
constraint effect (explicitly "not a separate object that a family or
organising person defines"). There is no unreconciled "Definition" term in
active use anywhere in family-facing copy, because vocabulary declaration
is never shown to users.

## Recommendation

The premise of this issue was wrong: there is no third lifecycle action
("define a vocabulary entry") that emits an event or needs a German term,
so there is no three-way mapping to reconcile. The real gap is narrower —
a phantom event name has leaked into the specification. Concrete fixes:

1. Add one clarifying sentence to [`architecture/labels-and-constraints.md`](../../architecture/labels-and-constraints.md)
   near line 242 (end of "Free-form matching values"), stating explicitly
   that vocabulary declaration (fixed or free-form) is never represented by
   an event — only `LabelSet`/`LabelCleared` are — so future readers don't
   reintroduce `ConstraintDefined`.
2. Fix [`issues/open/017-requirement-capability-resolver-representation.md:121`](017-requirement-capability-resolver-representation.md),
   which also references `ConstraintDefined`; reword to "profile/fixed
   resolver vocabulary declaration" (config-time, not an event).
3. No change needed in [`ui/german-translation-guidelines.md`](../../ui/german-translation-guidelines.md) or
   [`architecture/events.md`](../../architecture/events.md) — both are already internally consistent for the
   two lifecycle actions that actually exist as events.
4. Re-file this issue's `severity` from `drift` to a doc-hygiene note once
   the clarifying sentence lands; the terminology itself was never actually
   inconsistent, only the belief that a third event exists.

## Related files

- [architecture/labels-and-constraints.md](../../architecture/labels-and-constraints.md)
- [architecture/events.md](../../architecture/events.md)
- [ui/german-translation-guidelines.md](../../ui/german-translation-guidelines.md)
