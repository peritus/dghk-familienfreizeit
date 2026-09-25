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
