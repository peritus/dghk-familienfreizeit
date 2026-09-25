# UI-05 — Organiser dashboard

## Audience, purpose, and route

Organisers open this screen to answer "what needs attention today?" Route:
`/organiser`. Governing spec: [organiser view](../../application/organiser-view.md) §2.

```text
┌ App bar (white, border-b) ──────────────────────────────────────────────┐
│ Familienfreizeit        [Dashboard] Familien              [✓ Gespeichert ▾] │
│ Organisationsteam                                                           │
└───────────────────────────────────────────────────────────────────────────┘
  H1  Was braucht heute Aufmerksamkeit?

  Hinweise  (list, or the positive "Alles im Griff" empty state)

  H2  Überblick
  ┌ Familien (link, pressable) ┐  ┌ Personen (flat) ┐
  │ 2                          │  │ 2               │
  │ Familien                   │  │ Personen        │
  │ Alle Familien ansehen      │  │ angemeldet      │
  └─────────────────────────────┘  └─────────────────┘
```

The content column and the app bar's inner content share one width and one
left edge — no independent alignment per region.

## App bar

One app bar for every `/organiser*` route: brand plus role label
("Organisationsteam"), navigation (`Dashboard`, `Familien`; the active item
is a black fill with white text and `aria-current="page"`; inactive items
show a border on hover; navigation links carry no shadow, per
[UI-00](../design-system.md#pressable-elements-and-hit-areas)), and the
save-status control right-aligned. On mobile the brand and the status
control share the first row, and navigation wraps to a full-width second
row. There is exactly one `<header>` landmark and one `<main>` landmark for
the organiser section — do not nest a page-local header or a second `<main>`
inside it.

## Headline and Hinweise

The page states its own question as the single `<h1>`: **Was braucht heute
Aufmerksamkeit?** Hinweise answers it directly, so it sits immediately below
the headline, before any overview numbers.

**With hints:** a heading naming the count, then a single card containing
one row per hint. Each row names the affected family, states what is
missing or open as a full sentence, and links to where it can be resolved
(a deep link into the family detail screen, not just the family list).

**Empty:** a positive, short empty state — a heading such as **Alles im
Griff** plus one calm line of explanation. Never repeat the same empty-state
message in more than one place on the page.

## Überblick

An overview section below Hinweise, with one card per top-level count.
Card structure is consistent: the number first (large, tight leading), then
a label, then a one-line description. A card that leads to another screen
is the whole card as a link and is pressable (shadow on hover per
[UI-00](../design-system.md#pressable-elements-and-hit-areas)); a
count-only card with nowhere to go is flat — border only, no shadow.

This screen does not surface event-log internals (a raw sequence number, a
"last derived" timestamp) as a card of its own. If a family count needs a
qualifier, describe it in organiser-facing terms ("angemeldet"), not in
storage terms.

Release-control and reminder-chasing summaries (outstanding scopes, families
that haven't responded) are out of scope for this screen spec; they belong
to [UI-11](release-control.md) under **M10 — Family access and release
control** and will get their own dashboard entry point once that milestone
is built, rather than being designed here ahead of the underlying feature.

## Interaction and accessibility

Hinweise rows and Überblick link-cards are keyboard-reachable in document
order; a card that is a link exposes its full text as the link's accessible
name, not just a trailing caption. The save-status control's states,
popover, and confirmations are specified in
[UI-00](../design-system.md#save-status-control-and-provisional-state-pattern), not
repeated here.

## Neobrutalist redesign and components

Use `Card`/`CardHeader`/`CardContent` for the Hinweise and Überblick cards,
with the pressable variant only on the Familien link-card. Use the shared
save-status control (app bar) rather than a page-local drafts panel.
