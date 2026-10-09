---
id: "052"
title: Compose application attention from core and selected modules
status: needs-decision
severity: gap
category: kernel
source: source investigation and implementation planning
related_decisions: [D2, D3, D6, D15, D16, D26, D27, D30, D31]
opened: 2026-10-09
---

# Compose application attention from core and selected modules

## Proposal and approval boundary

This is an implementation proposal for review. Approval accepts the scope,
policies, D30 clarification, general-rule candidates, acceptance criteria, and
commit sequence below. It authorizes one continuous implementation run, including
the specified tests and repository finalization. This document does not declare
the proposed system implemented or change a binding decision.

The deliverable is one pure attention evaluator composed from core and the
modules selected by a compiled profile. Every active attention surface consumes
its output. Domain validators, the configured relationship resolver, and solver
stages remain the producers of domain facts. No additional domain state store is
introduced.

Scope covers current organiser surfaces, current public authentication/recovery
feedback, and the selected room, workshop, and family-preference modules. It
includes the specified additional detection and response representation. It does
not deliver the family application, email notifications, richer placement
authoring, cancellation/withdrawal scope changes, telemetry, persisted snapshots,
or a new allocation strategy. Existing lifecycle behavior continues under its
current contracts. No milestone or unrelated issue is closed by association.

## Problem and source evidence

The application already has useful presentation primitives, but its semantic
attention contracts disagree:

| Producer or consumer | Evidence and gap |
|---|---|
| [Resolver](../../../src/events/resolver.ts) | Diagnostics carry prose and one subject; distinct labels and opposite relations can collide or duplicate. Localized applicability reasons are truthy and can be missed. |
| [Solver types](../../../src/solver/types.ts) | Preflight findings and traces use another shape and mostly string reasons; their evidence is lost in later conversions. |
| [Phases](../../../src/config/phases.ts) | Readiness has a third finding shape and independently decides which outcomes block. |
| [Workshop advisories](../../../src/modules/official-workshops/checks.ts) | Notes and their fingerprint form a fourth contract; the fingerprint depends on rendered wording. |
| [Dashboard](../../../src/app/organiser/screens/dashboard.tsx) | World diagnostics alone decide its positive empty state, independently of plan outcomes and closed-area notices. |
| [Family status](../../../src/app/organiser/family-data.ts) | Hardcoded room fields and age-dependent choice counts misclassify neutral answers and ignore the selected profile. |
| [Accommodation projection](../../../src/modules/room-assignment/app/screens/assignment-board/review.tsx) | All plan preflight findings pass through room-specific string translation; occupancy omits assignments without a place. |
| [Room decision dialog](../../../src/modules/room-assignment/app/components/assignment-board/fixed-dialog.tsx) | A screen-owned subset of requirement feasibility misses relationships and other solver constraints. |
| [Workshop allocation](../../../src/modules/workshop-rankings/app/workshop-allocation-view.ts) | A participation cell chooses one category, hiding additional obligations; broad unassigned strings obscure distinct causes. |
| [Closing UI](../../../src/app/organiser/components/area-closing.tsx) and [Worker](../../../src/worker/closing.ts) | Separate readiness/advisory paths; the UI acknowledges a boolean and later fingerprints current facts rather than the reviewed facts. |
| [Closed workshop comparison](../../../src/modules/workshop-assignment/closed-result.ts) | A moved workshop can produce a change without attributing its attendees' families. |
| [Apply handling](../../../src/app/organiser/organiser-app.tsx) | Structured Worker findings generally become a generic failure message. |
| [Projection](../../../src/events/world.ts) | Shallow projection retains organiser diagnostic and summary collections. The current family endpoint returns only an ID. |
| [Capacity validation](../../../src/modules/official-workshops/index.ts) | Live sign-ups and matched fixed pairs are counted; automatic attendance is absent from capacity-reduction validation. |

## Recommendation

### Authority and composition

Add an `attention_checks` module contribution. A contribution is compiled source
code bound to validated module parameters, never executable configuration loaded
at runtime. Core has its own definitions. The same evaluator collects independent
occurrences, formats them, canonicalizes them, and returns an immutable result.
Checks cannot read or modify another check's output. Definition order has no
effect on the result.

Each definition declares its code, evidence type, required inputs, occurrence key,
applicability, pure collection function, localized templates, affected area,
display scope, and action policy. Code-owned callbacks may select policy from
typed evidence. The central registry validates the contract; modules own their
domain policies and templates within that registry.

Registration rejects duplicate codes, invalid ownership/namespaces, unknown
subject kinds, undeclared destinations or actions, incomplete translations,
and action dependencies on unregistered checks. Core reserves `kernel`, `phase`,
`operation`, `validation`, and `presentation`; module codes use the module ID.
Existing diagnostic codes listed below are retained. Runtime registration is
completed once per compiled profile.

The organiser and Worker use the full selected registry. Public login/recovery
uses the same evaluator with its public core subset and no domain modules. That
entry point imports no runtime profile registration, solver, organiser UI, or
Worker implementation. Existing initial-bundle isolation gates remain binding.

### Inputs and result

The public function is named `deriveAttention`. It accepts immutable facts and
the compiled registry, or is bound to that registry by `composeAttention`.

| Input | Exact meaning |
|---|---|
| Domain availability | `available`, `loading`, `failed`, or `invalid-proposal`. Only `available` supplies a current world and an optional available plan. Last-valid facts are explicitly labelled as a baseline, never current. |
| World and plan | Derived, matching head and build identity. A mismatched plan is unavailable. Module sections are read through typed accessors. |
| Lifecycle | Phase status from folded facts and explicit UTC time, without readiness. |
| Feature availability | Declared/selected/operational/phase/authorization layers, evaluated without attention-based phase readiness. |
| Locale | Requested locale plus configured fallback; every built-in template supplies German and English. |
| Time | Explicit normalized UTC instant; all clock reads occur at browser/request boundaries. |
| Comparisons | Typed current-versus-closed facts; admission evaluations additionally supply before/after snapshots and the attempted operation. |
| Validation | Typed schema/domain failures, field/control identity, and affected draft-group identity. No parsing of exception prose. |
| Operation state | Typed load/save/session/authentication outcomes, request attempt identity, draft count, and in-flight state. It contains no transport handles. |
| Presentation | Audience and current screen/report context for confidentiality and provisional-state feedback. |

The result contains `items` and `coverage`. Each coverage entry names a check and
has `evaluated`, `not-applicable`, or `unavailable`, with a typed reason when
unavailable. Not applicable requires known facts establishing inapplicability.
Unknown inputs never mean not applicable. A failed check produces unavailable
coverage and a sanitized system finding; it never silently yields an empty list.

| Item field | Contract |
|---|---|
| `id` | Stable occurrence identity as specified below. |
| `code`, `owner` | Registered check and its owning core/module contribution. |
| `kind` | `problem`, `review`, `information`, or `status`. |
| `severity` | `error`, `warning`, or `info`; urgency only. |
| `subjects` | Ordered typed entity references. Unavailable referenced entities retain their declared kind and explicit availability. |
| `evidence` | A check-specific readonly discriminated payload; no untyped evidence bag. |
| `source_refs` | Structured live-label, constraint, stage, validation-field, operation, or closed-result references. These support trace links and provenance. |
| `basis` | World head/build, committed or prospective basis, relevant draft groups, and current/closed/before/after origin. None of these enters occurrence identity. |
| `wording` | Localized title and detail, with structured optional reason rows. No React nodes, HTML, callbacks, or raw internal error text. |
| `areas`, `display_scopes` | Explicit relevant areas and destinations. Counts are selections of occurrence IDs in these scopes. |
| `blocks` | Typed operation keys with target, e.g. close accommodation, close workshops, or apply a particular proposal. |
| `acknowledgement` | Null, or the existing workshop-closing review requirement with relevant evidence fingerprint. |
| `actions` | Ordered typed navigation or command descriptions with centrally generated labels. The caller executes them explicitly. |

Navigation refers to registered screen IDs, typed entities/control IDs, and
selection parameters. Browser adapters use `organiserPaths` and `OrganiserLink`.
Commands are the existing retry, review, save, discard, and phase commands plus
the scoped draft correction/discard and source-label repair described below. No
action mutates state during evaluation.

### Identity, deduplication, ordering, and copy

Occurrence IDs are the code plus an escaped canonical JSON encoding of a
definition's natural key. They are not shortened hashes. Keys are typed entity
IDs, control/trait keys, relationship endpoints, rank numbers for rank-group
findings, or operation/group identity where appropriate. Neither array position,
locale, names, head sequence, rendered message, nor evidence fingerprint is part
of the identity.

Single-valued field checks key by holder and field; multi-valued checks add the
canonical offending value. Fixed-decision checks key by holder and target and
aggregate all reasons. Contradiction keys use holder, target, and sorted opposing
operators, producing one occurrence. Ranked overlap keys use person and sorted
workshop pair. Actual overlap keys use person and slot. Area differences key by
area and the closed-result sequence being compared.

Deduplication merges only the same declared occurrence with equal normalized
evidence. Conflicting emissions for one ID are evaluator failures. Resolver and
solver facts have one designated attention producer. The retired-place wrapper
enriches the kernel reference finding rather than creating another occurrence.
Fixed-invalid diagnostics and section violations produce one decision finding;
its separate reasons are not separately counted. Aggregate shortages and affected
individuals are distinct occurrences, with explicit causal references.

Sort by severity (`error`, `warning`, `info`), then code, then natural key using
locale-independent code-point comparison. Subject, evidence, and reason arrays
have declared canonical sort keys. Display grouping can reorder headings but
cannot redefine identity or counts.

The German titles and detail parameters in the catalogue are the authoritative
initial copy. German/English templates interpolate entity names, localized
profile vocabulary, quantities, and translated reason enums. They never parse
producer prose or expose a fallback raw check/reason code. Missing referenced
names use “Nicht mehr verfügbar” / “No longer available”. Restricted notes are
never interpolated into general notices. Count phrases use the same shared
singular/plural formatter on every surface.

### Action policy and applicability

The following catalogue uses **E/W/I** for severity. **A** means reject the
specified append/proposal; **C** means block closing the named area; **K** means
require advisory acknowledgement for each workshop closing; **—** means no gate.
These are independent of severity. Existing resolver append invariants and
existing area readiness blockers remain enforced. Additional detection defaults
to no new gate unless the catalogue explicitly specifies one.

Dashboard selection contains all available organiser `problem` and `review`
occurrences with error/warning urgency. Informational demand, preferred wishes,
phase status, confidentiality, and ordinary saving/drafting statuses remain
contextual. Every dashboard item has its own relevant destination or recovery
action. Required-response findings are included; the current dashboard exclusion
of response-chasing summaries is amended for these organiser data-quality
findings. This adds no reminders or family-facing delivery.

Closing readiness selects `blocks` for that area plus required unavailable
checks. It does not select by severity. Missing responses, ordinary unplaced
families, oversubscribed demand, unmatched preferences, ordinary sign-up overflow,
and new combined-participation warnings do not acquire a closing gate.

Only the current workshop age/audience and missing/unavailable-leader advisories
require K. No new acknowledgement event or general dismissal/read state is added.
Fixing facts removes their occurrences on recomputation.

An all-clear is allowed only when all checks needed for the named screen scope
are evaluated or demonstrably inapplicable and its actionable selection is empty.
The dashboard wording is “Keine offenen Hinweise in den geprüften Daten.” Its
unavailable state is “Die Prüfung ist noch nicht vollständig.” Status notices and
information never imply that an unavailable domain has been checked.

## Exact initial rule catalogue

### Core and resolver

| Code | Trigger and evidence / natural key | Policy | German title and detail |
|---|---|---|---|
| `kernel.unknown-trait` | Live unregistered key; holder, key, value/source. | W / — | “Unbekannte Angabe”; name the field and affected entity; open details and offer confirmed source-label removal. |
| `kernel.scope-violation` | Declared field used on an unsupported kind; holder/key. | E / — | “Angabe passt nicht zu diesem Eintrag”; name field, actual kind, and allowed kinds. |
| `kernel.valid-for` | Evaluator returns false or localized reason; holder/key/value as needed. | W / — | “Angabe ist hier nicht anwendbar”; show the returned localized reason, or the generic applicability explanation for false. |
| `kernel.invalid-resolver-value` | Resolver input has the wrong shape; holder/key/value. | E / — | “Beziehung kann nicht ausgewertet werden”; name affected field and expected shape. |
| `kernel.dangling-reference` | Existing append-invalid resolver reference points to an unavailable entity; holder/key/target. | E / A | “Verweis ist nicht mehr verfügbar”; name the source and unavailable target, including room/place context when available. |
| `kernel.cardinality` | Existing append-invalid cardinality is violated; holder/key. | E / A | “Angabe fehlt oder ist mehrfach vorhanden”; show expected and actual count. |
| `kernel.contradiction` | Opposing required relations share holder/target; canonical operator pair. | E / — | “Anforderungen widersprechen sich”; name the opposing requirements and source entities. Owning solver findings retain their existing C policy. |
| `kernel.family-without-persons` | Registered family has no live members; family. | W / — | “Personenangaben fehlen”; “Für {family} sind noch keine Personen eingetragen.” |
| `kernel.child-age-missing` | Child role with null age; person. | W / — | “Alter fehlt”; “Für {person} ist kein Alter angegeben.” Workshop eligibility uses the existing shared helper for every role. |
| `phase.plan-unavailable` | An area with an existing close action has no matching current plan; area. | I / C area | “Zuordnung noch nicht verfügbar”; explain that the current result cannot yet be checked. |
| `kernel.attention-unavailable` | A registered check failed; check code is internal evidence only. | E / dependent gates unavailable | “Prüfung derzeit nicht vollständig”; offer safe retry/recovery, never raw exception details. |

Typed producer errors that already reject malformed values remain rejected.
The W/E display rows above do not weaken schema or append validation.

### Accommodation

| Code | Trigger and evidence / natural key | Policy | German title and detail |
|---|---|---|---|
| `room-inventory.room-without-places` | Active inventory room has zero places; room. | W / — | “Zimmer ohne Schlafplätze”; name room and inventory action. |
| `room-inventory.no-capacity` | People exist and usable inventory capacity is zero; accommodation. | E / — | “Keine Schlafplätze verfügbar”; show demand and zero usable capacity. Existing room preflight still determines C. |
| `room-assignment.no-families` | No registered family exists; accommodation. | I / C accommodation | “Noch keine Familien eingetragen”; family collection creation action. |
| `room-assignment.requirement-arithmetic` | Existing per-family total/capability capacity preflight fails; family plus capability or total dimension. | E / C accommodation | “Nicht genügend passende Schlafplätze”; required demand and available qualifying capacity. |
| `room-assignment.required-contradiction` | Existing rule sweep has no feasible empty-room candidate or decision provider; family/decision. | E / C accommodation | “Keine passende Zimmerzuordnung möglich”; retain all typed candidate rejection reasons. |
| `room-assignment.unplaced-family` | Solver leaves a family without a room; family. | W / — | “Familie ohne Zimmer”; name family, bed demand, and typed limiting reasons. |
| `room-assignment.fixed-invalid` | Fixed room decision violates one or more solver checks; family/room. | W / C accommodation | “Feste Zimmerzuordnung hat Konflikte”; show every reason and affected person. |
| `room-assignment.place-shortfall` | Placed family has bed-needing people with no place ID; family/room. | W / C only when fixed-invalid already applies | “Schlafplätze fehlen”; show demand, actual places, and people without places. Link to the existing fixed finding as cause where applicable. |
| `room-assignment.total-shortfall` | Sum of bed demand exceeds usable room capacity; accommodation. | W / — | “Insgesamt fehlen Schlafplätze”; “{required} Schlafplätze benötigt, {available} verfügbar.” |
| `room-assignment.capability-shortfall` | Sum of demand of distinct families requiring a capability exceeds usable capacity providing it; capability. Count each family's demand once per capability. | W / — | “Zu wenig passende Schlafplätze”; name capability, qualifying demand, and capacity. This is a necessary lower bound, not a proof of general allocation feasibility. |
| `room-assignment.unmet-preference` | Placed family has unsatisfied preferred decision in the canonical room evaluator; family/target/trait. | I / — | “Zimmerwunsch nicht erfüllt”; name preference and current room. |

Blocked rooms and the no-bed trait use the existing room solver input. Inventory
counts distinguish usable capacity, assigned bed demand, actual places, and
shortfall. The dialog consumes canonical candidate evaluations for requirements,
exclusions, separation, room decisions, occupancy, and blocked status. It cannot
reimplement those predicates. Fixed decisions continue to follow existing
module-owned override semantics.

### Workshops

| Code | Trigger and evidence / natural key | Policy | German title and detail |
|---|---|---|---|
| `official-workshops.zero-capacity` | Active workshop has capacity zero; workshop. | W / — | “Workshop ohne Plätze”; show workshop and capacity. |
| `official-workshops.age-advisory` | Existing adult-minimum-below-16 or child-maximum-above-17 advisory; workshop. | W / K | “Alter und Zielgruppe prüfen”; retain the exact existing age/audience explanation. |
| `official-workshops.leader-missing` | Active workshop has no leader; workshop. | W / K | “Leitung fehlt”; name workshop and edit action. |
| `official-workshops.leader-unavailable` | Any referenced internal/external leader unavailable; workshop. | W / K | “Leitung nicht mehr verfügbar”; name workshop and count unavailable leaders without raw IDs. |
| `official-workshops.demand-over-capacity` | Unique ranked demand exceeds capacity in assigned mode; workshop. | I / — | “Mehr Wünsche als Plätze”; demand and capacity; “Dies kann bei der Zuordnung vorkommen.” |
| `official-workshops.attendance-over-capacity` | Unique union of live automatic/fixed attendance and sign-ups exceeds capacity; workshop. | W / — | “Teilnahmezahl über der Kapazität”; distinct people, capacity, and excess; interests excluded. |
| `workshop-scheduling.unscheduled` | Active workshop has no solver placement; workshop. | E / C workshops | “Workshop nicht eingeplant”; retain all candidate rejection categories and counts, not just the most frequent reason. |
| `workshop-scheduling.fixed-invalid` | Existing fixed placement has violations; workshop/fixed slot/space. | E / C workshops | “Fester Workshoptermin hat Konflikte”; show every feasibility reason. Suppress its duplicate generic unscheduled occurrence. |
| `workshop-scheduling.resources-missing` | Active workshop catalogue lacks live slots or spaces; resource dimension. | I / — | “Planungsgrundlage fehlt”; name missing slots/spaces and route. Unscheduled findings supply C when a workshop cannot be placed. |
| `workshop-scheduling.external-leader-unavailable` | Scheduled workshop has an external leader whose explicit availability excludes its slot; workshop/leader/slot. Empty availability means no available slots, matching the current editor. | W / — | “Leitung ist zu diesem Termin nicht verfügbar”; workshop, leader, and slot. Detection only; no new scheduling constraint. |
| `workshop-rankings.choice-not-opened` | Choice-opening fact absent; workshop area. | I / C workshops | “Workshopwahl noch nicht geöffnet”; current opening action when otherwise available. |
| `workshop-rankings.response-missing` | Choice opened, organiser choice feature effective, and a person has at least one offered eligible assigned-mode workshop but no ranking response; person. Schedule is not required. | W / — | “Workshopantwort fehlt”; name person. No minimum number of choices is imposed. |
| `workshop-rankings.invalid-response` | No-preference and concrete choices coexist; duplicate workshop/rank, non-dense ranks, or ranks exceeding max; person plus violation dimension. | W / — | “Workshopantwort prüfen”; name the exact violated ranking invariant and choices. No silent sorting repair or new append prohibition. |
| `workshop-rankings.selection-unavailable` | Ranking, sign-up, or interest targets a removed/cancelled workshop; person/workshop/control kind. | W / — | “Gewählter Workshop nicht verfügbar”; identify the retained response and ordinary correction action. Retained labels are not deleted. |
| `workshop-rankings.selection-ineligible` | A recorded choice/sign-up targets an active workshop rejected by the shared age/audience helper or wrong participation mode; person/workshop/control kind. | W / — | “Auswahl passt nicht zur Teilnahme”; precise eligibility/mode reason. Interests alone do not assert attendance eligibility. |
| `workshop-rankings.ranked-overlap` | Two current ranked workshops are placed in the same slot; person/sorted workshop pair. | I / — | “Wünsche liegen gleichzeitig”; show both wishes and the slot. |
| `workshop-assignment.no-workshops` | No active workshop exists; area. | I / C workshops | “Noch keine Workshops angelegt”; creation action. |
| `workshop-assignment.fixed-invalid` | Existing fixed attendance has any typed violation; person/workshop. | W / C workshops | “Feste Teilnahme hat Konflikte”; every age/audience, capacity, overlap, leadership, mode, target-limit, unavailable, unscheduled, or unmatched-pair reason. |
| `workshop-assignment.allocation-shortfall` | Person has concrete, currently eligible assigned-mode choices but receives fewer of those than min(configured automatic target, distinct eligible choices); person. | W / — | “Workshopwünsche teilweise offen” or “Workshopwünsche ohne Zuordnung”; received/requested count and typed rejection causes. Fixed attendance in chosen workshops counts toward fulfilled requests. |
| `workshop-assignment.participation-overlap` | A person's distinct actual attendance/sign-up/leadership obligations occupy one slot; person/slot. | W / — | “Gleichzeitige Teilnahmen”; enumerate all obligations. Same person/workshop across categories counts once; interests are separate information. |
| `workshop-assignment.signup-unscheduled` | A retained live sign-up has an active workshop with no placement; person/workshop. | W / — | “Anmeldung ohne Workshoptermin”; workshop and person. |
| `workshop-assignment.capacity-reduction` | A decreasing capacity transition fails D30 admission below; workshop/operation. | E / A proposal | “Kapazität kann so nicht gesenkt werden”; old/new capacity and current distinct attendance, or changed existing attendance pairs. |

Explicit no-preference is a valid response and generates no missing-response or
allocation-shortfall occurrence. Neither the generic solver `unassigned` array
nor a configured automatic target by itself authorizes an attention task.
Infants/ineligible people with no choices are not unresolved allocations.
Fixed decisions remain assigned under existing override semantics and D31;
this work does not add automatic filling. Sign-up/interest outputs remain
distinct and are not fed into a new allocation strategy.

Trace decisions use a typed reason union shared by producers and the catalogue:
capacity, overlap, leader conflict, unscheduled, mode mismatch, infant, unknown
age, below/above age bounds, audience mismatch, unavailable/cancelled target,
unresolved fixed pair, target reached, and not needed. Scheduling additionally
uses unknown slot/space, occupied space, space capacity, availability, explicit
block, and missing capability. Domain trace entries remain explainable even
when their expected rejection does not warrant a dashboard item.

### Responses, timing, and closed results

| Code | Trigger and evidence / natural key | Policy | German title and detail |
|---|---|---|---|
| `family-preferences.response-not-recorded` | Requested, applicable, organiser-offered field lacks a value or explicit neutral marker; entity/control. | W / — | “Antwort nicht dokumentiert”; “Für {entity} ist zu {control} keine Antwort dokumentiert.” Absence is not described as a known refusal or an unfinished submission. |
| `family-preferences.response-inconsistent` | Both neutral marker and substantive answer exist; entity/control. | W / — | “Antwort widersprüchlich”; name neutral and substantive states. |
| `family-preferences.late-answer` | A current offered phase-governed answer or neutral marker was saved after the target, using its label's envelope timestamp; entity/section. | I / — | “Angabe nach dem Zieltermin gespeichert”; show section, target, and latest qualifying save. This does not claim a semantic change or retain deleted-label history. |
| `phase.target-passed` | Open phase with now strictly greater than target; phase. | I / — | “Zieltermin überschritten”; target and existing section contact copy. Ordinary editing remains possible. |
| `phase.area-closed` | Area latest fact is closing; area. | I / — | “Ergebnis festgelegt”; closing time. Current errors remain visible alongside this status. |
| `room-assignment.closed-result-changed` | Current canonical room/place/unplaced result differs from latest recorded result while closed; area/closing seq. | W / — | “Zimmerzuordnung weicht von der Festlegung ab”; changes, affected families, and review action. |
| `workshop-assignment.closed-result-changed` | Current placement/attendance/unassigned result differs from latest recorded result while closed; area/closing seq. | W / — | “Workshopplanung weicht von der Festlegung ab”; changes, affected families, and review action. |

Family preferences adds declarative `response_fields`: control key, scope,
`value` or `tri-state` representation, and requested/optional status. Every
profile tri-state field must be declared; omitted ordinary optional fields do
not become completeness requirements. Composition checks each declaration
against its existing control, scope, and governing section. The active profile
requests the three current room tri-states and diet. Workshop response
applicability remains owned by workshop rankings. Core owns empty-family and
child-age findings. A family completeness badge selects these response/core
findings and never claims universal domain health.

For each tri-state control, family-preferences contributes one zero-or-one
boolean-true label named `response-<control-key>` on the declared entity scope.
Its meaning is explicit indifference, including “Gerne” for inverted sharing.
Required/preferred answers clear that marker and write the ordinary trait;
indifference clears the trait and sets the marker; “Keine Angabe” clears both.
Each transition is one ordinary draft group. Only true is valid. Marker
authorization and feature governance are exactly those of the source control;
the compiled label schema records its governing control key so existing
authorization/availability helpers can resolve it. No alias changes what the
marker folds into. Unrelated fields' markers are independent. Existing absent
labels receive no backfilled marker or invented response history.

Add `set_at` to live label provenance from the event envelope. It records a save,
not necessarily a semantic change; repeated restatements can update it. It is
removed with its label under D27. No cleared-label facts, tombstones, additional
event queries, or persisted folded history are introduced. Date comparison is
normalized at boundaries and clock-free in the core. The browser schedules the
next target-boundary refresh and refreshes on visibility/focus; these refresh
attention and phase status without re-solving an unchanged world.

Closed comparisons use typed changes, not concatenated ID strings. Room changes
include changed place IDs and transitions into/out of unplaced status. Workshop
placement changes attribute families using the union of before/after attendance
and current live sign-ups; family membership comes from the resolver-derived
world index. Removed people without a current family remain explicitly
unattributable, never assigned to an invented family. The first closing review
counts all result families, including unplaced/unassigned families. After
reopening, differences remain visible in the review, without a closed-state
dashboard warning. Live descriptor edits keep D16 semantics and do not create a
new historical-descriptor comparison.

Printing a closed outcome does not borrow reasons from the current plan. When
historical reason detail is needed, the caller re-derives the closing prefix in
memory through the ordinary fold/solver, and checks that its canonical result
matches the stored result. A mismatch is “Begründung für diese Festlegung nicht
verfügbar”; no current explanation is substituted. Stored closing payloads keep
their current schema and contain no new findings or prose.

### Operational and presentation catalogue

| Code | Trigger / occurrence key | Severity and action | German title / detail |
|---|---|---|---|
| `operation.load-failed` | Known request failure / attempt | E; retry load | “Daten konnten nicht geladen werden”; contextual retry copy. |
| `operation.session-required` | Known missing/expired authentication / session attempt | W; login | “Anmeldung erforderlich”; use current organiser/family audience copy. |
| `operation.stale-head` | Current stale-head recovery state / apply attempt | W; review drafts | “Daten wurden inzwischen geändert”; retained drafts must be reviewed. |
| `operation.stale-build` | Worker rejects revision / apply attempt | E; confirmed reload | “Ansicht ist veraltet”; explain retained browser drafts before reload. |
| `operation.apply-rejected` | Structured domain rejection / group and cause | E; correct/discard group | “Änderung konnte nicht übernommen werden”; select the domain finding's copy and evidence. Do not add a duplicate generic failure. |
| `operation.apply-failed` | Known transport/unknown failure / attempt | E; retry/review | “Änderungen konnten nicht gespeichert werden”; retain drafts. A generic fetch failure is not described as confirmed offline. |
| `operation.draft-invalid` | Fold or schema rejects proposed group / group and field | E; correct/discard group | “Änderung kann so nicht geprüft werden”; field-level cause if known, otherwise sanitized group-level explanation. |
| `operation.saving` | Request in flight / submitted prefix | I status | “Wird gespeichert …”; never claim saved before response. |
| `operation.drafts-pending` | Unsubmitted groups exist / session | I status; existing save/discard | “Änderungsentwürfe vorhanden”; group/event counts from the shared reducer. |
| `operation.saved` | No queued/in-flight edits, last successful response known / session | I status | “Gespeichert”; latest known save time. Initial clean state uses “Keine ungespeicherten Änderungen”. |
| `operation.logout-failed` | Logout failure / attempt | W; retry logout | “Abmeldung fehlgeschlagen”; current retry action. |
| `operation.auth-feedback` | Existing invalid/expired link, accepted link request, cooldown or generic auth failure / auth attempt | Existing W/E/I classification; existing permitted action | Current login messages are catalogued unchanged. Accepted requests retain anti-enumeration wording; cooldown uses known retry time. No transport/delivery promise is added. |
| `validation.field-invalid` | Structured schema or domain validation issue / form, field, violation kind | E; blocks that form's staging | “Angabe prüfen”; existing field label and typed required/format/range/duplicate/reference reason. |
| `presentation.confidential` | Existing restricted report context / report | I information | “Vertrauliche Angaben”; existing confidentiality instructions. |
| `presentation.provisional` | View includes prospective facts / relevant view | I information | “Vorschau mit Änderungsentwürfen”; no separate screen-owned draft detection. |
| `presentation.route-recovery` | Existing not-found/render failure / route and failure kind | Existing I/E | Existing sanitized route/reload feedback, through the public or organiser registry as appropriate. |

Validation adapters preserve schema paths, expected bounds, domain reason codes,
subject identity, and labels. They do not translate messages. Browser/Worker
domain failures have one typed protocol. Responses never send stacks, submitted
secrets, or raw validation payloads. Generic fallback errors remain available for
unexpected failures; unknown codes fail safe and suppress all-clear.

Draft groups receive stable session-local IDs and expose submitted/in-flight
membership. Failed groups can be corrected by an explicitly selected ordinary
editor or discarded as one atomic group; other groups are retained. Corrections
replace that identified unsubmitted group through the shared reducer. In-flight
groups cannot be replaced or discarded. Queued groups added during a request
remain queued. All correction/retry/save actions use the existing application
pipeline, and navigation never remounts its state owner.

The shared attention-details dialog renders an item's explanation, complete
reason/evidence rows, provenance, related occurrences and declared actions.
It supplies a useful review destination when no ordinary editor represents the
offending retained label. Check definitions may declare a `clear-source-label`
repair for unknown labels and unavailable ordinary ranking/sign-up/interest
values. It clears exactly the identified value through an ordinary LabelCleared
draft after a consequential confirmation. The executor checks that the source
label still matches the reviewed value and sequence; otherwise it asks for a
fresh review. Registered required properties and matched fixed pairs use their
existing domain editor/clear command, never this generic single-label repair.
Candidate repairs pass ordinary validation/admission, and errors remain in the
same attention model. No raw-event editor, new decision entity, or automatic
repair is introduced. Dialog dismissal restores its trigger's focus.

## D30 admission and requested clarification

The [binding D30](../../../decisions.md#d30--workshop-capacity-reduction-blocks-never-displaces)
requires current automatic attendance to be protected. This proposal preserves
that policy and explicitly settles its recomputation wording.

**Proposed replacement for D30's sentence “No recomputation, displacement, or
reassignment is triggered by a capacity edit”:**

> Capacity edits are previewed through the ordinary pure derivation and solver.
> A reduction is accepted only when it does not fall below current distinct
> attendance and the complete person-to-workshop attendance set is unchanged by
> that transition. Otherwise the reduction is rejected. No accepted reduction
> displaces, adds, or reassigns attendance. No assignment snapshot or implicit
> fixed decision is created to preserve an earlier result.

The ordinary recomputation is already required by D2/D3/D6; forbidding the
preview itself would make the specified guard impossible. Alternatives considered:
count only sign-ups/fixed pairs (misses D30 automatic attendance); validate only
the resulting plan (loses the displaced people); persist/fix the earlier plan
(changes event/state and decision semantics); reject every reduction (rejects
safe edits unnecessarily). Recommendation: the explicit before/after guard.

Implement one shared profile-bound proposal admission orchestrator, outside
`derive`, `solve`, and narrow event validators. It normalizes events, preserves
existing structural validation, and evaluates attention on ordered transition
prefixes for capacity decreases. Detection includes `WorkshopUpdated`, generic
capacity `LabelSet`, and any already-reachable lowering path. Clearing a required
capacity remains rejected by existing validation. Workshop removal is not a
capacity-reduction operation.

For each decrease, derive/solve the immediately preceding prefix and the
prospective prefix. Count the unique union of preceding automatic/fixed
assignments, live sign-ups, and matched live fixed pairs for that workshop.
Reject if new capacity is lower than that count, or if the canonical complete
person/workshop assignment pair set differs across the transition. An earlier
explicit attendee removal in the batch affects this preceding prefix; a later
removal cannot authorize an earlier invalid decrease. The existing cheap
sign-up/fixed-count guard is limited to actual decreases as well: metadata edits
and unchanged/increased capacity remain possible when a workshop is already
over capacity. Unrelated title edits never enter the expensive path. Within a
batch, unchanged prefix results can be reused in memory.

The browser preview, `/api/organiser/apply`, and authorized `/api/events` writes
use the same admission helper. The server checks stale build/head, authorizes,
then computes admission and closing policy before an atomic append. Current
before-batch authorization semantics are preserved; evaluation does not grant
permission. The append's existing atomic expected-head check handles concurrent
writes. Closing within the batch evaluates its exact preceding admitted prefix.
The browser's attempt cannot authorize a different server head.

Historical replay remains structural replay: it does not retroactively reject
an old admitted log using the new admission guard. Its current inconsistencies
are derived findings. The new guard rejects new proposals; it never rewrites
history. `ValidationWorld` stays narrow and never reads a plan or invokes solve.
Issue [046](046-d30-review-against-feature-model.md) remains open because its
separate feature-policy rationale is not resolved by this guard.

## Closing, acknowledgement, privacy, and host integration

1. Split phase status from readiness. Compute world/plan, phase status and feature
   availability, attention, then action readiness. Feature availability retains
   its existing world-only feature-readiness callbacks and reads phase status,
   not attention-dependent phase readiness. This prevents a dependency cycle.
2. Closing consumes the same area's blocking selection in browser and Worker.
   Closed status never suppresses new current findings. Unknown required plan or
   admission checks fail closed for that operation; an unrelated optional
   information check does not block saving.
3. Workshop acknowledgement fingerprints canonically sorted occurrence keys,
   relevant normalized evidence, and the compiled policy/build identity. They
   exclude locale, rendered wording, unrelated head movement, timestamps of
   unchanged facts, and UI ordering. Pin the fingerprint on acknowledgement;
   changing reviewed evidence clears approval and returns to review.
4. Preserve the existing opaque fingerprint field, organiser-only event, immediate
   adjacency to `WorkshopsClosed`, stale-head guard, team acknowledgement, and new
   acknowledgement for each closing attempt. Worker recalculates it at the exact
   prefix. No old event is reinterpreted to authorize a new closing.
5. Evaluate organiser attention once per immutable context revision in the state
   owner. Screens select IDs/items; they do not rerun `solve` or domain detection.
   Form validation changes can reuse the domain portion; time/status changes do
   not rerun it or solve. Candidate dialogues use existing indexed evaluators or
   explicit proposal preview, never a solver run per rendered candidate.
6. Public feedback uses the small public registry. The organiser context gains
   attention/result selectors, not another persisted store. Existing notice,
   badge, field, confirmation, and print primitives render catalogue output.
7. Keep all organiser attention organiser-only. Fix the existing shallow
   projection by constructing an explicit allowlist: family/shared identity and
   permitted labels/indexes, resolver rows whose holders and entity targets are
   permitted, and payload-free phase timing. Opaque capability tokens/rows
   derived from excluded labels are omitted. Diagnostics and module summaries
   are empty in these projections until an explicit audience-safe contributor
   exists. `/api/family/view` continues returning only its current ID response.
   No full organiser item can be filtered into a family response by subject ID.
8. Print selects the same occurrences for its explicit result basis and audience;
   reasons remain understandable without colour. Restricted report notices use
   existing authorized report projections. Operational live announcements use
   existing alert/status semantics, with one announcement owner per occurrence;
   ordinary recomputation does not repeatedly announce unchanged items.

## Removal and migration inventory

| Existing location | Final destination / disposition |
|---|---|
| Resolver diagnostic builder and module world checks | Structured facts retained; registered attention producers own presentation and policy. |
| Preflight/stage diagnostic and trace prose | Typed causes and source references; catalogue explanations replace screen string parsing. Technical traces can retain development prose. |
| `familyStatus` and workshop wish counting | Select core/response check IDs; hardcoded completion rules removed. |
| Workshop age/leader/demand notes and translations | Official/scheduling/ranking definitions; no separate `WorkshopNote` semantic contract. Shared formatting utilities may remain. |
| Room `findingViews`, requirement chips and fixed dialog predicates | Scoped attention selection plus canonical solver feasibility evidence. Chip styling remains presentation. |
| Programme reasons and overlap detection | Scheduling/ranking definitions; programme view performs grouping and layout only. |
| Allocation banner, reason maps, fixed conflict summaries | Item selections and catalogue reason rows. Every simultaneous category appears; combined cells retain all entries. |
| Print `openReasonLabel` and current-reason fallback | Catalogue rendering with explicit current/closed provenance; no invented historical reason. |
| Review readiness functions and notices | Shared action-policy selectors; no independent severity/prefix tests or duplicate finding type. |
| Closing advisory computation/fingerprint and closed-area hint counts | Common area selections, reviewed fingerprint, and typed module comparisons. |
| Local slot overlap and inventory/editor semantic validation | Domain validators supply typed issues; form adapters perform shape extraction and staging only. |
| Generic apply errors, header/menu save copy, derivation recovery | Operational catalogue and shared reducer facts; UI primitives and execution handlers retained. |
| Login, route recovery, confidentiality/provisional copy | Public/core presentation catalogue selected by explicit context. |

Temporary adapters are allowed between commits. The final tree must have no
production consumer of the superseded finding contracts or substring-based
reason translation. Ordinary domain labels, names, table values, and document
headings remain normal presentation data; they are not invented attention items.

## General-rule candidates included in approval

These candidates are proposed for all active and future module attention,
organiser feedback, and permitted public recovery surfaces:

1. All attention detection, wording, urgency, action policy, and occurrence
   identity are registered through the composed pure evaluator. Module/domain
   validators and solvers own their underlying facts.
2. Readiness selects explicit operation policy, not severity; acknowledgement
   identifies reviewed evidence, not translated text.
3. Positive all-clear requires complete relevant evaluation; unavailable facts
   cannot masquerade as an empty healthy result.
4. Response completeness requires declarative requested fields and an explicit
   neutral representation; absent labels do not prove refusal or submission.
5. Audience projections are allowlists. Organiser findings and hidden identifiers
   cannot cross a family boundary through evidence or copy.

Canonical destinations after approval: `spec/architecture/attention.md`, module
and profile contracts, and the linked frontend/design-system guidance where the
rule governs interaction. Verified delivered portions move to
`docs/architecture/attention.md` and matching module/UI documentation. Verification
is the acceptance matrix below. Approval of this proposal explicitly approves
these candidates; this proposal alone does not promote them into guidance.

## Commit sequence and acceptance ownership

Implementation commits use semantic descriptions and include their own tests.
Each is reviewable independently; interim adapters have a named removal owner.

| Step | Commit | Principal files and acceptance |
|---|---|---|
| 1 | `spec: define composed attention contracts` | Approved specification, module/profile contribution contracts, affected phase/solver/frontend requirements, D30 clarification and active roadmap delivery entry. Inventory sections before consolidation; maintain reading-order links and binding IDs. |
| 2 | `feat: add pure attention composition` | New `src/attention/` model, registry, evaluation, selection, public entry, profile composition, pure lint/build gates. Cover identity, ordering, coverage, copy and invalid registration. |
| 3 | `refactor: retain structured diagnostic causes` | Resolver, fold checks, solver types/sections and validation adapters. Correct applicability/contradiction duplication; preserve canonical solver answers and append invariants. |
| 4 | `feat: derive workshop attention` | Each workshop module's attention definitions and shared reason enums. Complete choice/allocation/combined-obligation cases without changing automatic placement/attendance strategy. |
| 5 | `feat: derive accommodation attention` | Inventory/assignment checks, canonical indexed feasibility accessor, demand/place counts and dialogue evidence. Cover blocked rooms, relationships, shortages and fixed overflow. |
| 6 | `feat: record explicit preference responses` | Family-preferences response definitions, generated marker schemas/governance, active profile, ordinary controls, label save provenance. Cover indifferent/reset, authorization, phases and historical absence. |
| 7 | `fix: preserve attendance on capacity reduction` | Shared proposal admission orchestrator, Worker write paths and browser preview. Complete D30 prefix, generic-label, attendee-union, recomputation and concurrency tests. |
| 8 | `refactor: derive closing policy from attention` | Phase status/readiness split, selectors, Worker closing, browser review/fingerprint, protocol. Same evidence/policy at browser and exact server prefix; locale-independent acknowledgement. |
| 9 | `fix: attribute closed-result attention` | Room/workshop comparisons and report basis selection. Typed changes, all affected families, place/unplaced changes, current/closed reason separation and safe replay mismatch. |
| 10 | `feat: centralize operational feedback` | Protocol, reducer/group identities, API error adapters, validation field wiring, shared details/confirmed label-repair command, save/menu/login/recovery presentation. Correct/save/retry/discard preserves other groups and in-flight prefixes. |
| 11 | `refactor: render composed attention across screens` | Dashboard, family list/detail, workshop authoring/programme/allocation/participation, board, closing and print, with shared item/count selectors. Remove per-screen detection, translations and duplicate contracts. |
| 12 | `fix: restrict derived audience projections` | Explicit family/shared projection, diagnostics/summaries/token omission and adversarial tests. Preserve the current family API response and organiser report permissions. |
| 13 | `test: enforce attention acceptance across surfaces` | Catalogue fixture manifest, cross-runtime, navigation, responsive/print, accessibility, source-consumer and work-budget gates; complete removal of interim adapters. |
| 14 | `docs: document verified attention behavior` | Verified architecture/module/UI docs, outstanding-spec cleanup and proposal disposition. Archive this issue only when its full acceptance passes; no completed-plan archive is retained as another authority. |

Dependencies: 2 follows 1; 3 follows 2; 4/5/6 follow 3; 7 follows 4; 8
follows 4/5/7; 9 follows 4/5/8; 10 follows 2/3/7/8; 11 follows all domain,
response, comparison and operational producers; 12 follows 3/6; 13 follows
11/12; 14 follows successful complete verification. Parallel agent work is not
part of this approval.

## Verification and acceptance matrix

Every catalogue entry has a manifest row pointing to executable fixtures for:
smallest trigger, exact code/key/evidence/copy/policy, resolution, a near miss,
multiple occurrences, applicable/non-applicable/unavailable contexts, relevant
prospective/committed basis, and visibility. German and English titles/details
and pluralization are asserted. New contribution registration without a manifest
row fails verification. Scenarios below may share fixtures, but each invariant
must have an explicit assertion and test destination.

| Acceptance | Required assertions / test destination |
|---|---|
| Pure deterministic composition | Equal inputs equal outputs; deep-frozen inputs unchanged; registry/module order permutations equal; unselected modules contribute nothing; no clock/randomness/I/O/import leak. New `test/attention/` and build lint tests. |
| Identity and completeness | Renames, locale, unrelated head movement and sorting preserve IDs; independent labels/targets remain distinct; opposite contradiction emitted once; same ID with unequal evidence is failure; unavailable checks suppress all-clear. |
| Resolver/application agreement | Localized applicability reason is detected; append cardinality/reference restrictions unchanged; retired-place detail enriches one occurrence; structured evidence reaches ordinary editor destinations. Existing resolver/event tests plus catalogue fixtures. |
| Accommodation | Two families/one bed gives unplaced warning and no false dashboard success; fixed three-person/two-place family reports missing person and closing blocker; no-bed people excluded; blocked/capability/sole-occupancy/exclusion/separation decisions agree between solver and dialog; workshop findings never appear as room reasons. |
| Workshop response and allocation | Explicit no-preference, infant, missing age and unopened choice; one valid wish is a complete answer; stale/duplicate/gapped ranks; partial/zero allocations explain actual causes; demand excess stays informational; automatic answers remain within D31 ranked choices. |
| Combined obligations | One person/workshop across fixed/sign-up counted once; leadership plus different attendance/sign-up all visible in a slot; interests separate; overflow uses unique people; every fixed feasibility reason shown. Matrix, programme, roster and notice agree. |
| D30 | Reduction below automatic/sign-up/fixed union rejected; above union with changed assignment set rejected; safe reduction accepted; generic capacity LabelSet protected; earlier removal can authorize, later removal cannot; concurrent stale head rejects atomically; historical replay still works; no solve inside ValidationWorld; metadata/unchanged-capacity edits remain permitted in existing overflow; unrelated edits retain existing work budget. |
| Responses/timing | All three room neutral answers survive remount/replay; reset removes marker; substantive answer clears marker; inconsistent generic labels give one warning; optional fields do not become mandatory; wrong scope/value and unauthorized/closed family marker writes rejected; historical absence never fabricated; deadline refresh without domain/solver rerun. |
| Closing/acknowledgement | Browser and Worker same occurrence IDs and blocking policy; ordinary unplaced/response/new warning cases keep specified no-gate policy; acknowledgement tied to exact evidence/build and attempt; locale/ordering/irrelevant facts do not change fingerprint; changed reviewed facts clear it; server adjacency/stale guards preserved. |
| Closed comparisons | Same-slot workshop space move identifies attendee families; changed slot/attendance/place/unplaced/unassigned captured; first review counts unresolved result families; reopened review remains available; removed family attribution explicit; closed reports never copy current reasons; historical mismatch sanitized. |
| Operational recovery | Structured area/advisory/capacity rejection survives protocol; field issue has accessible description and correct action; corrected/discarded group preserves others; in-flight prefix immutable; queued edits retained; saving never says saved; reviewed source-label repair uses ordinary events, refuses stale source, and cannot split a fixed pair or clear required properties; reload/discard confirmations use existing lifecycle; anti-enumeration and token privacy unchanged. |
| Surfaces and navigation | Dashboard/badges/rows/detail/review/print select identical IDs/counts; all actionable links resolve declared targets with organiser base once; internal navigation/back/forward preserves drafts; targeted focus only for explicit correction actions; keyboard/narrow/print states work without colour. |
| Privacy | Adversarial restricted labels, hidden relations/IDs, diagnostics, summaries and embedded capability tokens omitted from family/shared projections; source world unchanged; no organiser attention enters initial public bundle or family API; restricted reports retain authorization. |
| Cost and removal | No per-screen or per-candidate solve; one shared domain evaluation per unchanged input; deadline/save-state refresh reuses domain portion; deterministic bounded scans on scaled fixtures; no remaining production consumer of old semantic finding shapes or string/substr reason translation. |

Run targeted tests with each commit. Full delivery requires, in the flake:
`pnpm run ci` and `pnpm run bench:check`, with successful docs, format, typecheck,
lint, unit/Worker, build/isolation, Storybook, browser, print, and cost checks.
Fixtures and snapshot changes must be reviewed against semantic assertions.
Hosted deployment and operational provider verification are not claimed.

Finish through the required jj attribution/leaf bookmark/fresh clean working-copy
gate, add the leaf to `next` through the approved helper, and export canonical
collaborator refs. No main merge/rebase or deployment is implied by approval.

## Documentation disposition

During implementation, account for affected sections as follows:

| Existing contract | Disposition |
|---|---|
| Resolver/world diagnostics and solver trace authority | Retain domain semantics; replace presentation-only shapes with links to the attention contract. |
| Solver severity-to-closing table | Replace with the approved explicit action-policy contract; keep domain error/warning/info urgency. |
| Phase readiness and advisory acknowledgement | Retain lifecycle/events/concurrency; centralize selection and fingerprint semantics. |
| Room/workshop domain rules and D31 | Retain, including fixed overrides and active retirement/cancellation behavior. |
| Dashboard family-response exclusion | Amend for the approved organiser requested-data findings; no reminder/email delivery promotion. |
| Family/profile response descriptions | Add explicit requested/optional and neutral label semantics; retain ordinary trait/resolver ownership. |
| D30 | Apply the exact approved clarification above and update all dependent capacity descriptions together. |
| Public feedback, save-state, accessibility/navigation/print guidance | Retain interaction requirements; document shared catalogue ownership and verified migration. |
| Family projection privacy requirements | Document this delivered allowlist foundation and retain all outstanding family application/closed-result audience requirements. |
| Deferred notifications, richer decisions, lifecycle scope issues | Retain unchanged as outstanding/deferred requirements with their current decision boundaries. |

Section accounting belongs to review notes while consolidating; authoritative
specifications do not contain revision comparisons or completed-plan history.

## Approval requested

Approve this entire proposal, including its exact D30 clarification, response
representation, detection-only new warnings, dashboard scope, privacy boundary,
general-rule candidates, and commit/test sequence. Implementation can then run
without further routine product decisions. A genuinely new binding-decision
conflict discovered during execution still follows repository decision review.

## Related files

- [Decisions](../../../decisions.md)
- [Module contract](../../modules/contract.md)
- [Profile contract](../../profiles/contract.md)
- [Solver contract](../../architecture/solver-contract.md)
- [Phase contract](../../architecture/phases.md)
- [Family preferences](../../modules/family-preferences.md)
- [Dashboard requirements](../../ui/screens/organiser-dashboard.md)
- [Frontend lifecycle and navigation](../../../docs/ui/frontend.md)
- [Testing procedures](../../../docs/engineering/testing.md)
- [Documentation workflow](../../../docs/engineering/documentation.md)
