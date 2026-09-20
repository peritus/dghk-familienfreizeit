---
id: "014"
title: Design-system doc mentions asChild while Base UI uses the render API
status: open
severity: drift
category: tooling
source: spec-review-2026-09-19
related_decisions: []
related_files:
  - ../ui/frontend.md
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

Update the design-system composition recipe in `../ui/frontend.md` (or
wherever it lives) to describe the `render` API instead of `asChild`. Later
interactive controls must follow the `render` API and retain accessible
semantics.

## Open questions

None — this is a documentation correction once someone confirms the doc
location, not a design decision.
