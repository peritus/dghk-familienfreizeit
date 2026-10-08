# Implemented design system

Every mounted route uses the shared
[ApplicationFrame](../../src/app/components/application/application-frame.tsx):
one German skip link, one brand/app bar, one focusable `<main id="content">`, and
one width contract (`max-w-5xl`, full width with responsive padding). Public,
authenticated organiser, route-loading and recovery adapters compose that frame;
frames never nest. Public routes currently have no domain primary navigation or
account controls. Family authentication and the family-facing application remain
outstanding; the same composition contract applies when those screens are built.

## Screen hierarchy

[ScreenLayout](../../src/app/components/shared/ui/screen-layout.tsx) owns the order
below the app bar. Optional slots collapse; callers supply content rather than
recreating spacing, widths or heading markup.

`OccasionLanding` is the public branded landing archetype and an intentional
exception to `ScreenLayout` and `ScreenHeader`. It uses a compact hero composition
to establish the occasion's identity and present its configured public actions.
It remains inside `ApplicationFrame`, uses the shared theme and button tokens, and
keeps the single-page H1, responsive layout, keyboard access, and browser-print
contract. Other workflow and recovery screens continue to use the shared screen
hierarchy.

```text
ApplicationFrame
+------------------------------------------------------------------+
| Brand / role       PrimaryNavigation            Save / account    |
+------------------------------------------------------------------+
| SecondaryNavigation                                              |
| ScreenHeader: eyebrow, H1, description       [screen-wide action]  |
| ActionableNotices: what needs attention              [resolve]    |
| WorkflowStepper / StatusNotice                                    |
| StatsStrip:         value | value | value                         |
| TertiaryNavigation                                                |
| CollectionSection                                                |
|   SectionHeader: H2                         [create collection item]|
|   Collection controls: search / filters                          |
|   List, table, cards or specialised domain view                   |
|   Nested CollectionSection: H3              [create nested item] |
| Screen footer                                                    |
+------------------------------------------------------------------+
```

The three names describe scope, independently of button emphasis:

| Component | Scope | Current examples |
|---|---|---|
| `PrimaryNavigation` | Application areas | Dashboard, Familien, Unterbringung, Workshops |
| `SecondaryNavigation` | Routes within an area | Inventar / Belegung; workshop areas |
| `TertiaryNavigation` | Sibling views within the active context | Workshop collections; participation views; family topics |

Primary and secondary navigation share presentation primitives; organiser adapters
retain typed routes and active-match rules. Tertiary views may use URLs or local UI
state. A person/entity picker is a selector, not another navigation level.

`ScreenHeader` supplies the screen's single H1. Its action slot is for a
screen-wide operation, such as editing the current family's identity.
`CollectionSection` composes an accessible labelled region, `SectionHeader`, a
right-aligned action, scoped controls and content. Nested collections use H3/H4
through `heading_level`; responsive wrapping preserves heading-before-action order.

## Collection actions and context

[CollectionCreateAction](../../src/app/components/shared/ui/collection-create-action.tsx)
belongs beside its collection heading, below tertiary navigation when that
collection is a local view. Its explicit label names the entity and result. The
shared [EntityEditorDialog](../../src/app/components/shared/ui/entity-editor-dialog.tsx)
owns the accessible dialog/form frame, validation area and cancel/submit footer;
domain adapters own fields, validation and ordinary event commands.

Workshop overview views create workshops, provide no create action for derived
internal leaders, and create external leaders respectively. The standalone leader
URLs render those same collections. Inventory nests Gebäude (H2, add building),
named building (H3, add room), and room beds (H4, add bed). Empty and populated
collections use the same action component. Forms do not remain open in a populated
collection's normal flow.

[ActionableNotices](../../src/app/components/shared/ui/notice.tsx) provides a named
region; `ActionableNotice` states a finding and offers its resolution action.
Screen-wide findings appear immediately after the H1, above tertiary navigation,
so local view changes do not hide them. Findings affecting only a record or one
collection stay with that scope. Status notices report phase/context without
inventing an action. Existing findings and configured resolver results supply the
meaning; presentation components do not calculate new domain rules.

[StatsStrip](../../src/app/components/shared/ui/stats-strip.tsx) is the shared metrics
component: one flat card with equal divided cells. Screen-wide totals precede
tertiary navigation. Labels state scope; collection-specific counts and filters
remain with that collection. Failed/loading data never produces plausible zero
metrics.

## Shared presentation

Generic components live in `src/app/components/shared/ui/` and have no workshop or
organiser prefix. They include `Field`, `TextField`, `SelectField`, `TextareaField`,
`ChoiceField`, `CollectionList`, `CollectionRow`, `TableFrame`, `DataTable`,
`ResponsiveCollection`, `PropertyTags`, `EntityPicker`, `FixedDecisionReview`,
`LoadingState`, `ErrorState`, `EmptyState` and `SuccessState`. Field labels use
unique ids and connect hints/errors through `aria-describedby`; invalid fields
also expose `aria-invalid`.

Reuse the table frame around specialised semantic cells rather than duplicating
borders/overflow. Shared responsive collections choose the wide semantic table on
paper. Module-owned programme grids, participation matrices, room cards, ranking
controls and resolver-specific findings keep their domain renderers. Their frames,
fields, states, labels and actions compose the same generic primitives.

## Browser printing on every screen

[D21](../../decisions.md#d21--print-through-the-browser-no-export-no-print-button-perfect-print-stylesheets)
applies to every current and future screen. Use the browser print dialog. The
application adds no print/export/download control.

The shared paper layer in [globals.css](../../src/app/globals.css) forces a white
light palette, natural document height, readable A4 typography, wrapping values,
flat borders and deliberate row/heading page breaks. It hides application and
secondary/tertiary navigation, filters, action controls and dialog overlays.
Ordinary buttons containing entity names or programme cells retain their data.
`print_context` identifies a selected view or filter when its controls disappear;
`print_orientation` selects portrait or landscape.

Text and textarea fields print their current value, including unsaved multi-line
input, through a wrapping paper representation. Selects print their selected label;
checkboxes/radios retain selected state. Printing does not stage or persist events.
Inventory prints the current room summaries and any expanded bed details; it does
not open collapsed collections or fabricate another domain projection.

[PrintFooter](../../src/app/components/shared/ui/print-layout.tsx) refreshes its
timestamp on `beforeprint`, uses the configured timezone, and can report the data
revision, unsaved changes, closing time, audience/context and confidentiality.
Authenticated organiser output carries its restricted audience. Public/recovery
screens omit unavailable revision information. A specialised screen footer
replaces the frame default so paper has one footer. Chromium's page-margin counters
provide page numbers; footer text occupies reserved space. Other browsers' pagination
and margin-counter support have not been verified in this change.

The accommodation assignment view retains its dedicated occupancy projection;
workshop lists print the selected document and the closed result where applicable;
the participation matrix retains landscape paper, repeated table headers and its
repeated footer spacer. Report-specific audience projections, running report titles
and the outstanding report catalogue remain in the
[report specification](../../spec/application/reports.md).

Verification includes all registered organiser URLs plus public/login/not-found
screens, 390px overflow and desktop width/order checks, current-field/footer tests,
Storybook print fixtures and a populated multi-page participation PDF and populated family/inventory/assignment PDFs in Chromium.
This establishes local browser behavior, not hosted deployment or cross-browser
paper equivalence.

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

`OccasionLanding` is reusable across occasion profiles. Each profile supplies
localized heading and introduction copy plus an ordered list of public actions.
Actions may navigate to an internal route or an HTTPS URL, and each chooses primary
or secondary emphasis. External links open in the current tab. The landing keeps
the occasion-branded hero card and decorative illustration, with its action list
forming the public entry points for that occasion. Add a family login or schedule
action through profile configuration when those destinations are implemented; the
landing component does not create routes or domain behavior.

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

Use `nix develop -c pnpm run storybook` while developing. Before implementation,
add or adjust the story and its usage guidance, then use
`nix develop -c pnpm run test:storybook` as the drift check. Intentional visual
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
Disabled Buttons retain an opaque offline surface, dashed border and muted text;
they remove the pressable shadow and expose the disabled semantics.
AlertDialog composes Base UI's `AlertDialog` (portal, backdrop, focus trap)
with Button the same way. `DestructiveActionDialog` is the canonical app-facing
composition for removal and retirement actions; it requires consequence copy and
keeps the safe cancel action beside the danger action. `Popover` and `Switch` are used directly from
`@base-ui/react` (save-status control) rather than wrapped as our own
components. Components are editable application source.

Editable organiser data uses the inline table pattern described in the [UI
specification](../../spec/ui/design-system.md#editable-table-and-card-pattern).
Families and family people put creation in the collection heading and retain
record-specific edit/save/delete controls with the affected record. At narrow widths, these
tables become labeled stacked cards while preserving field and action order.

The accommodation screen (`/organiser/accommodation/inventory`,
[`src/app/organiser/screens/inventory.tsx`](../../src/app/organiser/screens/inventory.tsx))
implements a different table shape for a different need: rooms are a real
`<table>` whose rows expand into a full-width detail row holding that room's
beds, per the [expandable hierarchical tables
pattern](../../spec/ui/design-system.md#expandable-hierarchical-tables).
Screen totals use the shared stats strip, and true/false room amenities use tags
rather than table columns. At narrow widths the
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
Fixed decision comparisons use the shared `FixedDecisionReview` pattern: the
event-backed fixed result, the automatic-only counterfactual, and an explicit
status are presented together. Domain modules supply only their labels and
identities; the comparison semantics are shared.

Editing is read-only by default: existing family people show their values as
plain text with **Bearbeiten** and **Entfernen** actions. **Bearbeiten** opens
the fields for that person, while **Entfernen** requires a confirmation. The
save-status control remains the one shared persistence indicator across all
organiser screens; domain screens do not add their own draft bars or technical
state counters.

The route loading state follows the shared H1 with a calm preparation panel with a reduced-
motion-safe spinner and the message **Ansicht wird vorbereitet …**. It does not
use skeleton fragments for a short route transition.

Accessibility checks exercise semantic route/loading/error behavior in jsdom.
Real-browser route and 390px layout checks complement these tests. They do not
establish exhaustive contrast or every 360px/domain-control keyboard interaction. Those checks and the additional domain controls remain requirements in
[the design-system specification](../../spec/ui/design-system.md).
