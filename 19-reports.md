# 19 — Reports

Reports are named, human-readable views over the current event world. They help
organisers and attendees coordinate from the same derived information without
introducing another kind of domain state.

## 1. Contract

Every report must:

- work on a desktop screen;
- work on a mobile screen;
- be printable from the browser through the report's print stylesheet.

Reports are browser views, not downloads. The application does not provide a
download button, PDF export, CSV export, or report attachment. A user may still
use the printing facilities provided by their browser or operating system; the
application's responsibility ends at presenting a usable print layout.

Responsive layout is part of the report, not a separate mobile feature. Tables
must remain readable on narrow screens by wrapping, stacking, or switching to
labelled cards. The print stylesheet must remove navigation and controls, repeat
table headings across pages, preserve important status text in greyscale, and
provide deliberate page breaks for report sections.

Every report identifies:

| Field | Meaning |
|---|---|
| Report title | Human-readable name from the active occasion profile |
| Audience | `shared`, `family`, or `admin` |
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
derive(log ++ pending)                         // working admin
derive(log)                                    // other admins
derive(log before latest PlanPublished)        // attendees
```

The report renderer may aggregate, sort, group, and redact the derived world. It
must not query event payloads directly, perform a second relationship lookup, or
invent a stored report model. A report that compares two plans uses
`diff(previousPublishedWorld, currentWorld)`.

Reports are shared with attendees when sharing supports coordination and does not
expose personal or safety-sensitive information. Restrict fields, not whole
reports, where possible. The absence of an admin login must not by itself make a
useful coordination report unavailable.

| Audience | Reader | Typical contents |
|---|---|---|
| `shared` | Any authenticated attendee | Materials coordination, workshop programme, practical event information |
| `family` | The family represented by the session | Its people, room, workshops, food entries, materials, and instructions |
| `admin` | Allowlisted admins | Full contacts, detailed allergies, operational notes, unresolved issues, and audit detail |

An attendee report uses the published cut. It must not reveal unpublished room,
workshop, or constraint decisions. A shared report must show only fields that the
occasion profile has declared safe for that audience.

## 3. Initial report catalogue

The first release should provide these reports. A profile may disable a report
whose module is not selected.

### 3.1 Shared attendee reports

**Materials overview** groups requests and commitments by category and workshop.
It shows descriptions, quantities, open/fulfilled status, and the contributing
family or person where that identity is useful for coordination. It is the
canonical shared coordination report for materials; it is not admin-only.

**Workshop programme** shows dates, times, workshops, rooms, leaders, audience,
and cancellations. It is the event schedule, not a private participant list.

**Shared workshop roster**, when the profile permits it, shows the minimum names
needed for attendees to coordinate workshop participation. It does not expose
email addresses, allergy text, private notes, or preference rankings.

**Shared event overview** shows the event dates, buildings, workshop locations,
practical instructions, and other profile-provided information intended for all
attendees.

**Published change notice** shows changes that affect attendees since the last
published plan. It is derived from the publication diff and contains only the
affected public result, not internal constraint explanations.

### 3.2 Family reports

**Family information sheet** shows the signed-in family's people, published room
and sleeping places, published workshops, submitted food information, submitted
materials, and instructions relevant to that family.

The family sheet is both a review surface and a print surface. It must make it
easy for a family to see what the system currently knows and correct its own
inputs through the ordinary attendee controls.

### 3.3 Admin reports

**Master participant overview** lists families, people, roles, contact details,
published assignments, completion flags, and operational status.

**Accommodation overview** groups occupancy by building and room, including beds,
capacity, child-group capability, accessibility, and parties spanning families.
It may include operational room notes that are not attendee-facing.

**Workshop rosters** provides one attendance list per workshop and slot,
including leaders, capacity, assigned people, cancellations, and fill status.

**Food service overview** aggregates counts by configured diet and event day. A
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

The event provides no childcare service. Parents and guardians remain responsible
for supervising their children at all times. Reports must not suggest that a
children's room, workshop, leader, or age grouping transfers that responsibility
to the organisers or to another attendee.

Detailed allergy, accessibility, contact, and child-related operational data is
minimised and restricted to the report audience that needs it. Printing a
confidential report should require an explicit confirmation and should label the
printed document as confidential.

## 5. UI and print behavior

Reports appear as ordinary browser routes, with the same authenticated session
rules as the corresponding portal or admin view. They have no download or export
action. The visible controls are limited to filtering, sorting, navigation, and
`Print`.

The print stylesheet must:

- hide navigation, filters, action buttons, and interactive-only controls;
- repeat report titles and table headers on subsequent pages;
- avoid splitting a family card, workshop row, or confidential warning when a
  page break can be placed before it;
- preserve text labels, borders, status glyphs, and warnings without relying on
  colour;
- include the event, report title, data cut, publication identity, and printed
  page number;
- remain usable on common A4 paper in portrait or landscape as appropriate.

The mobile view must not depend on hover, wide-screen drag interactions, or a
downloaded file. Long names, quantities, allergy text, and workshop titles must
wrap rather than truncate.

## 6. Acceptance criteria

A report is ready when:

1. its audience and every sensitive field are specified;
2. it renders from the correct derived world and publication cut;
3. it is usable at desktop and mobile widths;
4. its print stylesheet produces a legible paper document;
5. it has no application download or export path;
6. it has fixtures covering empty, incomplete, full, and changed data;
7. it does not create persisted domain state or bypass the configured resolver.
