# UI screen specifications

This directory is the design contract for the browser UI. Each file describes
one screen or a closely related screen state. Examples are intentionally in
English; the attendee-facing German copy follows [the translation
guidelines](../18-german-translation-guidelines.md).

The wireframes are ASCII plans, not pixel-perfect artwork. They establish
information hierarchy, actions, states, and responsive behavior before React
implementation begins.

## Screen catalog

| ID | Screen | Route or entry point |
|---|---|---|
| UI-00 | [Design system and shell](00-design-system.md) | all screens |
| UI-01 | [Request login link](01-login.md) | `/login` |
| UI-02 | [Invalid or expired link](02-login-link-invalid.md) | `/login/invalid` |
| UI-03 | [Attendee preferences](03-attendee-preferences.md) | `/family` before publication |
| UI-04 | [Attendee assignment](04-attendee-assignment.md) | `/family` after publication |
| UI-05 | [Admin dashboard](05-admin-dashboard.md) | `/admin` |
| UI-06 | [Families and import](06-families.md) | `/admin/families` |
| UI-07 | [Family detail](07-family-detail.md) | `/admin/families/:id` |
| UI-08 | [Inventory](08-inventory.md) | `/admin/inventory` |
| UI-09 | [Party review](09-party-review.md) | `/admin/parties` |
| UI-10 | [Assignment board](10-assignment-board.md) | `/admin/board` |
| UI-11 | [Plans and publishing](11-plans-and-publishing.md) | `/admin/plans` |
| UI-12 | [Workshops](12-workshops.md) | `/admin/workshops` |
| UI-13 | [Constraints and health](13-constraints-and-health.md) | `/admin/constraints` |

## Screen-spec format

Every screen spec records its audience, purpose, route, states, desktop
wireframe, mobile variant when relevant, interactions, accessibility behavior,
and the governing domain specification. A screen may derive its labels and
controls from occasion configuration, but its layout must not invent domain
rules.

Mobile variants are required for attendee screens and recommended for shared
authentication screens. Admin screens are laptop-first; their narrow behavior
is documented only where a useful fallback exists.
