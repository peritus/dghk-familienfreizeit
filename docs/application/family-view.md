# Family application

The authenticated family app lives at `/family`; `/organiser` is its peer app.
Both use [the same login and session](authentication.md). `/login` reads
`GET /api/me`, enters the sole available view, or offers equal role choices when
the email is both invited and on the organiser allowlist. Authenticated headers
have no role-switch control; Back can return to login choices and direct URLs
remain authorized by current membership.

## Shared presentation and adapters

The four topics **Zimmer**, **Personen**, **Essen**, and **Workshops** reuse one
[neutral family-detail component](../../src/app/components/family-detail/family-detail.tsx).
It receives `FamilyDetailData` and `FamilyDetailActions`; it imports neither app,
World, events, derivation nor transport. Its profile-driven controls consume
serializable definitions and answers. Each app supplies the same interface:

- The organiser adapter builds the model from its prospective World and stages
  canonical events through its existing immediate/draft policy.
- The family adapter reads REST resources and submits bounded semantic values.
  The Worker derives, validates, authorizes and appends canonical events.
  The browser reloads committed data after success.

The configured family controls include room strengths and explicit indifferent
answers, infant bed flags, diet and food notes.
Workshop wishes use the configured rank limit, dense unique eligible choices,
sign-up capacity and non-binding interest. Workshop choice must be open.
Target dates remain advisory. Closing a governed area keeps its saved answers
visible and readonly with a contact notice; an operational disable hides it.

People can be added and edited through explicit forms. The family display name
can be corrected; its email and person removal are organiser capabilities.
Person removal remains governed by [issue 051](../../spec/issues/open/051-defer-person-withdrawal-and-workshop-cancellation.md).
Normal form buffers are local input state. The family app has no event log,
local resolver, Drafts, SaveStatus, offline mutation queue or speculative World.
Preference controls save on change; text saves on blur. Failed writes show plain
errors. A stale edit refreshes data and requires an explicit new action.

## Header identity

Both adapters supply their navigation link to the shared
[occasion branding component](../../src/app/components/application/occasion-brand.tsx).
The same compact occasion title, boxed logo and truncation apply at phone and
wide widths. The organiser subtitle is **DGHK Berlin-Brandenburg ·
Organisationsteam** (English: **Organising team**); the family subtitle uses its
committed display name, such as **DGHK Berlin-Brandenburg · Familie Schmitz**
(English: **Schmitz family**). A saved family rename updates the subtitle.
While data is loading, the family label is **Familie** / **Family**. Existing
German Familie prefixes and English family prefixes or suffixes are not duplicated. Logout remains available.

## REST resources

The current family is a singleton derived from the authenticated email. IDs and
family membership cannot be supplied in mutation bodies.

| Resource | Methods | Representation or input |
|---|---|---|
| `/api/family` | GET, PATCH | Widget data plus resource ETags; patch `display_name` |
| `/api/family/people` | GET, POST | People; create name, role and age, returning 201 and Location |
| `/api/family/people/:person` | GET, PATCH | Own person; partial update |
| `/api/family/preferences` | GET | Offered family controls |
| `/api/family/preferences/:key` | GET, PUT, DELETE | Replace answer or reset to unanswered |
| `/api/family/people/:person/preferences` | GET | Offered person controls |
| `/api/family/people/:person/preferences/:key` | GET, PUT, DELETE | Replace answer or reset |
| `/api/family/workshops` | GET | Safe live catalogue, counts and own eligibility |
| `/api/family/people/:person/workshop-ranking` | GET, PUT | `{workshop_ids: [...]}` in rank order; empty clears |
| `/api/family/people/:person/workshop-signups` | GET | Own workshop IDs |
| `/api/family/people/:person/workshop-signups/:workshop` | GET, PUT, DELETE | Membership; PUT `{}` joins, DELETE leaves |
| `/api/family/people/:person/workshop-interests` | GET | Own workshop IDs |
| `/api/family/people/:person/workshop-interests/:workshop` | GET, PUT, DELETE | Membership; PUT `{}` selects, DELETE clears |

An answer is `{values: [{value, strength}], answered}`. Strength is `required`,
`preferred` or null, as allowed by the configured control. An empty answered
tri-state records explicit indifference; DELETE removes both its value and
response marker. Own-family reference targets are enforced server-side.

GET responses carry ETags. Updates, replacement and deletion require the displayed
resource's exact `If-Match`; a missing precondition returns 428, a changed resource
412. The root response also supplies tags for individual widgets. Unrelated
family changes do not invalidate a person's ETag. The Worker retries a raced
internal event head at most three times, re-reading membership, resource tags,
feature availability, eligibility and capacity before each append.
Unsupported operations return 405, hidden resources 404, invalid values 422,
full workshops or exhausted append retries 409. Mutations require same-origin
Origin, bounded JSON and a separate limit of 120 family changes per hour; a 429
includes Retry-After. No raw event/World error is returned.

## Privacy and verification

The representation is constructed from an explicit allowlist. It contains own
family identity, people and offered inputs, plus the public workshop descriptions,
aggregate sign-up counts and own eligibility. It excludes foreign family/person
identifiers, organiser-only traits, label notes, raw relationships outside the
family, event sequences, summaries, diagnostics, capabilities and resolver internals.
It does not invoke the organiser projection as a serialization shortcut.

[Worker tests](../../test/worker/family-rest.test.ts) cover ownership, strict values,
ETags, phase closure, operational disable, ranking/eligibility/capacity and rate
limits. [App tests](../../test/app/family-app.test.tsx) cover both memberships,
REST edits, stale recovery and shared login. The [browser flow](../../test/browser/family-login.spec.ts)
uses the built frontend, a real isolated Worker/D1, magic-link redemption, both
apps, persisted edits and logout. The [layout check](../../test/browser/family.spec.ts)
covers phone widths, topic navigation and browser printing. Run `pnpm run build`
before the built browser flow.

[Emitted bundle tests](../../test/build/bundles.test.mjs) include the public entry
and actual lazy family app, including shared chunks. They reject organiser,
event, Worker, derivation and solver modules in that load, and confirm that both
adapters use the shared component. The family JS budget is 150 KiB gzip, incremental
organiser JS 200 KiB and CSS 32 KiB.

## Remaining scope

This is the current-input family interface. Closed arrangement cards, published
room/workshop descriptors, unavailable references, own before/after comparisons,
participation conflicts with published attendance, and final family-specific
presentation remain in [M10](../../spec/roadmap.md#m10--family-access-and-release-control).
Explicit workshop no-preference and its final ranking interaction remain
[ranking requirements](../../spec/modules/workshop-rankings.md).
Operational delivery intents, hosted mail, deployment and hosted performance
verification are separate outstanding work. No hosted deployment is claimed.
