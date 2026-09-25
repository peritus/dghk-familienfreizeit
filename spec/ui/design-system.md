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
documentation](https://www.neobrutalism.dev/docs/alert-dialog): strong black
outlines, offset shadows, direct labels, and deliberate primary actions.

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

## Pressable elements and hit areas

**Implemented** as the `pressable`/`blueprint`/`blueprint-on-main` utilities and the
base-layer `cursor: pointer` rule in [globals.css](../../src/app/globals.css); see
[design system](../../docs/ui/design-system.md) for the rule ("a hard shadow means
pressable") and the `Button`/`Card` components that use it.

**Outstanding:** the `rounded-base` (5px, not the smaller default `rounded`) radius
rule is enforced in the organiser app bar and dashboard, but not yet swept across the
rest of the app (family/organiser tables, form inputs elsewhere still use `rounded` in
places) — a follow-up pass, not part of this change.

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

When an implementation introduces a potentially reusable pattern, follow the
general-rule promotion process in [AGENTS.md](../../AGENTS.md): name the
candidate in the plan, obtain explicit user approval, and update this section
in the same change when it is approved.

The description states the concrete consequence. `AlertDialogAction` is the
high-contrast offset-shadow primary action; `AlertDialogCancel` is the quieter
outlined alternative.

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
