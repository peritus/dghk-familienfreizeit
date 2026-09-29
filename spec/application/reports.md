# Reports

Reports are named, human-readable views over the current occasion world. They help
organisers and families coordinate from the same derived information without
introducing another kind of domain state.

## 1. Contract

Every report must:

- work on a desktop screen;
- work on a mobile screen;
- print correctly from the browser through the report's print stylesheet.

Reports are browser views, not downloads (D21). The application provides no
download, PDF export, CSV export, report attachment, or print button. People print
with the browser, for example with `Ctrl+P`, and save a PDF from the browser's print
dialog if they want one. The print stylesheet is therefore a requirement: the
printed page is the only paper output the application has.

Responsive layout is part of the report, not a separate mobile feature. Tables
must remain readable on narrow screens by wrapping, stacking, or switching to
labelled cards. The print stylesheet must remove navigation and controls, repeat
table headings across pages, preserve important status text in greyscale, and
provide deliberate page breaks for report sections.

Every report identifies:

| Field | Meaning |
|---|---|
| Report title | Human-readable name from the active occasion profile |
| Audience | `shared`, `family`, or `organiser` |
| Data cut | Current-data sequence; release-scoped reports additionally include communication references |
| Generated at | Display-only browser generation time |
| Communication | Relevant scope and communication event references, when arrangements are included |
| Sensitivity | The most sensitive field contained in the report |

The M6 assignment print output is an organiser-only current-state projection. It consumes
the derived organiser world and room-assignment solver output directly and has no
communication references. Later release-scoped organiser reports consume
`CommunicationScopeView`; family and shared reports
consume [`FamilyScopeView`](release-control.md), never `CommunicationScopeView` —
the same audience split as the family application ([release control](release-control.md) §1). Both
supply communication status, scope references, before/after content, and
unavailable-history state. Reports may add report-specific aggregation and
redaction, but they do not derive release status or compare scope content
independently.

Workshop reports label their data context explicitly as `current` (the committed
live world), `prospective` (committed events plus organiser-local drafts), or
`released/effective` (communicated scope content visible to the audience). A
prospective organiser report never implies family visibility; a released/effective
report never joins current draft labels onto historical content.

The timestamp is not domain state and does not affect derivation or report
identity. Reports are generated on demand from the world visible to the reader.

## 2. Derivation and visibility

Reports never have a table, event type, cache entry or stored snapshot. The M6
assignment print output is an on-demand projection of the current prospective organiser
world; it does not imply that an arrangement has been released. Later organiser
reports may render the full organiser-derived world; family/shared reports are
derived and privacy-projected by the Worker. They render ordinary derived worlds and the audience projection defined in
[release control](release-control.md) §2. Organisers may inspect current or pending
worlds; family/shared reports combine current permitted facts with communicated scopes
and use the field-level temporal/privacy matrix in [release control](release-control.md).

Renderers aggregate, sort, group and redact. They do not query event payloads,
perform another relationship lookup, or implement their own release cuts. The
shared inline diff, outstanding-change overview and confirmation diff use the kernel contract in
[release control](release-control.md) §6–7.

Reports are shared with families when sharing supports coordination and does not
expose personal or safety-sensitive information. Restrict fields, not whole
reports, where possible. The absence of an organiser login must not by itself make a
useful coordination report unavailable.

| Audience | Reader | Typical contents |
|---|---|---|
| `shared` | Any authenticated family | Materials coordination, workshop programme, practical occasion information |
| `family` | The family represented by the session | Its people, room, workshops, food entries, materials, and instructions |
| `organiser` | Allowlisted organisers | Full contacts, detailed allergies, operational notes, unresolved issues, and audit detail |

A family report uses the `FamilyScopeView` release-control projection. It must
not reveal held arrangements or private constraint decisions — including via
communication status, since `FamilyScopeView` has no state that can only be
true while a draft change is being prepared. A shared report must show only
fields that the occasion profile has declared safe for that audience.

## 3. Report catalogue

These are the reports the selected modules provide. Each report, or report part, is
contributed by a module and named in that module's specification §11
([modules](../modules/contract.md)); a report whose modules are not selected does not exist.

### 3.1 Shared family reports

**Materials overview** groups requests and commitments by category and workshop.
It shows descriptions, quantities, open/fulfilled status, and the contributing
family or person where that identity is useful for coordination. It is the
canonical shared coordination report for materials; it is not organiser-only.

**Workshop programme** shows dates, times, workshops, scheduled locations, leaders, audience,
and cancellations. Its workshop rows use communicated programme content for family readers. Live
participation is a separate view; interest never exposes shared names.

**Shared workshop roster**, when the profile permits it, shows the minimum names
needed for families to coordinate workshop participation. It does not expose
email addresses, allergy text, private notes, or preference rankings.

**Shared occasion overview** shows the occasion dates, buildings, workshop locations,
practical instructions, and other profile-provided information intended for all
families.

**Change notice** shows the selected communication's family-visible differences
from the previous scope references. It contains no internal constraint explanations.

### 3.2 Family reports

**Family information sheet** shows current own people, food information, materials
and participation alongside communicated accommodation, workshop programme and
allocation results. It includes the data/reference labels from §1.

The family sheet is both a review surface and a print surface. It must make it
easy for a family to see what the system currently knows and correct its own
inputs through the ordinary family controls.

### 3.3 Organiser reports

**Master participant overview** lists families, people, roles, contact details,
communicated assignments, completion flags, and operational status.

**Accommodation overview** groups occupancy by building and room, including beds,
bed capacity, room accessibility, and the families sharing each room. It lists
no-bed people as room occupants without assigning them a bed or counting them
against bed occupancy; bed occupancy is the count of non-null place assignments.
It may include operational room notes that are not family-facing.

**Workshop rosters** provides one attendance list per workshop and slot,
including leaders, capacity, assigned people, cancellations, and fill status. The
organiser projection may include operational phone, emergency, health, or allergy
contacts when authorization and profile sensitivity policy allow it; family/shared
projections exclude those fields.

**Food service overview** aggregates counts by configured diet and occasion day. A
separate restricted **allergy and safety sheet** lists person, family, room, and
the allergy/accessibility text needed by organisers. Aggregate diet counts may be
shared; individual allergy text may not.

**Open issues and readiness** lists unplaced families, unsatisfied hard
constraints, incomplete registrations, missing workshop choices, unresolved
materials, and outstanding or unavailable release scopes.

**Uncommunicated arrangements** is the report specified in
[release control](release-control.md) §6: outstanding scope differences,
affected families and dependencies, with links to the detailed preview (§7).

Plan inspection and comparison are accepted but deferred in
[`plan-inspection-and-comparison`](../deferred-ideas/plan-inspection-and-comparison.md).
They remain distinct from the scope-selected communication preview when promoted.

**Capacity and accommodation cost overview** shows room and bed use, free
capacity, workshop fill, and the configured accommodation cost estimate. It is a
planning calculation, not an invoice or billing record.

**Workshop-space inventory** is an organiser-only physical inventory report. It
lists live and retired workshop spaces, physical capacity, availability windows,
deterministic order, and resolved capabilities. It does not claim that a space
is assigned to a workshop and never substitutes for the later communicated
programme location. Scheduled locations and their family-visible release are
owned by the Issue 025 schedule/release contract.

## 4. Safety and responsibility

The occasion provides no childcare service. Parents and guardians remain responsible
for supervising their children at all times. Reports must not suggest that a
workshop, leader, room, or age grouping transfers that responsibility
to the organisers or to another family.

Detailed allergy, accessibility, contact, and child-related operational data is
minimised and restricted to the report audience that needs it. A confidential
report shows its confidentiality label on screen and, through the print stylesheet,
on every printed page.

## 5. UI and print behavior

Reports appear as ordinary browser routes, with the same authenticated session
rules as the corresponding family view or organiser view. They have no download,
export, or print action. The visible controls are limited to filtering, sorting, and
navigation. The M6 assignment print output has no local mutation, release, or print
control; it is the browser-print stylesheet of the assignment board.

The print stylesheet must:

- hide navigation, filters, action buttons, and interactive-only controls;
- repeat report titles and table headers on subsequent pages;
- avoid splitting a family card, workshop row, or confidential warning when a
  page break can be placed before it;
- preserve text labels, borders, status glyphs, and warnings without relying on
  colour;
- include the occasion, report title, data cut, communication identity, and printed
  page number;
- carry the confidentiality label on every page of a confidential report;
- remain usable on common A4 paper in portrait or landscape as appropriate.
- print the selected current/prospective or released/effective context label.

The mobile view must not depend on hover, wide-screen drag interactions, or a
downloaded file. Long names, quantities, allergy text, and workshop titles must
wrap rather than truncate.

## 6. Acceptance criteria

A report is ready when:

1. its audience and every sensitive field are specified;
2. it uses the correct audience projection and communication references;
3. it is usable at desktop and mobile widths;
4. printing it from the browser with its print stylesheet produces a correct,
   legible paper document, checked against the stylesheet rules in §5;
5. it has no application download, export, or print path;
6. it has fixtures covering empty, incomplete, full, and changed data;
7. it does not create persisted domain state or bypass the configured resolver.
