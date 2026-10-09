# Testing

## Checks and boundaries

Test names, fixture filenames, and fixture directories are domain-oriented. Do
not encode roadmap milestone IDs or historical implementation labels in them;
use the domain concept instead.

`pnpm run ci` executes:

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
7. A repository-local Storybook index and Playwright visual suite covering every
   current component, application composition, and screen.
8. A Playwright Chromium route and link suite against the local Vite/Worker
   preview.

The browser entry's **entire static import closure**, including shared chunks,
must exclude organiser, solver, derive and Worker code. The Worker must exclude
browser components. Budgets are 150 KiB gzip for initial family JS, 200 KiB for
incremental organiser JS, and 32 KiB for all CSS. These are enforced budgets, not
claims about future feature sizes. The organiser chunk can reuse
the family entry's shared dependencies without counting them twice.

`worker-configuration.d.ts` is generated and committed. After changing Worker
bindings or compatibility settings, run `pnpm run typegen`, review the diff and
run CI. Application checks load the executable room-inventory profile. The
illustrative profile example remains outside the runtime build and is still
linted for naming and purity, with negative tests covering the `spec/profiles/`
location. Domain typechecking extensions are specified in the [frontend
specification](../../spec/ui/frontend.md#2-build-extensions).

Cloudflare's test integration is installed as `@cloudflare/vitest-plugin`, the
maintained successor to the Workers pool package named in the design examples.
The lockfile verifies Vite, Vitest, React, Wrangler and both Cloudflare plugins
together. The built-runtime tests pin Miniflare to the same release family and
use its exported compatibility adapter for asset routing options. See the
[Cloudflare testing documentation](https://developers.cloudflare.com/workers/testing/vitest-integration/)
and [Miniflare source](https://github.com/cloudflare/workers-sdk/tree/main/packages/miniflare).

Registry component source lives in `src/app/components/shared/ui`; the registry and
aliases are configured in `components.json`. Attribution is in
[THIRD_PARTY.md](../../THIRD_PARTY.md). M0 checks semantic focus/error/loading behavior
in jsdom, not pixel appearance or real-browser keyboard layout.

## Solver cost gates

`pnpm run bench:check` runs the two gates that protect derivation cost. Both are
ordinary tests under `test/solver/`, so `pnpm test` — and therefore
`pnpm run ci` — already runs them; the script exists to run just those two when
that is all you want.

They assert different things, and neither measures time:

- [`work-budgets.test.ts`](../../test/solver/work-budgets.test.ts) counts how
  much work the solver does, and fails when a count exceeds its budget. It
  counts placement rule evaluations — the number of (family, room) pairs the
  search examines — and element reads on the three collections that inner loops
  have historically rescanned. The counts are produced by wrapping the rules in
  counting decorators and the collections in `Proxy` objects, so nothing in
  `src/` is instrumented.
- [`request-budgets.test.ts`](../../test/solver/request-budgets.test.ts) counts
  the same way for the request path: how many elements an authorized append and
  an email lookup read from the bucket arrays that previously hid linear scans.
  Both now read none because the paths use `entity_kind_by_id` and
  `family_id_by_email`; the budgets are small absolute numbers rather than
  ratios. The fixtures proxy both the `family` entity bucket and the `email`
  label bucket, so reverting either lookup to `.some(...)` or `.find(...)`
  fails the gate even when the target happens to be near the front.
- [`placement-equivalence.test.ts`](../../test/solver/placement-equivalence.test.ts)
  digests a whole plan, both solve passes, and compares it with a recorded
  value. Cost work must not change an answer, and this is what says so.

**A wall-clock budget is deliberately not part of CI.** Timings from a shared
runner are either loose enough to miss a real regression or tight enough to fail
on a busy machine, and a gate that does both gets muted. What has actually
regressed in this area is how often the code walks a collection, which is
deterministic and identical on every machine. `pnpm run bench` remains the tool
for comparing wall clock between two runs on one machine.

Budgets are tripwires, not targets. Tripping one means either a regression or a
deliberate change to how the search works; in the second case the budget is
updated in the same change as the code, with the new measurement recorded beside
it. The margins are wide. Reintroducing one per-candidate constraint scan took
`constraint_reads` from 64 to 27904 against a budget of 192; an accidental
candidate-room scan previously took `rule_evaluations` to 25100 against a
budget of 11000.

## Derivation benchmarks

`pnpm run bench` runs `test/bench/` under its own
[Vitest configuration](../../vitest.bench.config.ts). It is deliberately outside
`pnpm run ci`: it measures cost rather than asserting behavior, and wall-clock
timings from a shared runner are not a gate anyone should block a merge on.

`test/bench/log.ts` generates a deterministic event log valid for the
`familienfreizeit-2027` profile. It scales what grows between occasions —
rooms, beds, workshops, families, persons, rankings and stated needs — and holds
the programme grid fixed, because slots and spaces are bounded by the length of
the occasion rather than by attendance. Rooms carry both their `exactly-one`
traits so measurements are not distorted by thousands of cardinality
diagnostics.

Two environment variables select the run:

- `DGHK_BENCH_FACTORS=1,2,4` — the scale factors to sweep (default `1,2,4`).
- `DGHK_BENCH_STAGES=derive` — which stages to time. `solve` costs orders of
  magnitude more than the others and grows faster, so measuring the fold at a
  large log size means leaving it out.

When `solve` is timed, each solver stage and the preflight pass are timed
separately as well, in the order `solve` itself runs them. The total on its own
does not say which stage spends the time, and the stages differ by more than two
orders of magnitude.

Each sweep reports a growth exponent between consecutive factors: a linear stage
tracks the event growth and reports roughly `1.0`, a quadratic one reports
roughly `2.0`. That number, not a single absolute timing, is what makes a
complexity regression visible on a machine whose absolute speed is unknown.

## Browser route and link gate

`pnpm run test:browser` runs the Playwright Chromium suite against a local
`pnpm run dev` server. The runner waits for `/api/health`, reuses an existing
local server outside CI, and runs independent tests in parallel. Use
`pnpm run test:browser:headed` when diagnosing a navigation failure. CI installs
only Chromium and runs this suite as part of `pnpm run ci`; the Nix development
shell also provides a matching Chromium runtime for NixOS.

The route suite uses deterministic organiser API fixtures so link and client
navigation failures do not depend on magic-link delivery or database timing. A
small direct-navigation matrix still exercises Vite's SPA fallback and the
Worker-backed dev server. The pure route contract lives in
`src/organiser/routes.ts`, and every organiser link must use its builders. Tests
cover the registered route matrix, including inventory, dashboard → families → family detail,
back/forward navigation, not-found recovery, duplicated `/organiser` segments,
and email-shaped family identifiers in URLs.

The app shell tests preload the lazy organiser module in test setup before
asserting direct organiser navigation. The built browser route suite remains
the check for real lazy-chunk navigation.

When adding an organiser route, add its definition and route builder first, use
the builder from the screen, and add the direct and linked navigation cases to
the browser route suite in the same change.

## Storybook visual contract

`pnpm run storybook:build` verifies that the local Storybook documentation and
stories compile. `pnpm run test:storybook` starts Storybook locally and runs
`test/storybook/style-guide.spec.ts`: it matches the Storybook index one to one
against `src/app/design/ui-coverage.ts`, so an unregistered story fails the run,
and compares every component, application composition, and screen entry with
its committed Playwright PNG unless the entry records a snapshot exemption. The
Nix development shell supplies Chromium, so this gate remains local and needs
no hosted visual-regression account or MCP service.

Use `pnpm run test:storybook:update` only after reviewing an intentional visual
change. The style-guide MDX page documents why/when decisions; the TypeScript
stories and snapshots verify what the browser actually renders.

## Organiser local-first coverage

The organiser state and shell tests verify the shared event pipeline. They cover
drafting-mode activation, blocked deactivation with draft events, the inline
numeric draft workspace, local derivation before persistence, automatic immediate-mode
apply, apply-prefix acknowledgement when later clicks arrive in flight, preserved
draft events after failure, and promotion of an automatic failure into drafting
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

## Verification servers in concurrent workspaces

Playwright defaults to ports 5173 for the app and 6006 for Storybook. Set
`PLAYWRIGHT_APP_PORT` and `PLAYWRIGHT_STORYBOOK_PORT` to unused ports when another
workspace is running its own servers. `CI=1` disables existing-server reuse, so
verification starts servers from the checked-out workspace. Run browser and
Storybook suites sequentially: both manage the same `test-results` directory.
