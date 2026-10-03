---
id: "014"
title: Design-system doc mentions asChild while Base UI uses the render API
status: resolved
severity: drift
category: tooling
source: spec-review-2026-09-19
related_decisions: []
opened: 2026-09-19
---

# Design-system doc mentions asChild while Base UI uses the render API

## Problem

The design-system composition recipe mentions `asChild`, while the selected
Base UI components use the `render` composition API instead. M0 copied
registry source using the supported `render` API, so the shipped code is
correct — but the documentation still names the older pattern, which will
mislead whoever writes the next interactive control from the doc alone. See
Base UI's own composition reference:
https://base-ui.com/react/handbook/composition.

## Recommendation

Update the design-system composition recipe in [`ui/frontend.md`](../../ui/frontend.md) (or
wherever it lives) to describe the `render` API instead of `asChild`. Later
interactive controls must follow the `render` API and retain accessible
semantics.

## Open questions

None — this is a documentation correction once someone confirms the doc
location, not a design decision.

## Resolution

Resolved. The composition recipe lives in
[ui/design-system.md](../../ui/design-system.md), not in
[ui/frontend.md](../../ui/frontend.md) as the recommendation guessed; its
`AlertDialogTrigger` line now composes through Base UI's `render` prop, and
the section states that every interactive control uses that API and keeps the
primitive's accessible semantics. `asChild` appears nowhere else in the
repository. No code changed: the Button already wraps the Base UI primitive
([button.tsx](../../../src/app/components/shared/ui/button.tsx)), which
[docs/ui/design-system.md](../../../docs/ui/design-system.md) already records.

## Related files

- [ui/design-system.md](../../ui/design-system.md)
- [ui/frontend.md](../../ui/frontend.md)
