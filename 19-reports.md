# 19 — Reports

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
| Data cut | The derived event sequence and whether it is the current or published world |
| Generated at | Display-only browser generation time |
| Publication | The current publication number/hash when the report uses a published plan |
| Sensitivity | The most sensitive field contained in the report |

The timestamp is not domain state and does not affect derivation or report
identity. Reports are generated on demand from the world visible to the reader.

## 2. Derivation and visibility

Reports never have a table, event type, cache entry, or stored snapshot. They are
renderers over `World`, using the same visibility cuts as every other screen:

```ts
derive(log ++ pending)                         // working organiser
derive(log)                                    // other organisers
derive(log before latest PlanPublished)        // families
```

The report renderer may aggregate, sort, group, and redact the derived world. It
must not query event payloads directly, perform a second relationship lookup, or
invent a stored report model. A report that compares two plans uses
`diff(previousPublishedWorld, currentWorld)`.

Reports are shared with families when sharing supports coordination and does not
expose personal or safety-sensitive information. Restrict fields, not whole
reports, where possible. The absence of an organiser login must not by itself make a
useful coordination report unavailable.

| Audience | Reader | Typical contents |
|---|---|---|
| `shared` | Any authenticated family | Materials coordination, workshop programme, practical occasion information |
| `family` | The family represented by the session | Its people, room, workshops, food entries, materials, and instructions |
| `organiser` | Allowlisted organisers | Full contacts, detailed allergies, operational notes, unresolved issues, and audit detail |

A family report uses the published cut. It must not reveal unpublished room,
workshop, or constraint decisions. A shared report must show only fields that the
occasion profile has declared safe for that audience.

## 3. Initial report catalogue

The first release should provide these reports. Each report, or report part, is
contributed by a module and named in that module's specification §11
([modules](20-modules.md)); a report whose modules are not selected does not exist.

### 3.1 Shared family reports

**Materials overview** groups requests and commitments by category and workshop.
It shows descriptions, quantities, open/fulfilled status, and the contributing
family or person where that identity is useful for coordination. It is the
canonical shared coordination report for materials; it is not organiser-only.

**Workshop programme** shows dates, times, workshops, rooms, leaders, audience,
and cancellations. It is the occasion schedule, not a private participant list.

**Shared workshop roster**, when the profile permits it, shows the minimum names
needed for families to coordinate workshop participation. It does not expose
email addresses, allergy text, private notes, or preference rankings.

**Shared occasion overview** shows the occasion dates, buildings, workshop locations,
practical instructions, and other profile-provided information intended for all
families.

**Change notice** shows changes that affect families since the last
published plan. It is derived from the publication diff and contains only the
affected family-visible result, not internal constraint explanations.

### 3.2 Family reports

**Family information sheet** shows the signed-in family's people, published room
and sleeping places, published workshops, submitted food information, submitted
materials, and instructions relevant to that family.

The family sheet is both a review surface and a print surface. It must make it
easy for a family to see what the system currently knows and correct its own
inputs through the ordinary family controls.

### 3.3 Organiser reports

**Master participant overview** lists families, people, roles, contact details,
published assignments, completion flags, and operational status.

**Accommodation overview** groups occupancy by building and room, including beds,
capacity, accessibility, and parties spanning families.
It may include operational room notes that are not family-facing.

**Workshop rosters** provides one attendance list per workshop and slot,
including leaders, capacity, assigned people, cancellations, and fill status.

**Food service overview** aggregates counts by configured diet and occasion day. A
separate restricted **allergy and safety sheet** lists person, family, room, and
the allergy/accessibility text needed by organisers. Aggregate diet counts may be
shared; individual allergy text may not.

**Open issues and readiness** lists unplaced people or parties, unsatisfied hard
constraints, incomplete registrations, missing workshop choices, unresolved
materials, and a stale or unpublished plan.

**Plan change report** compares the current world with the previous published
world and explains room, place, workshop, cancellation, and affected-family
changes for organiser review.

**Capacity and accommodation cost overview** shows room and bed use, free
capacity, workshop fill, and the configured accommodation cost estimate. It is a
planning calculation, not an invoice or billing record.

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
navigation.

The print stylesheet must:

- hide navigation, filters, action buttons, and interactive-only controls;
- repeat report titles and table headers on subsequent pages;
- avoid splitting a family card, workshop row, or confidential warning when a
  page break can be placed before it;
- preserve text labels, borders, status glyphs, and warnings without relying on
  colour;
- include the occasion, report title, data cut, publication identity, and printed
  page number;
- carry the confidentiality label on every page of a confidential report;
- remain usable on common A4 paper in portrait or landscape as appropriate.

The mobile view must not depend on hover, wide-screen drag interactions, or a
downloaded file. Long names, quantities, allergy text, and workshop titles must
wrap rather than truncate.

## 6. Acceptance criteria

A report is ready when:

1. its audience and every sensitive field are specified;
2. it renders from the correct derived world and publication cut;
3. it is usable at desktop and mobile widths;
4. printing it from the browser with its print stylesheet produces a correct,
   legible paper document, checked against the stylesheet rules in §5;
5. it has no application download, export, or print path;
6. it has fixtures covering empty, incomplete, full, and changed data;
7. it does not create persisted domain state or bypass the configured resolver.
