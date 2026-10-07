# Documentation workflow

[Repository policy](../../AGENTS.md#documentation-and-specification) is mandatory;
[D22](../../decisions.md#d22--documentation-follows-implementation-status) records
the rationale. The [docs index](../README.md) and [spec index](../../spec/README.md)
define their audiences and navigation.

## Classify by evidence

“Implemented” means present and verified in this repository, not deployed. Check
the source, configuration and relevant tests before stating behavior in `docs/`.
Report the boundary of that evidence: a local test is not hosted verification,
and a jsdom check is not a real-browser visual or accessibility audit.

Put outstanding requirements in `spec/`. Keep only the outstanding part of a
partially delivered topic there, with a link to its implemented foundation in
`docs/`. Use matching topic paths where useful; do not create empty scaffolding.
Keep code examples that depend on missing implementation in `spec/` with an
`.example.ts` suffix and an explanation of their missing dependencies. Linting
an example does not mean the application loads or typechecks it.

## Deliver a requirement

1. Implement and verify the requirement.
2. Document the delivered behavior and relevant limits under `docs/` in the same
   change. Put working runtime code in its normal source/configuration directory.
3. Remove the fulfilled requirement from `spec/`; retain and link outstanding
   portions, including unresolved questions and acceptance criteria. The roadmap
   is an outstanding-work index: after a milestone is delivered and verified,
   remove its complete entry rather than leaving a delivered-status summary.
   Describe the delivered scope and its limits under `docs/`.
4. Update indexes, roadmap, references and relevant tooling paths. Preserve stable
   decision and screen IDs. Version control keeps completed plans; neither
   directory needs an archive or duplicate authoritative description.
5. Run the documentation checks and the checks appropriate to the code change.

## Preserve requirements when reorganizing

Before a move or split, inventory every affected section. Account for each section
in the change review as one of:

- retained outstanding requirements, with their destination;
- implemented behavior documented with source/check evidence;
- duplicate content consolidated into a named authoritative destination.

Compare the original and resulting sections, not just file counts. Keep this
mapping in review notes rather than as historical commentary in specifications.
No requirement, acceptance criterion, unresolved question or binding decision may
be dropped or silently resolved by relocation. If an architectural decision needs
to change, follow its separate user-review gate before changing dependent text.

Active implementation belongs in roadmap milestones. Accepted requirements that
are outside the roadmap belong in [`spec/deferred-ideas/`](../../spec/deferred-ideas/README.md),
the sole canonical deferred-scope mechanism. A deferred contract is distinct
from a module not selected by a particular profile. Promotion requires explicit
user scope approval, review of affected binding decisions, and reinsertion into
an active roadmap milestone before implementation.

## Local link checks

`pnpm run check:docs` checks local Markdown file/directory destinations and heading
anchors. `pnpm run test:docs` exercises the checker and then checks the repository.
CI includes `test:docs`. Code examples are excluded from link extraction; links
to external URLs are not fetched. Root-relative paths resolve from the repository
root, and directory links are checked for existence.

The checker validates navigation, not whether a feature is implemented or a
requirement is preserved. Those remain source/test and review responsibilities.
