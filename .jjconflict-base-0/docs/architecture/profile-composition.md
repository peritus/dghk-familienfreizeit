# Profile composition

The active profile is a statically composed TypeScript value exported from
[`src/config/index.ts`](../../src/config/index.ts). It is built with
`defineOccasionProfile`, which validates occasion metadata, localized trait
vocabulary, aliases, default values, and deterministic trait evaluators.

`meta.public_landing` supplies the public occasion landing's localized heading
and introduction and its ordered actions. Each action has a localized label, an
`primary` or `secondary` emphasis, and either an internal route or an HTTPS URL.
This is presentation configuration: it selects links and their prominence but
does not define runtime behavior or add routes. External actions open in the
current tab.

The executable `familienfreizeit-2027` profile supplies the kernel `role` trait,
the room-inventory profile traits and capabilities, and selects the accommodation,
family-preferences, and workshop planning modules. Family-facing trait metadata,
section ordering, governing features and phases, late copy, and module-owned
controls are validated as one profile contract and rendered on the organiser
family-detail screen. Advisory target dates are typed `meta.phase_dates`.
The kernel consumes the composed view through `derive(events, config)`; it neither
imports module registration nor inspects profile parameters.

Modules are defined with `defineModule`. Their Zod parameter schemas parse and
default configuration before contributions are composed. The profile rejects a
duplicate module, missing required dependency, duplicate entity/event/route/report
contribution, or a trait role whose selected trait has the wrong shape. It also
validates [features](features.md#declaration-and-governance), their
`deselected_features` parameter and section governance, and
[phases](phases.md#phases-and-dates), their dates, and the areas modules close. A
module absent from the profile supplies no contribution.

`buildRevision` and `compatibilityRevision` are Vite constants shared by the
Worker and browser build. Deployment supplies `BUILD_REVISION` (or the Cloudflare
Pages commit variable); local builds use the checked-out JJ parent revision. The
compatibility revision is the hardcoded integer `1`. The health response includes
both values so a runtime can identify the Worker artifact it reached, and reports
the deployment's [operational feature bindings](features.md#operational-bindings)
separately as `feature_overrides`.

Profile composition does not implement solver stages. The selected room-inventory
and workshop modules contribute entity kinds, events, labels, typed summaries, world
checks, solver stages, and organiser screens through the composed validation view.
Room assignment and workshop planning each contribute deterministic solver output
and review screens. The Worker resolves family principals and currently returns
only the family ID from `/api/family/view`; the family application and its full
privacy-projected response remain in the outstanding milestone specifications. Organiser-side
family controls are implemented from the same profile definitions.

## Attention and capability namespaces

Selected modules contribute pure `attention_checks`. Profile compilation validates
this registry together with the core checks, including unique ownership, codes,
localization, scopes and areas. The composed evaluator and its coverage contract
are described in [composed attention](attention.md).

A module can declare `capability_token_prefixes` for its typed capability tokens.
Composition rejects empty or overlapping prefixes and builds the kernel's
`capability_token_consumers` lookup. Resolved requirements retain their consumer;
room assignment does not interpret workshop attendance tokens as room requirements.
Workshop assignment owns `fixed-workshop:`. Relationships remain generic labels
resolved by the configured resolver.
