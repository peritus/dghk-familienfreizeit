# UI screen specifications

This directory is the design contract for the browser UI. Each file describes
one screen or a closely related screen state. Examples are intentionally in
English; the family-facing German copy follows [the translation
guidelines](german-translation-guidelines.md).

The wireframes are ASCII plans, not pixel-perfect artwork. They establish
information hierarchy, actions, and responsive behavior for the React application.

Development also provides a non-production KDL event-log debug view. It is not
an organisation-team or family surface and is intentionally absent from the route catalog
below. It exposes the shared text fixture/source through a textarea, validates
the text, and renders the ordinary derived world and solver trace for
experimentation.

## Screen catalog

| ID | Screen | Route or entry point |
|---|---|---|
| UI-00 | [Design system and shell](design-system.md) | all screens |
| UI-01 | [Request login link](screens/login.md) | `/login` |
| UI-02 | [Invalid or expired link](screens/login-link-invalid.md) | `/login/invalid` |
| UI-03 | [Family preferences](screens/family-preferences.md) | `/family` current information |
| UI-04 | [Family assignment](screens/family-assignment.md) | `/family` communicated arrangements |
| UI-05 | [Organiser dashboard](screens/organiser-dashboard.md) | `/organiser` |
| UI-06 | [Families](screens/families.md) | `/organiser/families` |
| UI-07 | [Family detail](screens/family-detail.md) | `/organiser/families/:id` |
| UI-08 | [Inventory](screens/inventory.md) | `/organiser/inventory` |
| UI-14 | [Workshop spaces](screens/workshop-spaces.md) | `/organiser/workshop-spaces` |
| UI-10 | [Assignment board](screens/assignment-board.md) | `/organiser/board` |
| UI-11 | [Release control](screens/release-control.md) | `/organiser/releases` |
| UI-12 | [Workshops](screens/workshops.md) | `/organiser/workshops` |
| UI-13 | [Organiser decisions](screens/constraints.md) | `/organiser/constraints` |

The party-review screen belongs to the separate sleeping modules. Its design sketch
is kept in [`spec/deferred-ideas/party-review.md`](../deferred-ideas/party-review.md).

The `/organiser/reports` route in [organiser view](../application/organiser-view.md) §1
has no dedicated screen spec yet. Its content is specified by [reports](../application/reports.md);
it follows UI-00 until a screen spec is written. Materials are accepted but deferred
and are not part of the active organiser screen inventory.

## Screen-spec format

Every screen spec records its audience, purpose, route, states, desktop
wireframe, mobile variant when relevant, interactions, accessibility behavior,
and the governing domain specification. A screen may derive its labels and
controls from occasion configuration, but its layout must not invent domain
rules.

Mobile variants are required for family screens and recommended for shared
authentication screens. Organiser screens are laptop-first; their narrow behavior
is documented only where a useful fallback exists.

## Component notation

Screen files use the component names from [Design system and shell](design-system.md).
The Alert Dialog names follow the [neobrutalism Alert Dialog
documentation](https://www.neobrutalism.dev/docs/alert-dialog).
