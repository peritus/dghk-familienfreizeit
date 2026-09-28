# Call for papers

This accepted module contract is deferred from the active roadmap. It is the
canonical specification for a future promotion; it is not selected by the
Familienfreizeit 2027 profile.

Module id `call-for-papers` · factory `callForPapers`

Call for papers owns the official proposal intake and review workflow. It is a
workflow module for Issue 025 only; it does not add a second programme type.

## 1. Dependencies and ownership

Requires [programme core](../modules/programme-core.md). It owns calls, submissions,
proposer attribution, review state, selection, closure, and immutable candidate
rounds. A selected round contains stable `programme-session` identities.

The module does not own official workshop content, scheduling, ranking values, or
attendance assignments.

## 2. Lifecycle

Families may submit proposals, and organisers may submit proposals on a family's
behalf. Organisers review proposals and explicitly select, reject, or close them.
Selection publishes an immutable candidate round. Replacing its membership
creates a new round; historical rankings remain tied to the old round and become
inactive rather than being reinterpreted.

Proposal content may be edited after selection. Such edits keep the session and
ranking identity stable and create ordinary programme release differences.

## 3. Tests

Fixtures cover family and organiser submissions, review and closure, immutable
round membership, a new round after a candidate-set change, and rankings that
remain attached to their original round.
