# Implemented design system

[The shell](../../src/app/components/shell.tsx) contains a German skip link and
focusable main content on every route. On public routes (`/`, `/login`, `/family`) it
also renders its own brand header and `<main id="content">`. On `/organiser*` routes
it renders neither -- the organiser section owns a single app bar and
`<main id="content">` pair of its own (see [Frontend](frontend.md) and
`src/app/organiser/organiser-frame.tsx`), so the two never nest. Account, help,
sign-out and domain navigation controls are not implemented for the public shell.

[Global CSS](../../src/app/globals.css) integrates Tailwind v4 and animation
utilities. The copied orange theme uses a warm paper background, white cards,
black text and borders, offset shadows and slightly rounded corners. Base text
is 16px with relaxed line height. Links and buttons have visible keyboard focus.
`cursor: pointer` is an explicit base-layer rule for every interactive element,
since Tailwind v4's preflight resets buttons to `cursor: default`.

A hard offset shadow means "pressable": the shared `pressable` utility applies it to
buttons and whole-card links, with an `::after` overlay that keeps the original hit
area clickable while the element slides 4px into its shadow on press. Information-only
cards and navigation links stay flat.

The public family welcome view uses a responsive hero card with a clear
registration status and a small inline drafting-compass illustration.

## Save-status control

The organiser app bar's save-status button (`src/app/organiser/save-status.tsx`)
shows one of four looks -- plain white (saved), white with a provisional pattern
(draft mode, empty), accent-filled with the same pattern (draft mode, pending, with a
count badge), or red (a save that failed) -- using Lucide `check`, `pencil`, and
`triangle-alert` icons. It opens a popover (Base UI `Popover`) anchored to itself, with
`role="dialog"`, `aria-labelledby`, `aria-expanded`/`aria-controls` on the trigger, and
closes on Esc, an outside click, or a second click on the trigger. The provisional
pattern (`blueprint`/`blueprint-on-main` utilities, an engineering-grid background)
marks browser-local, not-yet-saved state; it is not decorative. There is no offline
look wired up yet -- `OrganiserStatus` has no case for a lost connection.

The popover's draft-mode switch is a Base UI `Switch`. Leaving draft mode with pending
changes, or discarding drafts, both require an explicit confirmation step inside the
same popover before anything is deleted or the mode changes.

The component registry and aliases live in [components.json](../../components.json).
The implemented primitives are Button, Card, Alert, Skeleton, SegmentedControl,
and AlertDialog in [`src/app/components/ui/`](../../src/app/components/ui/).
Copied source and its adaptations are attributed in
[THIRD_PARTY.md](../../THIRD_PARTY.md). The Button uses Base UI's `render`
composition API, supports variants (including a `danger` variant for
destructive confirmations) and sizes, and includes reduced-motion handling.
AlertDialog composes Base UI's `AlertDialog` (portal, backdrop, focus trap)
with Button the same way. `Popover` and `Switch` are used directly from
`@base-ui/react` (save-status control) rather than wrapped as our own
components. Components are editable application source.

Editable organiser data uses the inline table pattern described in the [UI
specification](../../spec/ui/design-system.md#editable-table-and-card-pattern).
The families view puts the invitation controls in the first table row, and the
family-detail people view uses a semantic editable table with a first-row
creation action and same-row save/delete controls. At narrow widths, these
tables become labeled stacked cards while preserving field and action order.

The accommodation screen (`/organiser/inventory`,
[`src/app/organiser/screens/inventory.tsx`](../../src/app/organiser/screens/inventory.tsx))
implements a different table shape for a different need: rooms are a real
`<table>` whose rows expand into a full-width detail row holding that room's
beds, per the [expandable hierarchical tables
pattern](../../spec/ui/design-system.md#expandable-hierarchical-tables).
It's also the first screen with a flat stats-strip card and true/false room
features rendered as tags rather than table columns. At narrow widths the
room table switches to stacked, labeled rows below the `md` breakpoint, the
same `max-md:block`/`md:hidden` convention the editable table pattern above
uses, applied to a table with an expandable row rather than an editable one.
The organiser shell distinguishes a whole-app load failure from a save
failure (`load_error` vs. `error` status) so a failed initial fetch never
renders stats or forms against an empty, falsely-real world.

Accessibility checks exercise semantic route/loading/error behavior in jsdom.
They do not establish contrast, 360px visual layout, or real-browser keyboard
behavior. Those checks and the additional domain controls remain requirements in
[the design-system specification](../../spec/ui/design-system.md).
