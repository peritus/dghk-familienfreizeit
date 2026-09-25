# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/`, `/login`, `/family` | Public foundation welcome placeholder |
| `/organiser` | Lazy authenticated organiser dashboard |
| `/organiser/families` | Derived family table with first-row invitation staging |
| `/organiser/families/:id` | Responsive editable people table, lifecycle staging and event history |
| Other paths | Not-found message and a link back to the start |

The organiser chunk probes the session and organiser log before deriving. It owns
one draft-change reducer and one local-first command pipeline shared by all current
organiser routes. A click stages ordinary event drafts, renders the prospective world
locally, and then either invokes the Worker apply request automatically or leaves the
draft changes for explicit review according to the session's drafting policy. The Worker
remains the only persistence boundary; there is no separate drafting API or server
draft state.

The header toolbar exposes an upload-cloud control for starting **Entwurfsmodus**.
Immediate mode is the session default. Drafting mode replaces that control with a
labelled **Änderungsentwürfe in diesem Browser** workspace inside the header. It shows
the draft count and explains that these drafts remain local until applied. Discarding
drafts exits drafting mode; applying successful drafts exits it when no drafts remain.
Local events added during an in-flight request remain queued after the submitted prefix.
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
