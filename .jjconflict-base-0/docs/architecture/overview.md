# Implemented architecture

The repository contains the runtime foundation: one Vite build produces a
Cloudflare Worker and a React browser application. It has no domain event store,
profile loader, derivation or solver implementation.

## Runtime and build

[Vite configuration](../../vite.config.ts) composes React, Tailwind, the bundle
graph recorder and the Cloudflare plugin. `npm run build` emits `dist/client` and
`dist/dghk_familienfreizeit`. The browser alias `@/` resolves to `src/app/`.
The lockfile records the installed package versions; dependency examples in the
specification are not the installed compatibility matrix.

The [Worker](../../src/worker/index.ts) exposes `GET /api/health`. It executes
`SELECT 1 AS ok` through the D1 binding and returns `200 {"status":"ok"}` or a
sanitized `503 {"status":"unavailable"}`. Unknown Worker routes return JSON 404.
This probes availability, not an application schema or persisted domain state.

[Wrangler configuration](../../wrangler.jsonc) serves browser assets with SPA
fallback. Both bare `/api` and `/auth` prefixes and their descendants run through
the Worker first, so even top-level navigation to those paths cannot receive the
SPA HTML. D1 uses a local-only placeholder ID with `remote: false`; no credentials
or migrations are needed for the foundation. No hosted environment is configured.

## Implemented layout

| Path | Responsibility |
|---|---|
| `src/worker/` | Hono health endpoint and JSON fallback |
| `src/app/` | React entry, router, shared shell and route states |
| `src/app/family-view/` | Public welcome placeholder |
| `src/app/organiser/` | Lazy public organiser placeholder |
| `src/app/components/ui/` | Copied UI primitives |
| `scripts/bundle-graph.ts` | Build import-graph metadata |
| `test/app/`, `test/worker/`, `test/build/` | App, Worker and emitted-output checks |
| `spec/profiles/` | Illustrative specification, not runtime configuration |

## Boundaries

The browser entry's complete static import closure excludes organiser, derive,
solver and Worker code; the organiser application is loaded lazily. Worker output
excludes browser code. [Tests](../engineering/testing.md) verify the emitted graph
and bundle size budgets. These checks cover the existing foundation; they do not
prove behavior of domain layers that do not exist.

Separate strict TypeScript projects check browser, Worker and build-tool code.
They enable `noUncheckedIndexedAccess`. Worker bindings are generated and committed
in [worker-configuration.d.ts](../../worker-configuration.d.ts); regenerate them
with `npm run typegen` when bindings or compatibility settings change.
The illustrative profile is intentionally outside these projects.

[Outstanding architecture](../../spec/architecture/overview.md) specifies the
domain layers and their integration with this foundation.
