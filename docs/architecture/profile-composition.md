# Profile composition

The active profile is a statically composed TypeScript value exported from
[`src/config/index.ts`](../../src/config/index.ts). It is built with
`defineOccasionProfile`, which validates occasion metadata, localized trait
vocabulary, aliases, default values, and deterministic trait evaluators.

The initial executable profile is deliberately kernel-only. Its `role` trait
supplies the M1 fold with a validation view, while selecting no domain module.
The kernel consumes that view through `derive(events, config)`; it neither
imports module registration nor inspects profile parameters.

Modules are defined with `defineModule`. Their Zod parameter schemas parse and
default configuration before contributions are composed. The profile rejects a
duplicate module, missing required dependency, duplicate entity/event/route/report
contribution, or a trait role whose selected trait has the wrong shape. A module
absent from the profile supplies no contribution.

`buildRevision` and `compatibilityRevision` are Vite constants shared by the
Worker and browser build. Deployment supplies `BUILD_REVISION` (or the Cloudflare
Pages commit variable); local builds use the checked-out JJ parent revision. The
compatibility revision is the hardcoded integer `1`. The health response includes
both values so a runtime can identify the Worker artifact it reached.

Profile composition does not implement module domain behavior, generic labels,
or solver stages. Those remain in the outstanding milestone specifications.
