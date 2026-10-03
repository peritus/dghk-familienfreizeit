# Implemented architecture

The repository contains a Vite/Cloudflare Worker runtime, the event and
authentication foundation, profile composition, generic labels, fixed resolver
operators and `derive(events, config)`, the organiser host with kernel family
surfaces, profile-driven organiser family controls, room inventory, workshop
planning, and deterministic assignment business logic. The room-assignment board
and workshop review surfaces are implemented organiser projections. Family
authentication, family-facing responses, generic reports, and release
communication remain future work; workshop family projections are separate from
the organiser planning slice.

## Runtime and build

[Vite configuration](../../vite.config.ts) composes React, Tailwind, the bundle
graph recorder and the Cloudflare plugin. `npm run build` emits `dist/client` and
`dist/dghk_familienfreizeit`. The browser alias `@/` resolves to `src/app/`.
The lockfile records the installed package versions; dependency examples in the
specification are not the installed compatibility matrix.

The [Worker](../../src/worker/index.ts) exposes `GET /api/health`, login and
magic-link redemption, principal inspection, and guarded family/organiser route
boundaries. `GET /api/health` executes `SELECT 1 AS ok` through the D1 binding and
returns `200` with its status and build/compatibility identities, or a sanitized
`503 {"status":"unavailable"}`.
Unknown Worker routes return JSON 404.

[Wrangler configuration](../../wrangler.jsonc) serves browser assets with SPA
fallback. Both bare `/api` and `/auth` prefixes and their descendants run through
the Worker first, so even top-level navigation to those paths cannot receive the
SPA HTML. D1 uses a local-only placeholder ID with `remote: false` and migration
`0001_m1_kernel.sql`. No hosted environment is configured.

## Implemented layout

| Path | Responsibility |
|---|---|
| `src/worker/` | Hono health endpoint and JSON fallback |
| `src/events/` | Kernel event schemas, fold, KDL adapter and D1 source |
| `src/auth/` | Magic links, sessions, rate limits and principals |
| `src/config/` | Active profile, trait builders and build identity |
| `src/modules/define.ts` | Module factory and defaulted parameter parsing |
| `migrations/` | Append-only event and operational D1 schema |
| `src/app/` | React entry, router, shared shell and route states |
| `src/app/family-view/` | Public welcome placeholder |
| `src/app/organiser/` | Lazy authenticated organiser host, shared draft reducer, kernel family screens, and assignment review routes |
| `src/app/components/shared/` | App-wide visual primitives, icons, and reusable patterns |
| `src/app/components/application/` | Public shell, route states, and application-boundary components |
| `src/app/components/shared/ui/` | Copied UI primitives |
| `src/modules/<module>/app/components/` | Module-owned visual components and their stories |
| `src/modules/<module>/app/screens/` | Module-owned screen compositions and their stories |
| `scripts/bundle-graph.ts` | Build import-graph metadata |
| `test/app/`, `test/worker/`, `test/build/` | App, Worker and emitted-output checks |
| `spec/profiles/` | Illustrative specification, not runtime configuration |

## Boundaries

The browser entry's complete static import closure excludes organiser, derive,
solver and Worker code; the organiser application is loaded lazily. Worker output
excludes browser code. [Tests](../engineering/testing.md) verify the emitted graph
and bundle size budgets. Kernel, authentication, profile-composition,
derived-world, inventory, and room-assignment tests cover the verified domain
behavior. `derive(events, config)` itself is
dependency-free pure TypeScript ([D26](../../decisions.md#d26--validation-boundary-and-pure-domain-core)),
enforced by lint rules over `src/events/fold.ts` and `src/events/resolver.ts`
([testing](../engineering/testing.md)).

Separate strict TypeScript projects check browser, Worker and build-tool code.
They enable `noUncheckedIndexedAccess`. Worker bindings are generated and committed
in [worker-configuration.d.ts](../../worker-configuration.d.ts); regenerate them
with `npm run typegen` when bindings or compatibility settings change.
The illustrative profile is intentionally outside these projects.

[Outstanding architecture](../../spec/architecture/overview.md) specifies the
domain layers and their integration with this foundation.
