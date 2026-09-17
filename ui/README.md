# UI screen specifications

This directory is the design contract for the browser UI. Each file describes
one screen or a closely related screen state. Examples are intentionally in
English; the family-facing German copy follows [the translation
guidelines](../18-german-translation-guidelines.md).

The wireframes are ASCII plans, not pixel-perfect artwork. They establish
information hierarchy, actions, states, and responsive behavior before React
implementation begins.

Development also provides a non-production KDL event-log debug view. It is not
an organisation-team or family surface and is intentionally absent from the route catalog
below. It exposes the shared text fixture/source through a textarea, validates
the text, and renders the ordinary derived world and solver trace for
experimentation.

## Screen catalog

| ID | Screen | Route or entry point |
|---|---|---|
| UI-00 | [Design system and shell](00-design-system.md) | all screens |
| UI-01 | [Request login link](01-login.md) | `/login` |
| UI-02 | [Invalid or expired link](02-login-link-invalid.md) | `/login/invalid` |
| UI-03 | [Family preferences](03-family-preferences.md) | `/family` current information |
| UI-04 | [Family assignment](04-family-assignment.md) | `/family` communicated arrangements |
| UI-05 | [Organiser dashboard](05-organiser-dashboard.md) | `/organiser` |
| UI-06 | [Families and import](06-families.md) | `/organiser/families` |
| UI-07 | [Family detail](07-family-detail.md) | `/organiser/families/:id` |
| UI-08 | [Inventory](08-inventory.md) | `/organiser/inventory` |
| UI-10 | [Assignment board](10-assignment-board.md) | `/organiser/board` |
| UI-11 | [Release control](11-release-control.md) | `/organiser/releases` |
| UI-12 | [Workshops](12-workshops.md) | `/organiser/workshops` |
| UI-13 | [Organiser decisions](13-constraints.md) | `/organiser/constraints` |

The party-review screen is deferred with the sleeping modules. Its design sketch
is kept in [`deferred-ideas/party-review.md`](../deferred-ideas/party-review.md).

Two organiser routes in [organiser view](../09-organiser-view.md) §1 have no screen
spec yet: `/organiser/materials` and `/organiser/reports`. Their content is
specified by [materials](../20.8-materials.md) §11 and [reports](../19-reports.md);
they follow UI-00 until a spec is written.

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

Screen files use the component names from [Design system and shell](00-design-system.md).
The Alert Dialog names follow the [neobrutalism Alert Dialog
documentation](https://www.neobrutalism.dev/docs/alert-dialog).
