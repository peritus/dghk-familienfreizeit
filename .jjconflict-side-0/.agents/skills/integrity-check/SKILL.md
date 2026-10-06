---
name: integrity-check
description: Sweep this repository for merge conflicts, stale leftovers, import and quality regressions, build-budget failures, visual drift, and flaky tests; repair only failures with clear local fixes.
---

# Repository integrity check

Use this skill for a post-linearization or post-merge health sweep. Work from
the repository workspace, never from `$HOME/repositories/*`, and run project
commands through the repository's flake:

```sh
TMPDIR=/home/dev/tmp nix develop -c <command>
```

Use `jj`, never `git`. Do not rewrite history to repair an old conflicted
ancestor during an integrity sweep. Report ancestor conflict metadata
separately from unresolved conflicts at the current tip.

## Sweep order

1. Record the baseline and working-copy state:

   ```sh
   jj status
   jj diff --summary
   jj resolve -r @ --list
   jj log -r '@-' --no-graph -T 'change_id ++ " " ++ commit_id ++ " " ++ description.first_line() ++ "\n"'
   ```

   Scan the checked-out tree for conflict markers and patch leftovers. Also
   scan `::main` (or the active base bookmark) for revisions carrying conflict
   metadata; an unresolved current tree and historical conflict metadata are
   different findings.

2. Check tracked source hygiene: invalid or stale imports, references to
   missing files, `TODO`/`FIXME`/debug leftovers, duplicate route bases, and
   unexpected generated files. Prefer `rg --files` and `rg`. Treat explicitly
   gated diagnostic logging as a risk to report, not as an accidental leftover.

3. Run the cheap static gates through the flake:

   ```sh
   npm run format:check
   npm run test:docs
   npm run typecheck
   npm run lint
   ```

   Run `npm audit --omit=dev --json` separately from the full audit so
   production dependency risk is not confused with development-tool risk.

4. Run deterministic tests and artifact checks:

   ```sh
   npm test
   npm run bench:check
   npm run build
   npm run test:build
   npm run storybook:build
   npm run test:storybook
   npm run test:browser
   ```

   If the full browser or Storybook command cannot start because the flake
   lacks a browser executable, record that as an environment failure and do
   not call it a product pass. Do not silently substitute a global tool.

5. Classify failures before fixing them:

   - Re-run a suspected flaky test or focused file at least twice with the
     same flake command. Capture whether it fails with the same assertion,
     only under parallel/full-suite load, or only once.
   - A deterministic assertion mismatch is not a flaky test. Inspect the
     current UI or contract before updating a test or snapshot.
   - For visual tests, inspect an actual/diff image and confirm the mismatch
     is a deliberate current rendering change before regenerating snapshots.
   - For timeouts, isolate the test and then repeat the full command before
     changing timeouts or navigation behavior.
   - For bundle budgets, inspect the bundle graph first. Prefer moving an
     route-specific module behind a dynamic import or removing an accidental
     dependency over simply raising the budget.

6. Apply only repairs supported by that evidence. Keep tests aligned with the
   current interaction model (for example, open a dialog before querying its
   form) and preserve user-visible contracts. Do not mask failures with
   retries, broad timeout increases, ignored lint rules, or disabled tests.

7. Re-run the focused failing check, then the complete relevant gate. Before
   handoff, confirm:

   ```sh
   jj status
   jj diff --check
   jj diff --summary
   ```

   If files changed, use the repository's normal jj finalization workflow:
   describe and bookmark the work, leave a fresh clean `@`, run
   `jj git export --ignore-working-copy`, and prove the finalization gate. If
   no files changed, report that finalization was not required.

## Handoff format

Report the base revision checked, each gate's pass/fail or environment status,
the distinction between deterministic failures and flakes, repairs made, and
any findings intentionally left for later (such as historical conflict
metadata or dev-only advisories). Include the exact repeat count for flaky
test investigations and the final jj/bookmark/export proof when applicable.
