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
| UI-12 | [Workshops](screens/workshops.md) | `/organiser/workshops` |

The party-review screen belongs to the separate sleeping modules. Its design sketch
is kept in [`spec/deferred-ideas/party-review.md`](../deferred-ideas/party-review.md).

UI-13 organiser placement decisions are accepted but deferred in
[`organiser-placement-overrides`](../deferred-ideas/organiser-placement-overrides.md).

Release control, communication review, and communication history UI are deferred
in [`release-control-ui`](../deferred-ideas/release-control-ui.md). The release
control domain contract remains authoritative for its later milestone.

The assignment board's browser-printable output is the compact current-state
assignment view. The generic report host and broader catalogue remain later scope.

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
