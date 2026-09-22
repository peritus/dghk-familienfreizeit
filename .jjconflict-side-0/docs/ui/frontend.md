# Implemented frontend

[App](../../src/app/app.tsx) uses React and wouter inside a shared German shell.
The route table is:

| Route | Implemented behavior |
|---|---|
| `/`, `/login`, `/family` | Public foundation welcome placeholder |
| `/organiser` and nested paths | Lazy public organiser placeholder |
| Other paths | Not-found message and a link back to the start |

These are not authenticated or functional domain screens. The organiser
placeholder contains no private information. There is no session probe, pending
event reducer, profile-driven form, or local derivation.

On navigation the app focuses the main content region. A skip link provides
keyboard access to that region. Lazy loading renders a skeleton and live status;
the route error boundary renders a sanitized recovery message and reload button.
The boundary resets when the route changes. These semantics are covered in
[app tests](../../test/app/shell.test.tsx), using jsdom rather than a real browser.

See the [design system](design-system.md) for primitives and styling, and the
[frontend specification](../../spec/ui/frontend.md) for outstanding behavior.
