# Implemented design system

[The shell](../../src/app/components/shell.tsx) contains a German skip link,
Familienfreizeit header linking home, and focusable main content. It uses a
centered layout with responsive padding. Account, help, sign-out and domain
navigation controls are not implemented.

[Global CSS](../../src/app/globals.css) integrates Tailwind v4 and animation
utilities. The copied orange theme uses a warm paper background, white cards,
black text and borders, offset shadows and slightly rounded corners. Base text
is 16px with relaxed line height. Links and buttons have visible keyboard focus.

The component registry and aliases live in [components.json](../../components.json).
The implemented primitives are Button, Card, Alert and Skeleton in
[`src/app/components/ui/`](../../src/app/components/ui/). Copied source and its
adaptations are attributed in [THIRD_PARTY.md](../../THIRD_PARTY.md).
The Button uses Base UI's `render` composition API, supports variants and sizes,
and includes reduced-motion handling. Components are editable application source.

Accessibility checks exercise semantic route/loading/error behavior in jsdom.
They do not establish contrast, 360px visual layout, or real-browser keyboard
behavior. Those checks and the additional domain controls remain requirements in
[the design-system specification](../../spec/ui/design-system.md).
