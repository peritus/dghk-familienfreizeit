---
id: "034"
title: Module composition does not validate label ownership collisions
status: resolved
severity: gap
category: kernel
source: semantic-coherence-sweep-after-fix
related_decisions: []
related_milestones: [M2, M5, M6]
opened: 2026-09-25
---

# Module composition does not validate label ownership collisions

## Problem

The module contract requires profile composition to reject two kinds of label
ownership collision: two modules owning the same label key for the same entity
kind, and a profile trait using a key on an entity kind owned by a module.
`validateModules` currently checks module ids, dependencies, trait roles, entity
kinds, events, prefixes, routes, and reports, but not label-key ownership.

The validation view then concatenates module label schemas with profile traits,
allowing an invalid composition to reach runtime. No currently selected profile
exercises the missing check, so this is a latent extensibility failure.

## Evidence

- [`modules/contract.md`](../../modules/contract.md) lines 108–112 define
  per-(label key, entity kind) ownership.
- [`modules/contract.md`](../../modules/contract.md) lines 152–162 require
  composition to reject duplicate module label ownership and profile traits that
  overlap module-owned keys.
- [`define.ts`](../../../src/config/define.ts) lines 256–306 implement the
  composition checks but contain no label-key ownership or trait-scope check.
- [`define.ts`](../../../src/config/define.ts) lines 320–331 simply append module
  label schemas to the profile schemas.
- Existing module-boundary tests cover declared label writes, but no config test
  proves that module/profile ownership collisions fail at profile build time.

## Recommendation

Build an ownership index keyed by label key and entity scope during profile
validation. Reject duplicate module ownership and reject profile traits whose key
and scope overlap a module-owned key. Preserve same-key use on unrelated entity
kinds when the contract permits it, and add focused composition tests for both
valid and invalid combinations.

## Resolution

Profile composition now builds a per-(label key, entity scope) ownership index.
It rejects duplicate module ownership and rejects profile traits that overlap a
module-owned key on the same entity kind, while allowing the same key on an
unrelated scope. The validation runs before module schemas are appended to the
kernel validation view.

`test/config/profile.test.ts` proves duplicate module ownership, profile/module
overlap, and valid unrelated-scope reuse. This closes the composition gap needed
before M5 introduces its scoped inventory labels.

## Related files

- [modules/contract.md](../../modules/contract.md)
- [src/config/define.ts](../../../src/config/define.ts)
- [test/events/module-fold-boundary.test.ts](../../../test/events/module-fold-boundary.test.ts)
