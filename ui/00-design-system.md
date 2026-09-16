# UI-00 — Design system and application shell

## Audience and purpose

The attendee portal is for non-technical families on phones. The admin tool is
for a small group of competent organisers on laptops. Both applications share
visual primitives, but not navigation density.

Governing decisions: [D8](../17-decisions.md#d8-react-for-every-screen),
[frontend](../12-frontend.md), and [translation guidelines](../18-german-translation-guidelines.md).

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

The attendee shell removes the admin navigation and uses a compact header:

```text
┌──────────────────────────────┐
│ Familienfreizeit       [•••] │
├──────────────────────────────┤
│ page title                   │
│ content                      │
└──────────────────────────────┘
```

## Visual language

- warm paper background, white or cream cards, black text, and one saturated
  accent color;
- thick black borders, offset shadows, slightly squared corners, and pressed
  button feedback;
- typography must remain readable before decoration: body text is at least
  16px on attendee screens and uses comfortable line height;
- status colors never stand alone: pair them with text, a glyph, or a border;
- cards group information, while tables are reserved for dense admin data;
- use the existing neobrutalism component vocabulary from
  [frontend §4](../12-frontend.md#4-components).

## Responsive rules

The attendee layout is designed at 360px first. Content becomes one column,
controls stack, dialogs become full-height sheets, and no table requires
horizontal scrolling. The admin layout targets laptop widths; below 900px the
board may become a list view and the side rail may move above the rooms.

## Shared states and accessibility

- show a visible focus ring and preserve keyboard order;
- every icon-only action has an accessible name;
- every destructive or consequential action has text confirmation;
- loading preserves the page skeleton and announces completion;
- errors identify the affected field or action and provide recovery;
- empty states explain what the user can do next;
- respect reduced-motion preferences;
- dialogs trap focus and return focus to their triggering control.
