# Call for papers

This accepted source module is deferred from the active roadmap. It is not
selected by the Familienfreizeit 2027 profile.

Module id `call-for-papers` · factory `callForPapers`

Call for papers owns proposal intake and review. It contributes approved direct
`workshop` identities to the same official workshop boundary; it does not add a
second programme type, schedule identity, ranking cycle, or attendance model.

## 1. Dependencies and ownership

The module owns calls, submissions, proposer attribution, review state, selection,
and closure. It does not own official workshop content after approval, scheduling,
ranking values, or attendance assignments.

## 2. Lifecycle

Families and organisers may submit proposals. Organisers review, select, reject,
or close them. Approval creates or updates a direct workshop identity through the
ordinary event-backed workshop contract. A later content edit is a normal workshop
restatement and is visible live once workshop choice is open
([phases](../architecture/phases.md) §6).

The current choice cycle remains the only ranking scope. A proposal-source change
must therefore preserve or explicitly retire affected workshop identities and
explain any invalidated choices; it must not create parallel cycles implicitly.

## 3. Tests

Fixtures cover family and organiser submissions, review and closure, approved
workshop identity, source changes, choice-cycle compatibility, and rankings that
remain structured references to direct workshop ids.
