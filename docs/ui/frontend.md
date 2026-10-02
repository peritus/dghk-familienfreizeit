# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/`, `/login`, `/family` | Public foundation welcome placeholder |
| `/organiser` | Lazy authenticated organiser dashboard |
| `/organiser/families` | Derived family table with header-dialog invitation staging |
| `/organiser/families/:id` | Read-only-by-default people list, explicit editing, lifecycle staging and human-readable changes |
| `/organiser/accommodation` | Redirects to the accommodation inventory entry point |
| `/organiser/accommodation/inventory` | Selected room-inventory surface for buildings, rooms, beds, capacity, traits, and costs |
| `/organiser/accommodation/assignment` | Read-only deterministic assignment review with browser-printable assignment output |
| `/organiser/workshops` | Workshop overview and authoring |
| `/organiser/workshops/programme` | Whole programme: workshop placements by slot and room |
| `/organiser/workshops/programme/unplaced` | Workshops without a feasible placement and their reasons |
| `/organiser/workshops/programme/overlaps` | Ranked workshop pairs that occupy the same slot |
| `/organiser/workshops/slots` | Event-backed workshop slots |
| `/organiser/workshops/spaces` | Physical workshop spaces and per-slot availability context |
| `/organiser/workshops/allocation` | Workshop allocation answers (**Wünsche · Antworten**) |
| `/organiser/workshops/allocation/demand` | Workshop allocation demand (**Wünsche · Nachfrage**) |
| `/organiser/workshops/allocation/trace` | Workshop allocation trace (**Wünsche · Verlauf**) |
| Other paths | Not-found message and a link back to the start |

The organiser chunk probes the session and organiser log before deriving. It owns
one draft-change reducer and one local-first command pipeline shared by all current
organiser routes. A click stages ordinary event drafts, renders the prospective world
locally, and then either invokes the Worker apply request automatically or leaves the
draft changes for explicit review according to the session's drafting policy. The Worker
remains the only persistence boundary; there is no separate drafting API or server
draft state.

Workshop routes use the same reducer and draft pipeline. Their section navigation
links **Workshops**, **Programm**, **Wünsche**, and **Räume und Slots**; the programme
item stays current on all three programme review URLs, while the resource item stays current
on both `/organiser/workshops/spaces` and `/organiser/workshops/slots`. The workshop
overview has page-local tabs for **Workshops**, **Leitungen**, and **Externe Leitungen**.
Moving between workshop routes preserves staged events because navigation does not
create another state boundary. The overview may filter by configured audience; the
space inventory remains physical inventory with schedule-aware slot context.
Programme review is split across three URLs with page-local tabs for **Ganzes
Programm**, **Nicht eingeplant**, and **Überschneidungen**. All three preserve the
same organiser and workshop navigation context. The whole-programme view exposes
one derived placement per workshop; the unscheduled view gives each missing
placement an explainable reason; and the overlap view shows people whose ranked
choices share a slot. Browser print is the only print path; no workshop screen adds
an application print or export control. Workshop allocation keeps the same organiser
and workshop navigation context and provides the URL-backed tertiary views **Antworten**,
**Nachfrage**, and **Verlauf**. These views derive from the prospective world and plan,
including conflict notices and person tracing, without adding a persistence boundary.

All organiser screens use the shared `OrganiserScreenHeader` for their primary
heading and action row. Overview metrics use `StatsStrip`; quiet properties use
`Tag`; state and attention labels use `Badge`; completed or empty-success states
use `SuccessState`. Removal and retirement actions use the shared
`DestructiveActionDialog`, with dependent entities blocked inline until they are
handled.

One app bar (brand, role, navigation, and the save-status control) covers every
`/organiser*` route; there is no separate site shell header or boxed page header
there. The save-status control is a single persistent button in the app bar with a
popover, not a toggle that disappears: it shows one of **Gespeichert**,
**Entwurfsmodus** (empty or with a pending count), or **Speichern fehlgeschlagen** at
a glance, and opens a popover with the same state, a draft-mode switch, and the
save/discard actions. See [design system](design-system.md#save-status-control) for
the states, icons, and the provisional-state (blueprint) marking.

Immediate mode is the session default; the draft-mode switch inside the popover turns
on **Entwurfsmodus**, which collects changes as browser-local drafts until the person
saves them. Discarding drafts, or saving every pending draft, both exit drafting mode
back to immediate mode -- there is no state where drafts are at zero and drafting mode
stays on. Local events added during an in-flight request remain queued after the
submitted prefix.
Collection creation uses the shared `CollectionCreateAction`: its labelled action
sits in the relevant screen or immediate parent-section header and opens an
accessible dialog. Workshops, external leaders, workshop spaces and slots,
families, people, buildings, rooms, and beds follow this pattern. Empty states
repeat the same first useful action; populated views do not keep creation forms
open in their normal flow. These controls still stage the same ordinary event
drafts through the shared local-first pipeline.

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
