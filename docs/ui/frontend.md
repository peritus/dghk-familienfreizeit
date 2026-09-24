# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/`, `/login`, `/family` | Public foundation welcome placeholder |
| `/organiser` | Lazy authenticated organiser dashboard |
| `/organiser/families` | Derived family table, search, and manual invitation staging |
| `/organiser/families/:id` | Family detail, person lifecycle staging and event history |
| Other paths | Not-found message and a link back to the start |

The organiser chunk probes the session and organiser log before deriving. It owns
one pending-event reducer and one local-first command pipeline shared by all current
organiser routes. A click stages ordinary event drafts, renders the prospective world
locally, and then either invokes the Worker apply request automatically or leaves the
drafts for explicit review according to the session's collecting policy. The Worker
remains the only persistence boundary; there is no separate collecting API or server
draft state.

The header toolbar exposes **Änderungen sammeln** and a numeric pending-event badge.
Immediate mode is the session default. Collecting mode defers the same apply command;
the badge opens the shared review panel. The badge counts event records, while Undo
retains action-group semantics. Local events added during an in-flight request remain
queued after the submitted prefix.

On navigation the app focuses the main content region. A skip link provides
keyboard access to that region. Lazy loading renders a skeleton and live status;
the route error boundary renders a sanitized recovery message and reload button.
The boundary resets when the route changes. These semantics are covered in
[app tests](../../test/app/shell.test.tsx), while real organiser navigation and
link targets are covered by the [browser route suite](../../test/browser/routes.spec.ts).
The shared [route contract](../../src/organiser/routes.ts) keeps nested organiser
links separate from their public `/organiser/...` URLs.

See the [design system](design-system.md) for primitives and styling, the
[implemented organiser view](../application/organiser-view.md), and the
[frontend specification](../../spec/ui/frontend.md) for outstanding behavior.
