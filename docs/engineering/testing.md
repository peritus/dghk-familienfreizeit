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

`pnpm run bench:check` runs the focused solver/request work gates and plan
equivalence test. These are ordinary tests under `test/solver/`, so
`pnpm test` — and therefore `pnpm run ci` — already runs them.

They assert different things, and neither measures time:

- [`work-budgets.test.ts`](../../test/solver/work-budgets.test.ts) counts how
  much work the solver does, and fails when a count exceeds its budget. It
  counts placement rule evaluations — the number of (family, room) pairs the
  search examines — and element reads on the three collections that inner loops
  have historically rescanned. The counts are produced by wrapping the rules in
  counting decorators and the collections in `Proxy` objects, so nothing in
  `src/` is instrumented by the gates. It also counts distinct placement-sweep
  contexts to catch rebuilding placement indexes per rejected room.
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

Additional ordinary tests protect the measured replay and attention hotspots:

- [Validation budgets](../../test/events/validation-budgets.test.ts) compare
  indexed answers with scans and reject whole-room/bed/place scans in replay.
- [Worker request replay budget](../../test/worker/performance.test.ts) ensures
  an organiser batch reads its log once and replays only the committed and
  prospective worlds, independently of batch size.
- [Attention budgets](../../test/solver/attention-budgets.test.ts) require one
  pass over trace, assignments, membership and rankings for the selected checks.
- [Attention equivalence](../../test/solver/attention-equivalence.test.ts) pins
  the complete attention output digest.
- [Performance adapter tests](../../test/events/performance-domain.test.ts)
  compare instrumented and ordinary computations; metrics, ingestion, exports
  and durable history have separate tests.

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

The [performance tracking guide](performance-tracking.md) documents the
computation lab, authenticated local HTTP lab, persistent results, 20k/50k
workloads, regression comparisons and Perfetto exports. Timed benchmarks are
separate from ordinary CI's deterministic cost and equivalence gates.

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

## Canonical KDL event fixtures

Authored event-log fixtures live under `test/fixtures/`, organized by domain.
The current workshop fixtures are:

- `workshop-assignment/prototype-catalogue.kdl` and
  `workshop-assignment/prototype-dataset.kdl` provide the catalogue and full
  prototype dataset. The prototype dataset intentionally has no fixed attendance.
- `workshop-assignment/ranked-fixed-contention.kdl` exercises a fixed decision
  claiming capacity before ranked rounds, deterministic competition and trace,
  explicit sign-ups, capacity reductions, and private facts. Its solver test
  verifies fixed attendance and sign-ups remain explicit while ranked outcomes
  recompute, and that family/shared projections omit private facts and opaque
  fixed-attendance identifiers.
- `workshop-assignment/slot-retirement.kdl` verifies that replaying a slot
  retirement moves a workshop placement to the next available slot.
- `workshop-assignment/kurszuordnung-v2.kdl` holds the previous year's wishes
  from the [Kurszuordnung_V2.xlsx analysis](../../spec/prior-art/kurszuordnung-v2.md):
  66 children, 13 courses, and 188 ordered wishes. Ages, capacities, and spaces
  are fixture assumptions stated in its header.
  [`workshop-assignment-kurszuordnung-v2.test.ts`](../../test/solver/workshop-assignment-kurszuordnung-v2.test.ts)
  adds placements and capacities as events and checks attendance outcomes for
  the spreadsheet's hand-made plan, the best plan found by exhaustive search, a
  capacity of 12 per course in both person-id orders, and automatic
  first-feasible placement with five and thirteen spaces. The automatic
  baseline is expected to change if placement starts reading wishes.
- `phases/workshop-lifecycle.kdl` exercises workshop choice, closing, reopening,
  and later person/workshop lifecycle events.

The M8 fixture cases are consumed by
[`workshop-review-fixtures.test.ts`](../../test/solver/workshop-review-fixtures.test.ts).
The closed-result tests separately verify that later input edits change the
current plan without rewriting a stored workshop snapshot.


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
