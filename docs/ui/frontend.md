# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/` | Profile-configured public occasion landing and actions |
| `/login` | Public organiser magic-link login |
| `/organiser` | Lazy authenticated organiser dashboard |
| `/organiser/families` | Derived family table with header-dialog invitation staging |
| `/organiser/families/:id` | Family detail shell with the Zimmer, Personen, Essen, and Workshops views |
| `/organiser/families/:id/:topic` | URL-backed family topic route; `zimmer` is family-scoped |
| `/organiser/families/:id/:topic/:person_id` | URL-backed person-scoped topic route for Personen, Essen, or Workshops |
| `/organiser/accommodation` | Redirects to the accommodation inventory entry point |
| `/organiser/accommodation/inventory` | Selected room-inventory surface for buildings, rooms, beds, capacity, traits, and costs |
| `/organiser/accommodation/assignment` | Deterministic assignment review with a fixed-assignment action and browser-printable output |
| `/organiser/workshops` | Shared workshop overview with Workshops, Leitungen and Externe Leitungen views |
| `/organiser/workshops/leaders` | The same overview with the derived internal-leader collection selected |
| `/organiser/workshops/external-leaders` | The same overview with external-leader authoring selected |
| `/organiser/workshops/programme` | Whole programme: workshop placements by slot and room |
| `/organiser/workshops/programme/unplaced` | Workshops without a feasible placement and their reasons |
| `/organiser/workshops/programme/overlaps` | Ranked workshop pairs that occupy the same slot |
| `/organiser/workshops/participation` | Read-only person-by-slot participation overview (**Teilnahme**) |
| `/organiser/workshops/slots` | Event-backed workshop slots |
| `/organiser/workshops/spaces` | Physical workshop spaces and per-slot availability context |
| `/organiser/workshops/allocation` | Workshop allocation answers (**Wünsche · Antworten**) |
| `/organiser/workshops/allocation/demand` | Workshop allocation demand (**Wünsche · Nachfrage**) |
| `/organiser/workshops/allocation/trace` | Workshop allocation trace (**Wünsche · Verlauf**) |
| `/organiser/workshops/lists/workshops` | Selected workshop roster |
| `/organiser/workshops/lists/persons` | Selected person plan |
| `/organiser/workshops/lists/families` | Selected family plan |
| `/organiser/workshops/lists/rooms` | Selected room plan |
| Other paths | Not-found message and a link back to the start |

The organiser chunk probes the session and organiser log before deriving. It owns
one draft-change reducer and one local-first command pipeline shared by all current
organiser routes. A click stages ordinary event drafts, renders the prospective world
locally, and then either invokes the Worker apply request automatically or leaves the
draft changes for explicit review according to the session's drafting policy. The Worker
remains the only persistence boundary; there is no separate drafting API or server
draft state.

Workshop routes use the same reducer and draft pipeline. Their section navigation
links **Workshops**, **Teilnahme**, **Wünsche**, **Räume und Slots**, and **Listen**.
Within Teilnahme, one shared tertiary group selects **Personen**, **Programm**,
**Nicht eingeplant**, or **Überschneidungen**, each backed by its existing URL. The resource item stays current
on both `/organiser/workshops/spaces` and `/organiser/workshops/slots`. The workshop
overview has page-local tabs for **Workshops**, **Leitungen**, and **Externe Leitungen**.
Moving between workshop routes preserves staged events because navigation does not
create another state boundary. The overview may filter by configured audience; the
space inventory remains physical inventory with schedule-aware slot context.
Programme review keeps its three URLs within that participation context. All three preserve the
same organiser and workshop navigation context. The whole-programme view exposes
one derived placement per workshop; the unscheduled view gives each missing
placement an explainable reason; and the overlap view shows people whose ranked
choices share a slot. Browser print is the only print path; no workshop screen adds
an application print or export control. Workshop allocation keeps the same organiser
and workshop navigation context and provides the URL-backed tertiary views **Antworten**,
**Nachfrage**, and **Verlauf**. These views derive from the prospective world and plan,
including conflict notices and person tracing, without adding a persistence boundary.

The **Listen** navigation entry selects the workshop roster, person plan, family
plan, or room plan route. Each view has a page-local selector for one document with
previous and next buttons, over the same plan as every other organiser screen.
Person selection keeps the person ID from picker option through the URL. Duplicate
names include the family's display name, with a short stable ID suffix when that
still leaves a collision. The allocation trace likewise resolves the `person`
query ID before displaying the selected person's trace.
The roster shows an explicit confidentiality notice above its picker. Rosters and
family plans switch to labelled cards when the list area is narrower than 720px;
family plans also use those cards when printed on A4 portrait paper. Person and
room plans keep scrolling tables. The global stylesheet's print block prints only
the selected document; screen-only and print-only parts are marked with
`workshop-screen-only` and `workshop-print-only` classes. The lists expose no
application print, download, or export control.

## Workshop participation overview

**Teilnahme** presents a derived person-by-slot matrix. The semantic table includes
each person in the derived world and every configured workshop slot. Assigned
choices show the workshop title and rank in the cell; rank colors distinguish the
configured choices. Leadership, sign-up, interest, fixed attendance, and free slots
have visible text labels as well. A dash marks no assignment in a slot. Rejected
choices are left to **Wünsche · Verlauf**, so the matrix shows the resulting
programme. Slot columns have equal widths, with a wider person column; people sort
in German locale order.
Selecting a name opens that person's **Wünsche · Verlauf** trace with the person
preselected.

When the available screen area is 720px or narrower, the table becomes one card per
person with slot-by-slot attendance. The page uses the shared light and dark theme
tokens. Browser printing uses the semantic table on A4 landscape paper at a 10pt
base size, repeats the table header and a fixed date/revision stamp, and keeps rows
together. A repeated footer spacer reserves room for the stamp on every page. Print
styles remove sticky columns, horizontal scrolling, and window-height layout
constraints. The view adds no application print or export control.

### Responsive organiser matrices and printing

Person-by-slot organiser matrices keep one semantic table as their wide-screen and
print representation, and use labelled person cards in narrow layouts. State must
remain understandable from text and structure when printed without color. Multi-page
print styles repeat table headers, keep person rows together, reserve room for a
repeated fixed footer with a table-footer spacer, and reset every enclosing layout
to natural document height. Verify both the narrow card layout and a multi-page
landscape print in a browser before delivery.

Organiser family-detail routes reuse the organiser `PrimaryNavigation` and
introduce no secondary navigation level. `FamilyTopicNavigation` wraps the shared `TertiaryNavigation`
for the four sibling topics. The person picker inside Personen, Essen, and
Workshops is a nested selector for the current family and does not change the
global navigation hierarchy. Topic and person ids are opaque route segments.

Workflow and recovery screens use `ScreenLayout` and `ScreenHeader`. The public
root route renders `OccasionLanding`, the branded landing archetype documented as
an exception in the [design system](design-system.md#screen-hierarchy). It stays
inside the shared application frame and reads its localized copy and route/HTTPS
actions from the active profile. The screen hierarchy defines the ordered slots,
navigation levels and collection ownership. Overview metrics use `StatsStrip`; quiet properties use
`Tag`; state and attention labels use `Badge`; completed or empty-success states
use `SuccessState`. Removal and retirement actions use the shared
`DestructiveActionDialog`, with dependent entities blocked inline until they are
handled.

One app bar (brand, role, navigation, and the save-status control) covers every
`/organiser*` route; there is no separate site shell header or boxed page header
there. From 48rem the established save-status button and popover remain beside
Abmelden. Below 48rem a compact status pill opens the same save and session controls
in a modal sheet (below 40rem) or anchored modal popover. Both presentations read
one organiser reducer and share save, mode and safe confirmation handlers. See
[design system](design-system.md#compact-presentation-below-48rem-menu-toggle-and-menu)
for the responsive presentation, states and focus behavior.

Immediate mode is the session default; the draft-mode switch inside the popover turns
on **Entwurfsmodus**, which collects changes as browser-local drafts until the person
saves them. Discarding drafts, or saving every pending draft, both exit drafting mode
back to immediate mode -- there is no state where drafts are at zero and drafting mode
stays on. Local events added during an in-flight request remain queued after the
submitted prefix.
Collection creation uses the shared `CollectionCreateAction`: its labelled action
sits beside its own collection heading, below tertiary navigation when the
collection is a local view and opens an
accessible dialog. Workshops, external leaders, workshop spaces and slots,
families, people, buildings, rooms, and beds follow this pattern. Empty states
repeat the same first useful action; populated views do not keep creation forms
open in their normal flow. These controls still stage the same ordinary event
drafts through the shared local-first pipeline.

## Workflow steppers

`WorkflowStepper` is a presentation adapter: it renders `complete`, `current` and
`upcoming` steps and an optional action slot, and owns no workflow state. Its
callers render module-owned tracks over the derived
[phase view](../architecture/phases.md#organiser-surfaces): the workshop overview,
programme and allocation screens share the workshop track, and the inventory
and assignment board render the shared accommodation track. Inventory supplies
the close and reopen actions; the assignment board shares track status and has a
fixed-assignment action, but no close or reopen control. The action slot carries the confirmed
**Wahl öffnen**, **Festlegen**, **Erneut festlegen** and **Wieder öffnen**
decisions. A closed area has no current step, and the mobile summary then counts
every step.

## Frontend navigation and state invariants

Internal route changes use wouter's client-side navigation and must not reload
the document. The organiser state owner remains mounted while moving between
the dashboard, family list, family detail, and browser history entries. Pending
event drafts, the derived local world, drafting mode, and the draft workspace
therefore survive those transitions. Screen-local inputs such as
search text and partially completed forms may reset when their screen unmounts.

Leaving `/organiser` creates a new organiser application when the route is
entered again, and a hard reload always starts a fresh in-memory session from
the committed event log. New internal routes and links must preserve these
boundaries and include regression coverage for client-side navigation and
pending-state retention. Do not key the organiser state owner, or its healthy
route subtree, by location. Error boundaries may reset their error state on a
route change without remounting healthy children.

Ordinary route changes leave focus and scroll position under the user's control;
clicking persistent navigation does not force focus onto the content region. A skip
link provides explicit keyboard access to that region. Destination-specific links,
such as a room link carrying `#room=...`, may deliberately open and scroll to their
named target. Lazy loading renders a centered preparation panel with a live status;
the route error boundary renders a sanitized recovery message and reload button.
These semantics are covered in
[app tests](../../test/app/shell.test.tsx), while real organiser navigation and
link targets are covered by the [browser route suite](../../test/browser/routes.spec.ts).
The shared [route contract](../../src/organiser/routes.ts) keeps nested organiser
links separate from their public `/organiser/...` URLs. Components rendered inside
the nested organiser router must use `OrganiserLink` with an `organiserPaths.*()`
value; `organiserUrls.*()` is reserved for canonical URLs at the application
boundary. ESLint rejects direct nested `Link`, raw anchor navigation, and
`organiserUrls` imports in organiser/module UI, while route and browser tests
assert that rendered hrefs contain the organiser base exactly once.
Secondary-navigation items also declare a non-empty tuple of typed nested paths that
selects each item. This makes grouped destinations explicit at the call site and keeps
selection on the shared segment-aware route matcher instead of component-local string
comparisons.

See the [design system](design-system.md) for primitives and styling, the
[implemented organiser view](../application/organiser-view.md), and the
[frontend specification](../../spec/ui/frontend.md) for outstanding behavior.

## Universal print composition

All mounted routes use the [shared paper layer](design-system.md#browser-printing-on-every-screen),
including login, initial loading and recoverable errors. `ApplicationFrame` owns
identity and a default `PrintFooter`; a specialised screen may supply its footer
through `ScreenLayout`. Text fields print current values, while selected view and
filter context remains explicit after navigation/actions disappear. Domain
projections and event commands are unaffected. Browser route checks verify one
frame/H1, uniform width, ordered screen slots, narrow overflow and print visibility.
The populated participation test additionally verifies landscape tables and
multi-page PDF output; Storybook provides a generic print composition.

A collapsed workflow row expands on pointer click; the native Alle Schritte toggle
remains the sole keyboard control. Expanded content and module-owned actions keep
their existing interaction boundaries. Responsive typography uses the shared
[role tokens](design-system.md#responsive-typography-roles) across current consumers.
