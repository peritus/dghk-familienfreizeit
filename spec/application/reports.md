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
| Data cut | Current-data sequence; reports with fixed arrangements additionally name each area's closing time |
| Generated at | Display-only browser generation time |
| Sensitivity | The most sensitive field contained in the report |

The room-assignment board's organiser-only current-state print projection is
documented with the implemented module. Reports with arrangements consume the
[phase view](../architecture/phases.md): organiser reports may show both the closed
result and the current derivation with their difference; family and shared reports
receive only the closed result for their audience (§6 there). Reports may add
report-specific aggregation and redaction, but they do not derive phase status or
compare results independently.

Organiser workshop reports show the organiser's one plan while the area is open,
and the closed result once it is closed, labelled with the closing time, so paper
matches what families see ([phases](../architecture/phases.md) §7).

The timestamp is not domain state and does not affect derivation or report
identity. Reports are generated on demand from the world visible to the reader.

## 2. Derivation and visibility

Reports never have a table, event type, cache entry or stored snapshot. Organiser
reports may render the full organiser-derived world; family/shared reports are
derived and privacy-projected by the Worker. They render ordinary derived worlds and the audience projection defined in
[phases](../architecture/phases.md) §6. Organisers may inspect current or pending
worlds; family/shared reports combine current permitted facts with closed results
and use the field matrix in [phases](../architecture/phases.md) §6.

Renderers aggregate, sort, group and redact. They do not query event payloads,
perform another relationship lookup, or implement their own result cuts. The
shared inline comparison, closed-area differences and closing review use the kernel
contract in [phases](../architecture/phases.md) §7.

Reports are shared with families when sharing supports coordination and does not
expose personal or safety-sensitive information. Restrict fields, not whole
reports, where possible. The absence of an organiser login must not by itself make a
useful coordination report unavailable.

| Audience | Reader | Typical contents |
|---|---|---|
| `shared` | Any authenticated family | Materials coordination, workshop programme, practical occasion information |
| `family` | The family represented by the session | Its people, room, workshops, food entries, materials, and instructions |
| `organiser` | Allowlisted organisers | Full contacts, detailed allergies, operational notes, unresolved issues, and audit detail |

A family report uses the family projection in [phases](../architecture/phases.md) §6.
It must not reveal unclosed results or private constraint decisions, and it never
shows that an area differs from its closed result. A shared report must show only
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
and cancellations. Its placements come from the closed workshop result for family readers. Live
participation is a separate view; interest never exposes shared names.

**Shared workshop roster**, when the profile permits it, shows the minimum names
needed for families to coordinate workshop participation. It does not expose
email addresses, allergy text, private notes, or preference rankings.

**Shared occasion overview** shows the occasion dates, buildings, workshop locations,
practical instructions, and other profile-provided information intended for all
families.

**Change notice** shows the family-visible differences between an area's two most
recent closed results. It contains no internal constraint explanations.

### 3.2 Family reports

**Family information sheet** shows current own people, food information, materials
and participation alongside the closed accommodation and workshop results. It includes the data/reference labels from §1.

The family sheet is both a review surface and a print surface. It must make it
easy for a family to see what the system currently knows and correct its own
inputs through the ordinary family controls.

### 3.3 Organiser reports

**Master participant overview** lists families, people, roles, contact details,
closed assignments, completion flags, and operational status.

**Accommodation overview** groups occupancy by building and room, including beds,
bed capacity, room accessibility, and the families sharing each room. It lists
no-bed people as room occupants without assigning them a bed or counting them
against bed occupancy; bed occupancy is the count of non-null place assignments.
It may include operational room notes that are not family-facing.

**Workshop rosters** provides one attendance list per workshop and slot,
including leaders, capacity, assigned people, cancellations, and capacity status. The
organiser projection may include operational phone, emergency, health, or allergy
contacts when authorization and profile sensitivity policy allow it; family/shared
projections exclude those fields.

**Food service overview** aggregates counts by configured diet and occasion day. A
separate restricted **allergy and safety sheet** lists person, family, room, and
the allergy/accessibility text needed by organisers. Aggregate diet counts may be
shared; individual allergy text may not.

**Open issues and readiness** lists unplaced families, unsatisfied hard
constraints, incomplete registrations, missing workshop choices, unresolved
materials, and areas that are not closed or differ from their closed result.

**Differences from the fixed result** lists, per closed area, the difference
between its closed result and the current derivation with affected families, and
links to the closing review ([phases](../architecture/phases.md) §7).

Plan inspection and comparison are accepted but deferred in
[`plan-inspection-and-comparison`](../deferred-ideas/plan-inspection-and-comparison.md).
They remain distinct from the closing review when promoted.

**Capacity and accommodation cost overview** shows room and bed use, free
capacity, workshop utilization, and the configured accommodation cost estimate. It is a
planning calculation, not an invoice or billing record.

**Workshop-space inventory** is an organiser-only physical inventory report. It
lists live and retired workshop spaces, physical capacity, availability windows,
deterministic order, and resolved capabilities. It does not claim that a space
is assigned to a workshop and never substitutes for the closed programme location.
Scheduled locations reach families through the closed workshop result
([phases](../architecture/phases.md) §5).

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
navigation. The implemented assignment board has no local mutation, closing, or print
control; its output is printed through the browser stylesheet.

The print stylesheet must:

- hide navigation, filters, action buttons, and interactive-only controls;
- repeat report titles and table headers on subsequent pages;
- avoid splitting a family card, workshop row, or confidential warning when a
  page break can be placed before it;
- preserve text labels, borders, status glyphs, and warnings without relying on
  colour;
- include the occasion, report title, data cut, closing time where a closed result
  is shown, and printed page number;
- carry the confidentiality label on every page of a confidential report;
- remain usable on common A4 paper in portrait or landscape as appropriate.

The mobile view must not depend on hover, wide-screen drag interactions, or a
downloaded file. Long names, quantities, allergy text, and workshop titles must
wrap rather than truncate.

## 6. Acceptance criteria

A report is ready when:

1. its audience and every sensitive field are specified;
2. it uses the correct audience projection and closed results;
3. it is usable at desktop and mobile widths;
4. printing it from the browser with its print stylesheet produces a correct,
   legible paper document, checked against the stylesheet rules in §5;
5. it has no application download, export, or print path;
6. it has fixtures covering empty, incomplete, full, and changed data;
7. it does not create persisted domain state or bypass the configured resolver.
