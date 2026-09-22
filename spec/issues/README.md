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
related_decisions: [D4]          # decision IDs from decisions.md; omit/empty if none
related_milestones: [M12]        # roadmap milestone IDs; omit/empty if none
opened: YYYY-MM-DD
---

# <title, matches frontmatter>

## Problem

What's contradictory or missing, with file:line citations, each a real
Markdown link to the cited spec file (not a bare string or code span).

## Evidence

Quoted passages or a table, if the finding needs them to be legible.

## Recommendation

The reviewer's suggested resolution, stated as a recommendation — not
applied to the spec.

## Open questions

Numbered, only if the source posed explicit alternatives to choose between.

## Resolution

Only present once `status` is `resolved` or `rejected`: what was found or
changed, and why, with the same real-link citation style.

## Related files

Every spec file the issue concerns, as a clickable relative link, e.g.
`- [modules/room-assignment.md](../../modules/room-assignment.md)`. This
replaces what used to be a plain-string `related_files:` frontmatter list —
moving it into the body makes it both clickable and something
`npm run test:docs`'s link checker actually validates.
```

`status: needs-decision` marks anything that, per `AGENTS.md`, would need to
go through decision review before a spec file changes (it touches an
existing `D`-numbered decision, or would create a new one).

Naming: `NNN-slug.md`, zero-padded to 3 digits so lexicographic order equals
numeric order. Numbers are assigned once, sequentially, and are never
reused or renumbered after the fact — closing or rejecting an issue leaves
its number retired, it does not get filled by the next new issue.

Directory: `open/` holds `open`, `needs-decision`, and `in-progress` issues;
`archived/` holds `resolved` and `rejected` issues. Whenever an edit changes
an issue's `status` across that open/archived boundary, move the file into
the matching directory in the same change, and fix every relative link in
the file (the `## Related files` list and every inline citation) for the new
directory depth — every `../`-prefixed link gains or loses exactly one
`../` when the file moves one level in or out.
