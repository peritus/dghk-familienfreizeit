# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/`, `/login`, `/family` | Public foundation welcome placeholder |
| `/organiser` | Lazy authenticated organiser dashboard |
| `/organiser/families` | Derived family table with first-row invitation staging |
| `/organiser/families/:id` | Responsive editable people table, lifecycle staging and event history |
| `/organiser/inventory` | Selected room-inventory surface for buildings, rooms, beds, capacity, traits, and costs |
| Other paths | Not-found message and a link back to the start |

The organiser chunk probes the session and organiser log before deriving. It owns
one draft-change reducer and one local-first command pipeline shared by all current
organiser routes. A click stages ordinary event drafts, renders the prospective world
locally, and then either invokes the Worker apply request automatically or leaves the
draft changes for explicit review according to the session's drafting policy. The Worker
remains the only persistence boundary; there is no separate drafting API or server
draft state.

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
The family invitation and people-management controls are integrated into their
tables on wider screens. Each editable table puts its creation row first; the
people table keeps **Speichern** and **Löschen** together in one action cell. At
narrow widths the tables switch to labeled cards rather than requiring horizontal
scrolling. These controls still stage the same ordinary event drafts through the
shared local-first pipeline.

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

On navigation the app focuses the main content region. A skip link provides
keyboard access to that region. Lazy loading renders a skeleton and live status;
the route error boundary renders a sanitized recovery message and reload button.
These semantics are covered in
[app tests](../../test/app/shell.test.tsx), while real organiser navigation and
link targets are covered by the [browser route suite](../../test/browser/routes.spec.ts).
The shared [route contract](../../src/organiser/routes.ts) keeps nested organiser
links separate from their public `/organiser/...` URLs.

See the [design system](design-system.md) for primitives and styling, the
[implemented organiser view](../application/organiser-view.md), and the
[frontend specification](../../spec/ui/frontend.md) for outstanding behavior.
