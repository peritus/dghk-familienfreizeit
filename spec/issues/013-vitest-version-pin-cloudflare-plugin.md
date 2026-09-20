---
id: "013"
title: Vitest version pin doesn't match Cloudflare's current test integration
status: open
severity: drift
category: tooling
source: spec-review-2026-09-19
related_decisions: []
related_files:
  - package.json
  - vitest.config.ts
opened: 2026-09-19
---

# Vitest version pin doesn't match Cloudflare's current test integration

## Problem

Cloudflare's current Workers test integration requires Vitest 4.1, whereas
installing the latest Vitest resolves to major version 5. Cloudflare also
documents a successor package, `@cloudflare/vitest-plugin`, as the
migration path
(https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-to-vitest-plugin/).
Package metadata was checked; execution verification of the migration
remains outstanding. This changes no D9 boundary — it's a dependency-pin
correctness question, not an architecture question.

## Recommendation

Decide whether M0 pins Vitest at 4.1 with the current integration package, or
migrates to `@cloudflare/vitest-plugin` ahead of the ecosystem's forced
migration, and verify the chosen combination actually runs (not just that
package metadata resolves).

## Open questions

1. Pin Vitest 4.1 with the current integration, or move to
   `@cloudflare/vitest-plugin` now?
