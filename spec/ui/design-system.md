# UI-00 — Design system and application shell

## Audience and purpose

The family view is for non-technical families on phones. The organiser tool is
for a small organisation team on laptops. Both applications share
visual primitives, but not navigation density.

Governing decisions: [D8](../../decisions.md#d8--react-for-every-screen),
[frontend](frontend.md), and [translation guidelines](german-translation-guidelines.md).

## Shared shell

The implemented frame, screen order, navigation levels and collection-action
ownership are documented in the [design system](../../docs/ui/design-system.md#screen-hierarchy).
Use that composition for every future screen, including family authentication,
family-facing results and the report host.

The outstanding family shell removes dense organiser navigation and uses a compact
header with help, account and sign-out access. These controls must remain usable at
360px; the family-facing host and its account menu are not implemented.

## Visual language

Use the [implemented theme and primitives](../../docs/ui/design-system.md).
For the outstanding screens, verify readable typography, at least 16px body text
on family screens, comfortable line height, and status information that never
relies on color alone. Group information into cards and reserve tables for dense
organiser data. Extend the component inventory below only deliberately.

## Local visual contract

New screens and reusable components extend the implemented
[Storybook contract](../../docs/ui/design-system.md): production renderables,
state fixtures, coverage entries and reviewed browser baselines. A story alone does
not establish an available application route.

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

The implemented destructive-action composition is documented in the
[design system](../../docs/ui/design-system.md). Verify this contract for
outstanding consequential controls.

## Pressable elements and hit areas

Use the implemented pressable utility, focus treatment and shared controls in the
[design system](../../docs/ui/design-system.md). Verify the standard radius and
44px hit areas for future family screens and domain-specific controls.

## Disabled state (outstanding)

The shared Button's disabled appearance is documented in the
[design system](../../docs/ui/design-system.md). For outstanding controls, avoid
unexplained disabled actions: omit an action that does not apply, or explain the
constraint. Verify contrast, keyboard semantics and an explicit reason when an
action must remain unavailable.

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

The implemented dashboard composition is documented in
[Frontend](../../docs/ui/frontend.md). Outstanding domain findings follow the
same screen-wide notice slot and retain the acceptance criteria in
[UI-05](screens/organiser-dashboard.md).

## Editable table and card pattern

For every current or future screen that creates or edits records in a table:

- use a semantic table on desktop and larger tablet layouts;
- use the shared collection-header creation action and accessible dialog;
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

Use the implemented [collection action contract](../../docs/ui/design-system.md#collection-actions-and-context)
on every current and future screen. The action belongs to its own collection's
heading, including nested collections and views below tertiary navigation. A
derived collection does not invent a create action. Future screens must verify
empty/populated states, result-oriented labels, cancellation, focus return and
ordinary event staging.

Reusable-rule promotion follows [AGENTS.md](../../AGENTS.md): name the candidate,
scope, canonical location and verification in the plan, and obtain explicit user
approval before promoting it.

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

`Tag`, `Badge` and `PropertyTags` are shared implemented components; see the
[design system](../../docs/ui/design-system.md#shared-presentation). Outstanding
screens must preserve quiet true-property tags and text-labelled action/status
badges, without relying on colour alone.

## Page states

Use the implemented `LoadingState`, `ErrorState`, `EmptyState` and `SuccessState`
within the [shared composition](../../docs/ui/design-system.md#shared-presentation).
Never render zero metrics or empty records for data that failed to load. Initial
organiser loading/error recovery remains whole-app because it loads one event log.

For future independently loaded hosts, define loading, failed, empty and loaded
states and scope recovery to the data that actually failed. Verify keyboard and
screen-reader behavior as well as the visual contract.

## Stats strip

`StatsStrip` is the implemented shared metrics component. Its placement and scope
are defined in the [design system](../../docs/ui/design-system.md#collection-actions-and-context).
Future screens must label the measured scope, avoid duplicated totals, omit
unavailable metrics, and verify narrow layouts for their actual cell counts.

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

The shared field primitives and current screen reuse are documented in the
[design system](../../docs/ui/design-system.md#shared-presentation). Currency entry,
future domain controls and exhaustive accessibility verification remain outstanding
where not covered by current controls and tests.

## Component inventory

The implemented generic inventory is authoritative in the
[design system](../../docs/ui/design-system.md#shared-presentation). New screens
reuse it before proposing another primitive. Search/selection patterns beyond the
current entity picker, family account menus, compact mobile sheets and additional
feedback controls remain future host requirements; choose their implementation
from actual needs and verify their accessible behavior.

## Shared presentation completion

The approved organiser presentation uses the [design references](../html-prototypes/workshops-redesign/mockups/index.html) through the existing canonical components. Shared component changes apply to every existing applicable consumer. Workshop-specific composition belongs to workshop pages. Other pages gain no new page-specific components. The public occasion landing retains its existing archetype.

Outstanding requirements:

- Extend the existing tokens, typography, spacing, navigation, headers, metrics, collection controls and rows. Primary navigation uses folder tabs, section navigation a soft-orange band, and route-backed views links. Full orange marks primary actions; warnings use dashed borders. Type sizes are 12, 14, 16, 18, 20, 24 and 30 pixels, with smaller print typography defined independently.
- Keep the draft-status control and its underlying reducer mechanics unchanged, including its popover, labels, provisional pattern, and transitions after saving or discarding. Its presentation is an explicit exception to the shared redesign.
- Extend the existing workflow stepper into a collapsible card, collapsed by default, with user/page-scoped preference, horizontal and vertical tracks, a terminal checkmark, and an always-expanded print representation. The module remains the lifecycle authority.
- Compose Workshops with inclusive audience counts, one shared unscheduled filter, actionable metrics, exception-only participation chips, structured occupancy and demand, consistent German plurals, profile-timezone times and open-ended age ranges.
- Show audience/age mismatches as advisory warnings: adults with minimum age below 16, children with maximum age above 17. Allow these records. Oversubscription uses all ranked choices and is informational. Existing readiness blockers remain blocking.
- Review advisory warnings inline only during each finalisation attempt; one organiser may acknowledge them for the team. Record the acknowledgement with the closing decision on the server. The complete plan remains in the main UI; confirmation does not repeat it. Voting remains open until finalisation, and reopening and repeated finalisation retain their current semantics.
- Verify five viewport widths, dark appearance, reduced motion, keyboard behavior, storage failures and multi-page browser printing. Keep every component's stories, coverage entry, usage guidance and Markdown documentation aligned. Print the actual selected view/filter context and current workflow, without controls or fixed fixture pagination.

Implemented requirements move to [design-system documentation](../../docs/ui/design-system.md) in the same change that verifies them.
