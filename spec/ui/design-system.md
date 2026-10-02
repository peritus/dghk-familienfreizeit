# UI-00 — Design system and application shell

## Audience and purpose

The family view is for non-technical families on phones. The organiser tool is
for a small organisation team on laptops. Both applications share
visual primitives, but not navigation density.

Governing decisions: [D8](../../decisions.md#d8--react-for-every-screen),
[frontend](frontend.md), and [translation guidelines](german-translation-guidelines.md).

## Shared shell

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Familienfreizeit                         [help] [account] [sign out]   │
├──────────────────────────────────────────────────────────────────────┤
│ page title                                      status / last saved      │
│                                                                      │
│ screen content                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

The family shell removes the organiser navigation and uses a compact header:

```text
┌──────────────────────────────┐
│ Familienfreizeit       [•••] │
├──────────────────────────────┤
│ page title                   │
│ content                      │
└──────────────────────────────┘
```

## Visual language

Use the [implemented theme and primitives](../../docs/ui/design-system.md).
For the outstanding screens, verify readable typography, at least 16px body text
on family screens, comfortable line height, and status information that never
relies on color alone. Group information into cards and reserve tables for dense
organiser data. Extend the component inventory below only deliberately.

## Local visual contract

The implemented components and screens have a repository-local Storybook
contract. Stories beside the React source render the real components and
document their states; [`style-guide.mdx`](../../src/app/design/style-guide.mdx)
records why/when guidance; [`ui-coverage.ts`](../../src/app/design/ui-coverage.ts)
maps every current renderable to a story; and Playwright baselines verify the
rendered result. This contract is intentionally file-based and requires no
hosted design service or MCP integration. Outstanding screens remain
specification work until a production renderable and coverage entry exist.

## Responsive rules

The family layout is designed at 360px first. Content becomes one column,
controls stack, dialogs become full-height sheets, and no table requires
horizontal scrolling. The organiser layout targets laptop widths; below 900px the
board may become a list view and the side rail may move above the rooms.

## Shared states and accessibility

Apply the [implemented route-state patterns](../../docs/ui/frontend.md) to new
domain screens and verify the following behavior for their controls:

- show a visible focus ring and preserve keyboard order;
- every icon-only action has an accessible name;
- every destructive or consequential action has text confirmation;
- loading preserves the page skeleton and reads out completion;
- errors identify the affected field or action and provide recovery;
- empty states explain what the user can do next;
- respect reduced-motion preferences;
- dialogs trap focus and return focus to their triggering control.

## Neobrutalist component contract

The component contract follows the [neobrutalism Alert Dialog
documentation](https://www.neobrutalism.dev/docs/alert-dialog): strong semantic
outlines, offset shadows, direct labels, and deliberate primary actions. The
orange palette follows the system/browser color preference and has no
user-visible theme switch. Printing always selects the light palette.

Use this composition for every action that applies, discards, communicates, sends,
or clears something:

```text
AlertDialog
└─ AlertDialogTrigger render={<Button />}
   AlertDialogContent
   ├─ AlertDialogHeader
   │  ├─ AlertDialogTitle
   │  └─ AlertDialogDescription
   └─ AlertDialogFooter
      ├─ AlertDialogCancel
      └─ AlertDialogAction
```

Compose a primitive with one of our own components through Base UI's
[`render` prop](https://base-ui.com/react/handbook/composition), which takes the
element to render in place of the primitive's default and merges the primitive's
props and accessible semantics into it. Every interactive control follows this
API and keeps those semantics intact.

**Implemented** as `AlertDialog`/`AlertDialogContent`/`AlertDialogHeader`/
`AlertDialogFooter`/`AlertDialogTitle`/`AlertDialogDescription`/
`AlertDialogCancel`/`AlertDialogAction`
([`src/app/components/shared/ui/alert-dialog.tsx`](../../src/app/components/shared/ui/alert-dialog.tsx)),
composing Base UI's `AlertDialog` (portal, backdrop, focus trap, Esc/
outside-click handling) with `Button` through the `render` prop. The
app-facing [`DestructiveActionDialog`](../../src/app/components/shared/ui/destructive-action-dialog.tsx)
composes this primitive for every removal and retirement action, requires visible
consequence text, and keeps the safe cancel action beside the danger action.

## Pressable elements and hit areas

**Implemented** as the `pressable`/`blueprint`/`blueprint-on-main` utilities and the
base-layer `cursor: pointer` rule in [globals.css](../../src/app/globals.css); see
[design system](../../docs/ui/design-system.md) for the rule ("a hard shadow means
pressable") and the `Button`/`Card` components that use it.

**Outstanding:** the `rounded-base` (5px, not the smaller default `rounded`) radius
rule is enforced in the organiser app bar, dashboard, and inventory screen, but not
yet swept across the rest of the app (family screens, other organiser forms still
use `rounded` in places) — a follow-up pass, not part of this change.

## Disabled state (outstanding)

Avoid disabled buttons where possible: hide an action that doesn't apply
rather than showing it disabled, or keep it enabled and explain the
constraint on use. When a control must be disabled, it must not read as a
washed-out version of the primary/accent button — that looks like a pale
brand button, not an unavailable action, and tends to fail contrast. Use a
white background, a dashed border (the one place a dashed border is
allowed, because a disabled control has no shadow to clash with), muted
text, no shadow, and `cursor: not-allowed`.

Not yet built: the shared `Button` still uses the generic
`disabled:opacity-50` from its base classes. This dedicated disabled style is
scoped to whichever control needs it next, not applied speculatively.

## Save-status control and provisional-state pattern

**Implemented** as the organiser app bar's save-status control; see [Save-status
control](../../docs/ui/design-system.md#save-status-control) for the built states,
icons, popover mechanics, and confirmation flows, and
[D15](../../decisions.md#d15--derivation-is-a-named-primitive-and-the-client-may-call-it)
for the underlying immediate/drafting commit-timing policy this control presents
(unchanged by it). The provisional (engineering-grid) pattern and the new `--paper`,
`--danger`, `--offline`, `--muted`, `--grid-minor`/`--grid-major` tokens are
implemented in [globals.css](../../src/app/globals.css) and documented alongside it.

**Outstanding:**

- No offline look is wired up: `OrganiserStatus` has no case for a lost connection,
  so the grey "offline" state has no trigger yet (`navigator.onLine` detection and an
  offline-in-auto-mode queue are still open).
- The popover doesn't itemize individual drafts or the specific refused change per
  family ("Familie Weber: Telefonnummer geändert") — it shows the count only. Building
  that needs a change-description mapping over `EventDraft`/`Event` that doesn't exist
  yet; the count-only view is the deliberate interim.
- `--muted` text contrast on `--background` (the cream page background, not just
  white) is not verified.
- No `beforeunload` warning yet for pending drafts.
- The blueprint pattern is not yet applied to other surfaces (e.g. a family card
  holding unsaved changes) beyond the save-status control itself.

## Dashboard structure

**Implemented** for `/organiser` (UI-05): the headline-first principle — the page's
single `<h1>` states the question it answers, with the Hinweise list (including its
positive empty state) directly below, before the overview section — plus the merged
single app bar. See [UI-05](screens/organiser-dashboard.md) and
[Frontend](../../docs/ui/frontend.md).

## Editable table and card pattern

For every current or future screen that creates or edits records in a table:

- use a semantic table on desktop and larger tablet layouts;
- put the empty creation row first and distinguish it with a subtle surface
  treatment, not an extra visual row label;
- name the creation action explicitly, such as **Neue Person hinzufügen** or
  **Familie einladen**;
- keep existing record fields editable within their own row;
- keep all row actions in a stable final action cell;
- keep compact actions such as **Speichern** and **Löschen** on one line where
  the available width allows it;
- align input and button heights, baselines, padding, and action-cell spacing;
- never let an action drift below or outside the record it affects;
- switch completely to labeled stacked cards at narrow breakpoints instead of
  compressing the table or relying on horizontal scrolling;
- preserve equivalent field order, labels, focus order, and actions between
  table and card presentations;
- use valid form association when controls are distributed across table cells;
- keep destructive actions text-labelled or otherwise accessible, and require
  confirmation for consequential deletion.

## Collection creation actions

Every organiser collection creates an item through the shared
`CollectionCreateAction`. Place its visible, explicitly labelled trigger in the
collection's screen header or immediate parent-section header; it opens an
accessible dialog with cancellation before the result-specific primary action.
Use the same action in an empty state. Do not leave a creation form persistently
visible in a populated collection. This applies to workshops, external leaders,
workshop spaces, slots, families, people, buildings, rooms, and beds.

When an implementation introduces a potentially reusable pattern, follow the
general-rule promotion process in [AGENTS.md](../../AGENTS.md): name the
candidate in the plan, obtain explicit user approval, and update this section
in the same change when it is approved.

The description states the concrete consequence. `AlertDialogAction` is the
high-contrast offset-shadow primary action; `AlertDialogCancel` is the quieter
outlined alternative.

## Expandable hierarchical tables

For a table whose rows have their own nested collection (rooms with beds,
and any future case shaped like it — not the flat editable-row pattern
above):

- a real `<table>` with `<caption class="sr-only">` and the row's
  identifying cell as `<th scope="row">`, not CSS-grid `<div>`s;
- the first cell holds a `<button>` with a chevron (closed/open), plus
  `aria-expanded` and `aria-controls` pointing at the detail row's `id`;
- the detail row is a `<tr>` with one `<td colspan>` holding the nested
  content, given the header row's `--paper` background;
- multiple rows may be open at once; a newly created row opens
  automatically so its own detail (and add-child form) is immediately
  visible;
- only show a column if it compares across rows — a boolean becomes a tag
  (below), not a "Nein" line.

**Implemented** for `/organiser/accommodation/inventory` room rows
(`src/app/organiser/screens/inventory.tsx`); **outstanding** everywhere
else this shape could apply.

## Tags and badges

- **Tag** (a true property, shown only when true): cream `--background`
  fill, no border, small bold text, tight padding.
- **Badge — needs action**: `--main` fill, 2px black border, bold text.
  Example: an inventory room with zero beds shows **Keine Betten**. Orange
  stays reserved for "needs action."

**Implemented** for inventory room tags/badges; **outstanding** as a shared
component — each screen currently composes the utility classes itself.

## Page states

Every data screen defines four states explicitly, and never shows "0" or an
empty list for data that failed to load (a load failure that looks like real
empty data invites duplicate re-entry):

| State | Shows |
|---|---|
| Loading | Skeleton or nothing; never zeros |
| Load failed | One error block; no stats, lists, or forms for the data that failed |
| Empty | Only the first useful action |
| Loaded | Content first, then tools |

**Implemented:** the organiser shell now distinguishes a load failure
(`state.status === 'load_error'`, whole app, no nav/save-status) from a save
failure (`state.status === 'error'`, save-status shows "Speichern
fehlgeschlagen") — see [Frontend](../../docs/ui/frontend.md). Because the
organiser app loads one shared event log rather than per-screen data, a load
failure is necessarily whole-app; a screen-scoped notice for "this area's
data failed, the rest of the page still works" has no current trigger and is
not implemented.

## Stats strip

One flat card, equal cells divided by 2px lines (not separate tiles).
Numbers large and bold with `leading-none`, label bold below. Include every
level the screen manages. Never repeat a stat elsewhere on the same page.
Mobile: a 2-column grid, never a 2+1 wrap.

**Implemented** for `/organiser/accommodation/inventory`; **outstanding** as a shared
component.

## Segmented controls

Use instead of a `<select>` when there are four or fewer options and seeing
them helps (bed type, and any future case shaped like it — not room type or
floor, which stay `<select>`s):

- a bordered group (`role="group"`, `aria-label`) of `<button type="button">`
  with `aria-pressed`;
- selected: black fill, white text; unselected: white; dividers: 2px black
  border between segments;
- min height 44px; an option's icon uses `currentColor`, so it inverts when
  selected;
- mobile: equal-width stacked segments, icon above label, min height 56px.

**Implemented** as `SegmentedControl`
([`src/app/components/shared/ui/segmented-control.tsx`](../../src/app/components/shared/ui/segmented-control.tsx)),
used for the inventory bed-type choice; **outstanding** for any other
`<select>` that would qualify.

## Forms

- Label above the field, bold. Mark an optional field with "(optional)" in
  muted regular weight after the label — mark optional, not required, since
  most fields in this app are required.
- Placeholders are examples, not instructions, and start with "z. B."; never
  use a placeholder instead of a label.
- Money: a text input with `inputmode="decimal"`, accepting comma and dot,
  with the € unit inside the field border — not `type="number"` (comma
  handling for decimals differs between browsers). Counts use
  `type="number"` with `min`.
- Button order in a form footer: text button "Abbrechen", then the primary
  action, named after the result ("Zimmer anlegen", not "Speichern").
- Destructive actions never sit directly next to "Speichern"/the primary
  save action.

**Implemented** for the inventory forms; **outstanding** as a shared
convention enforced elsewhere (other organiser forms predate this pass).

## Component inventory

| Need | Component |
|---|---|
| hierarchy and status | `Card`, `Badge`, `Alert` |
| actions | `Button`, `AlertDialog` |
| data entry | `Label`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select` |
| search and selection | `Combobox`, `Popover`, `Command` |
| dense data | `Table`, `Tabs`, `ScrollArea` |
| navigation and mobile | `Sidebar`, `Sheet`, `Drawer`, `Breadcrumb` |
| feedback and loading | `Sonner`, `Skeleton`, `Tooltip` |
