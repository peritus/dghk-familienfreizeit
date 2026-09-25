# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/`, `/login`, `/family` | Public foundation welcome placeholder |
| `/organiser` | Lazy authenticated organiser dashboard |
| `/organiser/families` | Derived family table and manual invitation staging |
| `/organiser/families/:id` | Family detail, person lifecycle staging and event history |
| Other paths | Not-found message and a link back to the start |

The organiser chunk probes the session and organiser log before deriving. It owns
one pending-event reducer and one local-first command pipeline shared by all current
organiser routes. A click stages ordinary event drafts, renders the prospective world
locally, and then either invokes the Worker apply request automatically or leaves the
drafts for explicit review according to the session's collecting policy. The Worker
remains the only persistence boundary; there is no separate collecting API or server
draft state.

The header toolbar exposes **Änderungen sammeln** with a numeric pending-event count
inside the control, including zero. Immediate mode is the session default. Collecting
mode defers the same apply command and keeps a labelled **Local changes in this
browser** section expanded below the header. The section explains that its drafts are
actively collected only in this browser and are not visible to other organisers until
applied. The control remains pressed but cannot leave collecting mode while drafts
exist. Local events added during an in-flight request remain queued after the submitted
prefix.

## Frontend navigation and state invariants

Internal route changes use wouter's client-side navigation and must not reload
the document. The organiser state owner remains mounted while moving between
the dashboard, family list, family detail, and browser history entries. Pending
event drafts, the derived local world, collecting mode, and the local-change
review panel therefore survive those transitions. Screen-local inputs such as
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
