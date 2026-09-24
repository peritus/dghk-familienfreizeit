# Testing

## Checks and boundaries

`npm run ci` executes:

1. Local Markdown link/anchor checks and checker regression tests.
2. Separate strict browser, Worker and build-tool TypeScript projects, with
   `noUncheckedIndexedAccess` enabled.
3. ESLint naming and runtime-import rules, plus pure-domain clock/randomness/I/O
   restrictions for the later domain directories.
4. React/jsdom route, recovery and accessibility-state tests, and Worker tests
   running in workerd with a real isolated local D1 binding.
5. One Vite build producing `dist/client` and `dist/dghk_familienfreizeit`.
6. Tests of the emitted Worker, D1, SPA navigation and assets in Miniflare;
   negative lint-rule tests; emitted chunk-graph isolation and gzip budgets.
7. A Playwright Chromium route and link suite against the local Vite/Worker
   preview.

The browser entry's **entire static import closure**, including shared chunks,
must exclude organiser, solver, derive and Worker code. The Worker must exclude
browser components. Budgets are 150 KiB gzip for initial family JS, 100 KiB for
incremental organiser JS, and 32 KiB for all CSS. These are enforced initial
budgets, not claims about future feature sizes. The organiser chunk can reuse
the family entry's shared dependencies without counting them twice.

`worker-configuration.d.ts` is generated and committed. After changing Worker
bindings or compatibility settings, run `npm run typegen`, review the diff and
run CI. Application checks do not import the illustrative occasion profile:
its builders and modules are absent. It remains linted for naming and purity,
with negative tests covering the `spec/profiles/` location. Domain typechecking
extensions are specified in the [frontend specification](../../spec/ui/frontend.md#2-build-extensions).

Cloudflare's test integration is installed as `@cloudflare/vitest-plugin`, the
maintained successor to the Workers pool package named in the design examples.
The lockfile verifies Vite, Vitest, React, Wrangler and both Cloudflare plugins
together. The built-runtime tests pin Miniflare to the same release family and
use its exported compatibility adapter for asset routing options. See the
[Cloudflare testing documentation](https://developers.cloudflare.com/workers/testing/vitest-integration/)
and [Miniflare source](https://github.com/cloudflare/workers-sdk/tree/main/packages/miniflare).

Registry component source lives in `src/app/components/ui`; the registry and
aliases are configured in `components.json`. Attribution is in
[THIRD_PARTY.md](../../THIRD_PARTY.md). M0 checks semantic focus/error/loading behavior
in jsdom, not pixel appearance or real-browser keyboard layout.

## Browser route and link gate

`npm run test:browser` runs the Playwright Chromium suite against a local
`npm run dev` server. The runner waits for `/api/health`, reuses an existing
local server outside CI, and runs independent tests in parallel. Use
`npm run test:browser:headed` when diagnosing a navigation failure. CI installs
only Chromium and runs this suite as part of `npm run ci`; the Nix development
shell also provides a matching Chromium runtime for NixOS.

The route suite uses deterministic organiser API fixtures so link and client
navigation failures do not depend on magic-link delivery or database timing. A
small direct-navigation matrix still exercises Vite's SPA fallback and the
Worker-backed dev server. The pure route contract lives in
`src/organiser/routes.ts`, and every organiser link must use its builders. Tests
cover the registered route matrix, dashboard → families → family detail,
back/forward navigation, not-found recovery, duplicated `/organiser` segments,
and email-shaped family identifiers in URLs.

When adding an organiser route, add its definition and route builder first, use
the builder from the screen, and add the direct and linked navigation cases to
the browser route suite in the same change.

## Organiser local-first coverage

The organiser state and shell tests verify the shared event pipeline. They cover
collecting-mode activation, blocked deactivation with pending events, the inline
numeric draft review, local derivation before persistence, automatic immediate-mode
apply, apply-prefix acknowledgement when later clicks arrive in flight, preserved
pending events after failure, and promotion of an automatic failure into collecting
mode. These tests verify commit timing only; event schemas, authorization, replay, and
atomic append remain Worker responsibilities.


## Lint coverage

[ESLint configuration](../../eslint.config.js) enforces camelCase code identifiers,
PascalCase types and snake_case data properties, with exemptions for library
properties and kebab-case vocabulary keys. Browser imports exclude Worker code;
Worker imports exclude browser code. Pure-domain patterns reject clocks, random
values, I/O and imports of runtime-specific modules. The configured domain globs
are guards for matching files, not proof that the domain implementation exists.
[Negative tests](../../test/build/lint-boundaries.test.mjs) exercise these rules.
