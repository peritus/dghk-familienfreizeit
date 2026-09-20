# Issue tracking

One markdown file per issue. This directory exists so specification findings
from reviews and audits accumulate in a uniform, greppable format instead of
scattered ad-hoc reports.

## Known gaps in this catalog

This index was seeded from three review passes: a coherence audit, a
spec-review pass, and two pre-existing standalone investigations. The
coherence audit's own headline table claims roughly 21 contract
contradictions, 18 gaps and 15 drift items across the whole repository;
only the concrete examples that actually reached this catalog's source
material are filed below (issues 001–014). The remaining findings from that
audit have not yet been transcribed — treat this index as a start, not the
complete findings set, until someone reconciles it against the full audit
output.

## File format

```markdown
---
id: "042"
title: <short, descriptive, no severity/status baked into the title>
status: open            # open | needs-decision | in-progress | resolved | rejected
severity: gap           # build-blocking | privacy | contract-contradiction | gap | drift
category: <kernel | module:<name> | ui | process | tooling>
source: <review/report this came from>
related_decisions: [D4]          # decision IDs from ../../decisions.md; omit/empty if none
related_files:
  - <spec file(s) the issue concerns>
opened: YYYY-MM-DD
---

# <title, matches frontmatter>

## Problem

What's contradictory or missing, with file:line citations.

## Evidence

Quoted passages or a table, if the finding needs them to be legible.

## Recommendation

The reviewer's suggested resolution, stated as a recommendation — not
applied to the spec.

## Open questions

Numbered, only if the source posed explicit alternatives to choose between.
```

`status: needs-decision` marks anything that, per `AGENTS.md`, would need to
go through decision review before a spec file changes (it touches an
existing `D`-numbered decision, or would create a new one).

Naming: `NNN-slug.md`, zero-padded to 3 digits so lexicographic order equals
numeric order. Numbers are assigned once, sequentially, and are never
reused or renumbered after the fact — closing or rejecting an issue leaves
its number retired, it does not get filled by the next new issue.

## Index

| ID | Title | Status | Severity | Source |
|---|---|---|---|---|
| [001](001-workshop-profile-unsupported-params.md) | Active profile passes workshop-assignment parameters the module doesn't define | needs-decision | build-blocking | coherence-audit, spec-review |
| [002](002-room-inventory-floor-enum-not-kebab-case.md) | Active profile's floor values fail their own module's kebab-case validation | open | build-blocking | coherence-audit |
| [003](003-organiser-workshops-route-collision.md) | Three modules contribute the same organiser route with no composition mechanism | open | build-blocking | coherence-audit |
| [004](004-family-diff-privacy-leak.md) | Family "changed" badge can reveal that an uncommunicated candidate exists | needs-decision | privacy | coherence-audit, spec-review |
| [005](005-reviewed-prefix-concurrent-revalidation.md) | Reviewed-prefix confirmation has no concurrent-live-state contract | needs-decision | contract-contradiction | spec-review |
| [006](006-solver-stability-repair-underspecified.md) | Room/workshop assignment don't fully realize D4's stability contract | needs-decision | contract-contradiction | coherence-audit, spec-review |
| [007](007-module-composition-runtime-boundary.md) | Module contributions mix pure definitions with browser/Worker code | open | gap | coherence-audit, spec-review |
| [008](008-milestone-ordering-release-control-prereqs.md) | M8/M9 need release-control prerequisites that ship in M12 | open | gap | spec-review |
| [009](009-deadline-concept-fields-underspecified.md) | Explicit deadline concept fields are not fully specified | open | gap | ad-hoc terminology review |
| [010](010-constraintdefined-vs-labelset-lifecycle-terms.md) | ConstraintDefined vs LabelSet lifecycle terminology is inconsistent | open | drift | ad-hoc terminology review |
| [011](011-space-scope-not-typed-entity.md) | "space" is used as a resolver scope but isn't a typed entity kind | open | gap | ad-hoc terminology review |
| [012](012-tag-vs-label-terminology.md) | "tag" and "label" are used inconsistently | open | drift | ad-hoc terminology review |
| [013](013-vitest-version-pin-cloudflare-plugin.md) | Vitest version pin doesn't match Cloudflare's current test integration | open | drift | spec-review |
| [014](014-design-system-composition-api-mismatch.md) | Design-system doc mentions asChild while Base UI uses the render API | open | drift | spec-review |
| [015](015-event-payload-label-folding-rules.md) | Event payload-to-label folding rules are underspecified | open | contract-contradiction | event-payload-folding-investigation |
| [016](016-unavailable-release-status-type-gap.md) | Unavailable release status is not a first-class state | needs-decision | gap | issue-2 (pre-existing) |
| [017](017-requirement-capability-resolver-representation.md) | Requirement/capability resolver representation is underspecified | open | gap | issue-5 (pre-existing) |
