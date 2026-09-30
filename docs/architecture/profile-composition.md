# Profile composition

The active profile is a statically composed TypeScript value exported from
[`src/config/index.ts`](../../src/config/index.ts). It is built with
`defineOccasionProfile`, which validates occasion metadata, localized trait
vocabulary, aliases, default values, and deterministic trait evaluators.

The executable `familienfreizeit-2027` profile supplies the kernel `role` trait,
the room-inventory profile traits and capabilities, and selects the accommodation,
family-preferences, and workshop planning modules. Family-facing trait metadata,
section ordering, deadline copy, and module-owned controls are validated as one
profile contract and rendered on the organiser family-detail screen.
The kernel consumes the composed view through `derive(events, config)`; it neither
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

Profile composition does not implement solver stages. The selected room-inventory
and workshop modules contribute entity kinds, events, labels, typed summaries, world
checks, solver stages, and organiser screens through the composed validation view.
Room assignment and workshop planning each contribute deterministic solver output
and review screens. Family authentication and family-facing response hosting
remain in the outstanding milestone specifications; the organiser-side family
controls are implemented from the same profile definitions.
