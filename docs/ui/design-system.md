# Implemented design system

[The shell](../../src/app/components/application/shell.tsx) contains a German skip link and
focusable main content on every route. On public routes (`/`, `/login`) it
also renders its own brand header and `<main id="content">`. On `/organiser*` routes
it renders neither -- the organiser section owns a single app bar and
`<main id="content">` pair of its own (see [Frontend](frontend.md) and
`src/app/organiser/organiser-frame.tsx`), so the two never nest. Account, help,
sign-out and domain navigation controls are not implemented for the public shell.

[Global CSS](../../src/app/globals.css) integrates Tailwind v4 and animation
utilities. The orange theme uses semantic tokens for warm light surfaces and a
dark system-preference variant with near-black surfaces, cream outlines, and
accessible foreground colors. Cards and popovers use `secondary-background`,
fields use `input`, pressable shadows use `shadow-c`, and native checkboxes and
radios use `main-deep` as their accent. Base text is 16px with relaxed line
height. Links and buttons have visible keyboard focus through the `ring` token.
`cursor: pointer` is an explicit base-layer rule for every interactive element,
since Tailwind v4's preflight resets buttons to `cursor: default`.

A hard offset shadow means "pressable": the shared `pressable` utility applies it to
buttons and whole-card links, with an `::after` overlay that keeps the original hit
area clickable while the element slides 4px into its shadow on press. Information-only
cards and navigation links stay flat.

The public organiser landing uses a responsive hero card with a prominent organiser login
action and a small inline drafting-compass illustration.

Workshop screens reuse the same neobrutalist language at every viewport width:
thick semantic outlines, offset shadows for actionable controls, flat information
cards, and wrapping horizontal tabs. Orange is reserved for actionable attention
and is paired with a text or glyph meaning; status must never be communicated by
colour alone. Workshop filters, unscheduled reasons, cancelled history, and save
state therefore include visible labels. Browser print hides navigation and controls;
the application does not add a print or export button. Printing forces the light
palette, and mobile browser chrome follows the active preference through the
light and dark `theme-color` metadata in `index.html`.

Compact workshop authoring collections use one bordered list with divider-separated
rows rather than a grid of independent cards. Rows keep the primary identity,
small muted metadata, and actions aligned while allowing content to wrap at narrow
widths. Prototype-derived authoring dialogs use the shared bordered footer pattern,
with inline checkbox options where the choice is a compact set of event slots.

## Local visual contract

The repository-local [UI contract](storybook.md) is the visual workbench for
components and screens. `src/app/design/style-guide.mdx` explains when to use a
primitive and composes the executable stories with Storybook `Canvas`; the
stories themselves render production React components. The coverage registry
and Playwright snapshots cover every current component, application composition,
and screen without requiring a hosted design tool or service.

Use `nix develop -c npm run storybook` while developing. Before implementation,
add or adjust the story and its usage guidance, then use
`nix develop -c npm run test:storybook` as the drift check. Intentional visual
changes require the explicit `test:storybook:update` command and a review of
the committed PNG baseline.

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
AlertDialog, DestructiveActionDialog, Badge, Tag, StatsStrip, and SuccessState in
[`src/app/components/shared/ui/`](../../src/app/components/shared/ui/).
Copied source and its adaptations are attributed in
[THIRD_PARTY.md](../../THIRD_PARTY.md). The Button uses Base UI's `render`
composition API, supports variants (including a `danger` variant for
destructive confirmations) and sizes, and includes reduced-motion handling.
AlertDialog composes Base UI's `AlertDialog` (portal, backdrop, focus trap)
with Button the same way. `DestructiveActionDialog` is the canonical app-facing
composition for removal and retirement actions; it requires consequence copy and
keeps the safe cancel action beside the danger action. `Popover` and `Switch` are used directly from
`@base-ui/react` (save-status control) rather than wrapped as our own
components. Components are editable application source.

Editable organiser data uses the inline table pattern described in the [UI
specification](../../spec/ui/design-system.md#editable-table-and-card-pattern).
The families view puts the invitation controls in the first table row, and the
family-detail people view uses a semantic editable table with a first-row
creation action and same-row save/delete controls. At narrow widths, these
tables become labeled stacked cards while preserving field and action order.

The accommodation screen (`/organiser/accommodation/inventory`,
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

All organiser screens use the shared screen header, stats strip, quiet property
tags, state badges, success messages, and destructive-action confirmation. Room
cards, requirement chips, family entries, building sections, fit hints, the
fixed-assignment dialog, and the print composition remain room-assignment-specific under
[`src/modules/room-assignment/app/components/assignment-board/`](../../src/modules/room-assignment/app/components/assignment-board/).
The board does not use `blueprint` or a paper background to mark fixed
assignments: those tokens are reserved for browser-local draft state. Fixed
assignments are ordinary event-backed organiser decisions and use the shared
badge border language instead.

Editing is read-only by default: existing family people show their values as
plain text with **Bearbeiten** and **Entfernen** actions. **Bearbeiten** opens
the fields for that person, while **Entfernen** requires a confirmation. The
save-status control remains the one shared persistence indicator across all
organiser screens; domain screens do not add their own draft bars or technical
state counters.

The route loading state is a centered, calm preparation panel with a reduced-
motion-safe spinner and the message **Ansicht wird vorbereitet …**. It does not
use skeleton fragments for a short route transition.

Accessibility checks exercise semantic route/loading/error behavior in jsdom.
They do not establish contrast, 360px visual layout, or real-browser keyboard
behavior. Those checks and the additional domain controls remain requirements in
[the design-system specification](../../spec/ui/design-system.md).
