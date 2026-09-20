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
in jsdom, not pixel appearance or real-browser keyboard layout. No visual/E2E
browser gate, formatter policy, or other sibling-repository house rule is adopted.


## Lint coverage

[ESLint configuration](../../eslint.config.js) enforces camelCase code identifiers,
PascalCase types and snake_case data properties, with exemptions for library
properties and kebab-case vocabulary keys. Browser imports exclude Worker code;
Worker imports exclude browser code. Pure-domain patterns reject clocks, random
values, I/O and imports of runtime-specific modules. The configured domain globs
are guards for matching files, not proof that the domain implementation exists.
[Negative tests](../../test/build/lint-boundaries.test.mjs) exercise these rules.
