# Organiser area – visual design guide

### Worked example: the Workshops page (`/organiser/workshops`)

**Status:** agreed design, ready to implement · **As of:** 8 October 2026
**Applies to:** the **whole organiser area** (all pages under `/organiser/…`, the app shell and the shared components). The Workshops page is **only the example** the rules were developed and demonstrated on.
**Deliverables:** every change in this guide lands in **three places**: the **component/page code**, the **Storybook stories**, and the **design-system Markdown docs** (see §0.2). A change that only exists in code is not done.
**Companion documents:** `workshops-redesign.md` (the Workshops page as an implementation brief) · `../mockups/index.html` (standalone HTML mockups: *Vorher*, *Nachher* and *Stepper*, each responsive, at 1280/1024/768/640/390 px and as A4 print). Checklist items are numbered 1–30.

---

## 0. How to read this guide

This guide describes **how organiser pages should look and behave in general**. To make the rules concrete, they were worked through on the Workshops page. All examples, texts, numbers and screenshots therefore come from the Workshops page, **but most of the rules apply to every page.**

Every section and every checklist item carries **one of three labels**:

| Label | Meaning | Where it's implemented | Other pages … |
|---|---|---|---|
| **`GLOBAL`** | Foundations and app shell: tokens, colours, type, spacing, header, navigation, save button, helpers, accessibility, breakpoint and print rules | **Once**: `src/app/globals.css`, app layout / `application-frame`, shared helpers | get it **automatically** |
| **`COMPONENT`** | Reusable building block whose **structure and rules are general**, but whose **content each page supplies** (stepper, key figures, list header, list rows, inline notes) | **Once** as a shared component (props / slots); each page passes its data | **use the component** with their own content |
| **`WORKSHOPS`** | Content, data, texts, decisions and bugs that **only** concern the Workshops page | only in the Workshops page code / data | **don't copy it**, only follow the pattern |

Rule of thumb when implementing:
- When a section says **"Rule"**, it applies everywhere.
- When a section says **"Example: Workshops"**, it's a filled-in instance. Other pages fill in the same slots **with their own content**.
- When in doubt: anything that names *Workshops, Wahl, Zuordnung, Wünsche, Zielgruppe, Leitung, Slot, Plätze, Kinder/Erwachsene* is **`WORKSHOPS`**.

### 0.1 Map: what lives where (code)

| Layer | Contents | Label | Existing hook in the code |
|---|---|---|---|
| Design tokens | colours incl. `--main-soft`, `--warning-bg`, shadows, type scale | `GLOBAL` | `globals.css` `:root` / `@theme` |
| Utilities | `.pressable`, `.liftable`, focus rings, reduced motion | `GLOBAL` | `globals.css` |
| App shell | header, app title, primary tabs, section band, save button, Abmelden | `GLOBAL` | `[data-slot='application-frame']` |
| Page header | H1 + description, no eyebrow | `COMPONENT` | `[data-slot='screen-header']` |
| Phase card / stepper | workflow with stages, collapsible, notes gate | `COMPONENT` | `[data-slot='workflow-stepper']` |
| Key figures | number tiles, warning tile as filter | `COMPONENT` | – (new) |
| List header + toolbar | view tabs with counts, create action, segmented filter, quick filter, count | `COMPONENT` | `[data-slot='collection-controls']`, `[data-slot='collection-actions']` |
| List rows | title, meta row, exception chips, metric column, inline notes, row action | `COMPONENT` | `[data-slot='collection-row']`, `[data-slot='row-actions']` |
| Helpers | plurals, unresolved references, open-ended ranges | `GLOBAL` | shared utils |
| Print | A4 rules, print identity, footer | `GLOBAL` (rules) + `COMPONENT` (per component) | `@media print`, `[data-slot='print-identity']`, `[data-slot='print-footer']` |
| Workshops content | sections, stages + copy, key figures, filters, card fields, validation, data bugs | `WORKSHOPS` | Workshops page / data |

### 0.2 Definition of done: code + Storybook + design-system docs

This guide is **not only an implementation brief**. Every rule changes three things, and they have to stay in sync:

1. **Code**: `globals.css`, the app shell, the shared components, and the pages.
2. **Storybook**: the stories for every touched component (and the foundations stories, if there are any for tokens/typography/colour).
3. **Design-system Markdown docs**: the pages that document tokens, rules and components.

Locate the existing Storybook files (e.g. `*.stories.tsx`) and the design-system docs in the repo before starting. If a component has no story or docs page yet, **create one**. Don't leave it undocumented.

| Label | Code | Storybook | Design-system docs |
|---|---|---|---|
| **`GLOBAL`** | `globals.css`, app shell, helpers | **Foundations stories**: colour tiers (full / soft / dashed / danger / offline), type scale 12–30 with roles, weight budget, shadows `sm`/`md`/default, `.pressable` and `.liftable`; **app-shell stories**: header with/without section band, active tab per area, save button in all 5 states + open menu, narrow viewport | **Foundations pages**: tokens incl. `--main-soft`, `--warning-bg`, shadows; colour meaning ("orange = do this" …); type scale table; weight budget; spacing rhythm; three shapes (tab / chip / button); accessibility rules; breakpoint table; print rules. Remove anything the guide replaces (e.g. old nav styles, 36px stat numbers, off-scale sizes) |
| **`COMPONENT`** | shared component with props/slots | **One story per state**, with generic, neutral demo content plus the Workshops instance as an extra story. Minimum: page header; phase card in every stage × collapsed/expanded, notes gate (open → review → acknowledged → none), end state; key figures incl. warning tile pressed/unpressed; list header + toolbar incl. filtered count; list row with/without exception chip, missing-info warning chip, metric column (under/at/over capacity, zero), inline notes, long texts. **Viewport stories** at 390 / 640 / 768 / 1024 / 1280 and a **print** story (print media emulation) where the component changes | **One page per component**: purpose, anatomy, props, the **Rules** from this guide (verbatim or linked), do / don't, states, responsive behaviour, print behaviour, accessibility, a "Used on" list of pages. Use the Workshops instance as the example, **labelled as an example** |
| **`WORKSHOPS`** | Workshops page code + data | the page story/stories (if the repo has page-level stories) with the Workshops content; otherwise the Workshops variants of the component stories above | **No rule changes.** At most an "Example: Workshops" section on the component pages. Workshops-specific decisions (stages, copy, checks, validation) go into the page/feature docs, if they exist, **not** into the design-system rules |

Rules for keeping the three in sync:
- **Same PR:** a component change includes its story and docs update in the same PR.
- **Docs follow the labels:** `GLOBAL`/`COMPONENT` rules go into the design-system docs as generic rules. `WORKSHOPS` content may appear there only as a labelled example.
- **Stories use neutral content by default.** Workshops content appears in additional stories named e.g. `…/Example: Workshops`, so nobody mistakes it for the generic case.
- **Remove what's obsolete.** Old stories and docs that show the replaced patterns (boxed secondary nav, orange hover, default chips, 36px stat numbers, full-width segmented control, checkbox gate) are deleted or rewritten, not left next to the new ones.

---

## Contents

**Part I – Foundations (`GLOBAL`)**
1. [Design principles](#1-design-principles-global)
2. [Tokens and CSS](#2-tokens-and-css-global)
3. [Accessibility](#3-accessibility-global)
4. [Breakpoints](#4-breakpoints-global)
5. [Print](#5-print-global)

**Part II – App shell (`GLOBAL`)**

6. [Header and navigation](#6-header-and-navigation-global)
7. [Save button and draft mode](#7-save-button-and-draft-mode-global)

**Part III – Page components (`COMPONENT`, each with a Workshops example)**

8. [Page header](#8-page-header-component)
9. [Phase card and stepper](#9-phase-card-and-stepper-component)
10. [Key figures](#10-key-figures-component)
11. [List header and toolbar](#11-list-header-and-toolbar-component)
12. [List rows](#12-list-rows-component)
13. [Helpers for text and data](#13-helpers-for-text-and-data-global)

**Part IV – The Workshops page (`WORKSHOPS`)**

14. [Everything Workshops-specific in one place](#14-everything-workshops-specific-in-one-place-workshops)

**Part V – Rollout**

15. [Applying it to other pages](#15-applying-it-to-other-pages)
16. [Problem analysis (before), with labels](#16-problem-analysis-before-with-labels)
17. [Implementation order](#17-implementation-order)
18. [Checklist (all 30 items, labelled)](#18-checklist-all-30-items-labelled)
19. [Open questions](#19-open-questions)
20. [Decision log](#20-decision-log)

---

# Part I – Foundations `GLOBAL`

Everything in Part I applies to **every page**. It's implemented once in `globals.css` and the shared utilities.

## 1. Design principles `GLOBAL`

### 1.1 Hierarchy through shape, not just size

| Level | Element | Shape | Size/weight | Behaviour |
|---|---|---|---|---|
| 1 | Primary navigation (app areas) | **Tab** on the bottom edge of the header, open at the bottom | 16 / 700 | Hover: faint tab outline + light fill (preview of the active tab) |
| 2 | Section navigation (sub-pages of an area) | **Chip** in the soft-orange band | 14 / 500, active 700 | Hover: *lift* (moves up-left, gets a 2px hard shadow). Active: white, border, resting on a 3px shadow |
| 3 | View switch inside a page (e.g. above a list) | Underline tab | 14, 2px underline | Hover: underline at 35% black |
| – | Actions | **Button** with border + 4px shadow | 14 / 700 | Hover: pushes into the shadow |

Rule: **each object has one shape and one size**, so nothing can be mistaken for something else. Navigation never looks like a button, and a button never looks like navigation.

### 1.2 Colour in three tiers

| Tier | Token | Meaning | Allowed for |
|---|---|---|---|
| Full orange | `--main` = `hsl(28 100% 51%)` | **Do this** | primary actions only (one per area of the page, ideally) |
| Soft orange | `--main-soft` ≈ `hsl(28 100% 80%)` | **Where you are** | active primary tab, section band, logo tile, active choice inside menus, draft mode |
| Dashed black | `border-dashed border-border` (+ optional `--warning-bg`) | **Warning / not yet saved / needs attention** | warning chips, inline notes, notes review, draft mode, key-figure tiles that point to problems |
| Red | `--danger` (existing) | Error | save errors, failed actions |
| Grey | `--offline` (existing) | Disabled | disabled buttons (existing `disabled:` style: `bg-offline`, dashed, no shadow) |

**Never** use `bg-main` for hover, warnings, status or decoration.

> Example: Workshops. Full orange: "Wahl öffnen", "Workshop hinzufügen", "Ergebnis festlegen". Dashed: "Noch nicht eingeplant", "Zielgruppe passt nicht zum Alter …".

### 1.3 Neobrutalist language (based on neobrutalism.dev)

Adopted from the neobrutalism.dev components (Button, Menubar, Navigation Menu, Tabs):

- 2px borders (`border-2 border-border`), `rounded-base` (5px).
- Hard offset shadows instead of blurred ones: buttons `4px 4px 0 0`, raised chips `3px`, hover lift `2px`.
- **Press** (button "default" variant): on hover, the element moves *into* its shadow (`translate(2px,2px)`, shadow 2px; active `translate(4px,4px)`, no shadow).
- **Lift** (button "reverse" variant): on hover, the element moves *out of* its position (`translate(-2px,-2px)`) and gets a shadow. Used for nav chips.
- Menubar idiom: items with a transparent 2px border that becomes solid on hover/active, so nothing jumps.
- **Deviation from neobrutalism.dev:** their components use `bg-main` (orange) for hover/open. Here, soft orange/white/black is used instead, so that full orange stays reserved for actions.

### 1.4 Type scale

Only these sizes: **12 / 14 / 16 / 18 / 20 / 24 / 30 px**.

| Role | Size / weight |
|---|---|
| H1 page title | 30 / 700, `tracking-[-0.01em]` |
| Key-figure number | 24 / 700, `tabular-nums` |
| Metric value in a list row | 20 / 700, `tabular-nums` |
| App title, list-row title, phase-card heading | 18 / 700 |
| Primary nav tabs | 16 / 700 |
| Body text | 16 / 400 |
| Buttons, section chips, view tabs, meta row, key-figure labels, stepper labels | 14 (buttons / active chips 700, otherwise 400–500) |
| Chips, captions, sub-lines, footer | 12 (chips 700, otherwise 400) |

Mapping for the off-scale values currently in `globals.css` (`11px`, `13px`, `15px`, `0.8125rem`): 11 → 12, 13 / 0.8125rem → 14 (legends may use 12), 15 → 14 or 16. *(The current off-scale values sit mostly in the participation styles, e.g. `.workshop-participation__legend`, but the scale is global.)*

### 1.5 Weight budget

700 only for: headings, active states, buttons, key numbers, chips. Everything else uses 500 (`--font-weight-base` is already 500) or 400 for running text.

Typical consequences on every page: non-current stepper labels 500, key-figure labels 400 muted, field labels like "Leitung" 400 muted, inactive segments 500, meta rows 400.

### 1.6 Spacing rhythm

Instead of a blanket `space-y-8`, every page groups its content:

1. Page header (H1 + description)
2. Status block (phase card and/or key figures, if the page has them)
3. Main content (e.g. list: view tabs + create action, toolbar, list)

**32px between groups, 12–20px inside a group.** Below 40rem: 24px between groups.

---

## 2. Tokens and CSS `GLOBAL`

### 2.1 Existing tokens (`globals.css`, `:root`)

```css
--background: hsl(33 100% 92%);   /* cream */
--secondary-background: white;
--paper: #fffaf0;
--main: hsl(28 100% 51%);         /* orange */
--main-foreground: black;
--danger: hsl(2 90% 66%);
--offline: hsl(30 8% 80%);
--muted: hsl(30 10% 32%);
--rule: hsl(33 25% 82%);
--foreground: black;
--border: black;
--shadow: 4px 4px 0 0 var(--shadow-c);
--radius-base: 5px;
--font-weight-base: 500;
--font-weight-heading: 700;
```

### 2.2 New tokens

```css
:root {
  /* "Where you are": active tab, section band, logo tile */
  --main-soft: color-mix(in srgb, var(--main) 45%, white);  /* ≈ hsl(28 100% 80%) */

  /* optional: background for larger warning areas (notes review, inline notes) */
  --warning-bg: hsl(33 100% 96%);

  /* hard shadows in three strengths */
  --shadow-sm: 2px 2px 0 0 var(--shadow-c);
  --shadow-md: 3px 3px 0 0 var(--shadow-c);
}

@theme inline {
  --color-main-soft: var(--main-soft);
  --color-warning-bg: var(--warning-bg);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
}
```

- Because `--main-soft` is derived from `--main`, it follows dark mode (where `--main` is `#fe9d4a`) and print (where `--main` is white) automatically. **Dark mode was not designed in this round.** Check `--main-soft` and `--warning-bg` there separately.
- Contrast: black on `--main-soft` is fine. Muted on cream is about **6.8:1**. Keep 12px text out of muted-on-orange.

### 2.3 Shared utilities

```css
/* button: pushes into its shadow */
.pressable {
  box-shadow: var(--shadow);
  transition: transform .1s, box-shadow .1s;
}
.pressable:hover  { transform: translate(2px, 2px); box-shadow: var(--shadow-sm); }
.pressable:active { transform: translate(4px, 4px); box-shadow: none; }

/* nav chip: lifts out of its place */
.liftable { transition: transform .1s, box-shadow .1s; }
.liftable:not([aria-current]):hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border);
  background: var(--secondary-background);
}

@media (prefers-reduced-motion: reduce) {
  .pressable, .liftable { transition: none; }
  .pressable:hover, .pressable:active, .liftable:hover { transform: none; }
}
```

---

## 3. Accessibility `GLOBAL`

Applies to all pages and components.

- **Navigation:** `aria-current="page"` on the active primary tab, the active section chip and the active view tab. Real links (`<a href>`), not buttons.
- **Toggles / disclosure:** `aria-expanded` + `aria-controls`.
- **Filters:** grouped filters as `role="group"` with `aria-label`, toggle buttons with `aria-pressed`. Result counts `aria-live="polite"`.
- **Menus:** `aria-haspopup="menu"`, `aria-expanded`. Choice items as `menuitemradio` + `aria-checked`.
- **The visible text is the accessible name.** No `aria-label` that differs from it. Icon-only buttons get an `aria-label` or `sr-only` text.
- **Focus ring:** `outline-2 outline-offset-2 outline-border` on all interactive elements. Inside `overflow-x-auto` containers (nav rows) use `outline-offset: -2px`, so the ring isn't clipped.
- **Touch targets:** at least 40px high (tabs 48, chips 40, buttons 40–44).
- **Contrast:** muted on cream ≈ 6.8:1. Black on soft orange OK. No 12px muted text on orange.
- **Motion:** respect `prefers-reduced-motion` (no translate on press/lift).
- Repeated row actions ("Bearbeiten") carry the row name as `sr-only` text. Visual metrics (bars) carry an `aria-label` with the value.

---

## 4. Breakpoints `GLOBAL`

The breakpoints are the ones `globals.css` already uses: **< 40rem · `sm:` 40rem · `md:` 48rem · `lg:` 64rem · `xl:` 80rem**. The mockups (`../mockups/`) show them at **390 · 640 · 768 · 1024 · 1280 px**. (The mockups simulate them with container queries; in the app they are the normal Tailwind prefixes.)

### 4.1 General rules (all pages)

| Area | < 40rem | ≥ 40rem | ≥ 48rem | ≥ 64rem / ≥ 80rem |
|---|---|---|---|---|
| Page padding | `px-4 pt-6 pb-10`, group gap 24px | `px-4 pt-8 pb-12`, gap 32px | same | content `max-w-5xl` (64rem) centred |
| Header row 1 | title on top, save/logout wrap below | one row | one row | one row |
| Primary tabs | scroll horizontally | fit | fit | fit |
| Section band | scrolls horizontally | scrolls if needed | fits | fits |
| Key figures | 2 columns | 2 columns | 4 columns | 4 columns |
| View tabs + create action | action wraps below the tabs | same row | same row | same row |
| Segmented filter | **full width**, equal buttons | `inline-flex` | same | same |
| Result count | own line | right-aligned | same | same |
| List rows | `p-4`; text → metric → action stacked | `p-5`; text + metric side by side, action wraps below on the right | text, metric and action in one row | same |

- Nav rows: `overflow-x-auto whitespace-nowrap`, items `flex-none`. No wrapping, because that would break the tab metaphor.
- **Keep the active item visible:** in horizontally scrolling nav rows (primary tabs, section band, view tabs), scroll the active item (`aria-current="page"`) into view on load, e.g. `el.scrollIntoView({ block: "nearest", inline: "center" })`. Otherwise the active tab can sit off-screen on a phone, e.g. "Workshops" at 390px.
- Key figures as a **grid** (`grid-cols-2 md:grid-cols-4`), **not** flex-wrap, which breaks 3+1 at 640px.

### 4.2 Stepper on narrow screens (`COMPONENT`, see §9)

| | < 40rem | ≥ 40rem |
|---|---|---|
| Collapsed | lines 12px instead of 28px; current label **on two lines** (label 14/700, sub-line 12px below it, both `truncate`); toggle **chevron only** (text `sr-only`), same row | one row, toggle with text |
| Expanded | **vertical**: circles stacked, connector lines vertical (same solid/dashed logic), text next to the circle; actions full width below | horizontal, one column per stage |
| Notes review | link per note wraps below the note text | link on the right |

---

## 5. Print `GLOBAL`

Based on the existing `@media print` rules in `globals.css`: `@page { size: A4 portrait; margin: 12mm 12mm 22mm }`, page number "n / m" at the bottom right (8pt), 10pt body, H1 22pt, `--main → white`, no shadows, `[data-slot='button']` hidden. The mockups include A4 versions of the example page (`nachher-druck-a4.html`) and the stepper (`stepper-druck-a4.html`).

### 5.1 General print rules (all pages)

- **Hidden:** primary tabs, section band, save button, Abmelden, all buttons, disclosure toggles, view tabs, toolbars/filters, row actions, pure link texts ("Zum …").
- **Print identity** at the top (existing `[data-slot='print-identity']`): logo + app title + "Organisationsteam", 9pt, 1px line below.
- **H1** 22pt + description + **filter context line** (9pt) that states what the printout shows: active view, active filters, number of entries.
- **Soft orange** disappears automatically (`--main` → white). Dashed warnings stay (they print well).
- **Black backgrounds that carry meaning** (e.g. bars, the current-step circle) need `print-color-adjust: exact`, otherwise browsers drop them.
- **Footer** (existing `[data-slot='print-footer']`): working-view note, status/data version, confidentiality, 8pt, page number on the right.
- Frames 1px instead of 2px. Rows `break-inside: avoid`. Continuation pages start with "[List title] · Fortsetzung".

### 5.2 Components in print

- **Phase card / stepper:** always **expanded** (regardless of the screen state), 1px frame, circles 22px, lines 1.5px (solid/dashed as on screen), panel text **without buttons**. An open notes review is printed as a list too. `break-inside: avoid`.
- **Key figures:** one row, 1px frame, number 16pt, label 9pt. Warning tiles with a dashed separator.
- **List rows:** 2-column grid (text | metric 128px), 1px grey dividers.

> Example: Workshops. Filter line "Ansicht: Workshops · Zielgruppe: Alle · 33 Workshops". The mockup paginates as page 1 = header + 7 workshops, then 12 per page → 4 pages for 33 workshops.

---

# Part II – App shell `GLOBAL`

## 6. Header and navigation `GLOBAL`

The header and both navigation levels are part of the **app shell** and look the same on every organiser page. Only the *entries* come from the route structure.

### 6.1 Structure

```
┌──────────────────────────────────────────────────────────────────────┐ header: bg white
│ [▣] {App title}                                  [✓ Gespeichert ▾] [Abmelden] │
│     {Organisation} · Organisationsteam                                │
│                                                                      │
│  {Area}   {Area}   {Area}   ┌──────────┐                             │
│                             │{Active}  │ ← tab, bg-main-soft          │
└─────────────────────────────┘          └─────────────────────────────┘ 2px border-b
│ [{Section 1}]  {Section 2}  {Section 3}  …                           │ band: bg-main-soft (only if the area has sections)
└──────────────────────────────────────────────────────────────────────┘ 2px border-b
```

> Example: Workshops. Areas "Dashboard · Familien · Unterbringung · **Workshops**". Sections "**Übersicht** · Teilnahme · Wünsche · Räume und Slots · Listen".

### 6.2 App title (item 8)

- Name of the event: 18/700. Below it: organisation + "Organisationsteam", 14/400 muted. This replaces a separate "Organisationsteam" line.
- Logo on a **`bg-main-soft` tile** (36×36, `border-2 border-border rounded-base`, `shadow-sm`).

> Example. "**Familienfreizeit Lübben 2027**" / "DGHK Berlin-Brandenburg · Organisationsteam". Before: the whole name "DGHK Berlin-Brandenburg Familienfreizeit Lübben 2027" at 20px bold.

### 6.3 Primary nav as tabs (item 1)

- All items **get the same box**: `h-12 px-4 border-2 border-b-0 rounded-t-[6px] font-bold text-base`.
  - Inactive: `border-transparent`.
  - Active: `border-border bg-main-soft` + `aria-current="page"`.
- The nav gets `-mb-0.5` (−2px), so the active tab **covers** the header's 2px bottom border and opens downward.
- The nav gets `-ml-[18px]`, so the **first label lines up** with the logo and the H1.
- Same box for all items = labels on one baseline.
- Hover (inactive only): `hover:border-border/30 hover:bg-paper`.
- Narrow screens: `overflow-x-auto whitespace-nowrap`, items `flex-none`. **Scroll the active tab into view** on load (§4.1).

```tsx
<nav aria-label="Hauptnavigation"
     className="-mb-0.5 -ml-[18px] flex items-end gap-0.5 overflow-x-auto whitespace-nowrap">
  {areas.map((item) => (
    <a key={item.href} href={item.href}
       aria-current={item.active ? "page" : undefined}
       className={cn(
         "inline-flex h-12 flex-none items-center rounded-t-[6px] border-2 border-b-0 px-4 text-base font-bold",
         item.active
           ? "border-border bg-main-soft"
           : "border-transparent hover:border-border/30 hover:bg-paper",
       )}>
      {item.label}
    </a>
  ))}
</nav>
```

### 6.4 Section band (item 2)

- Shown **only if the active area has sections**. Otherwise the active tab is still drawn, but the header ends at the 2px line.
- Full width: `bg-main-soft border-b-2 border-border`. Inside, the same `max-w-5xl` container: `nav aria-label="{Area}bereiche"`, `flex gap-2 py-2.5 overflow-x-auto whitespace-nowrap`, left padding so the first chip label lines up at 16px.
- Items: `min-h-10 px-3 text-sm border-2 border-transparent rounded-base` + `liftable`.
- Active: `bg-secondary-background border-border shadow-md font-bold` + `aria-current="page"`.
- The **first section of an area is called "Übersicht"**, not the area name again (see §8).
- The band **replaces** any boxed button row of sub-pages above the page title.

```tsx
{sections.length > 0 && (
  <div className="border-b-2 border-border bg-main-soft">
    <nav aria-label={`${area.label}bereiche`}
         className="mx-auto flex max-w-5xl gap-2 overflow-x-auto whitespace-nowrap py-2.5 pr-4 pl-0.5">
      {sections.map((s) => (
        <a key={s.href} href={s.href}
           aria-current={s.active ? "page" : undefined}
           className={cn(
             "inline-flex min-h-10 flex-none items-center rounded-base border-2 px-3 text-sm",
             s.active
               ? "border-border bg-secondary-background font-bold shadow-md"
               : "liftable border-transparent",
           )}>
          {s.label}
        </a>
      ))}
    </nav>
  </div>
)}
```

### 6.5 Hover rules (item 3)

| Element | Hover |
|---|---|
| Primary tab (inactive) | `border-border/30` + `bg-paper` |
| Section chip (inactive) | lift: `-translate-x-0.5 -translate-y-0.5`, `border-border`, `bg-secondary-background`, `shadow-sm` |
| View tab (inactive) | underline at 35% black, text black |
| Button | press (into the shadow) |

Never `bg-main` on hover.

### 6.6 Three shapes (item 11)

- **Tab** (16/700, open at the bottom, no shadow) = "where am I in the app".
- **Chip** (14, lift on hover, active resting on a 3px shadow) = "which section of this area".
- **Button** (14/700, 4px shadow, press) = "do something".

---

## 7. Save button and draft mode `GLOBAL`

"Gespeichert" is part of the app shell and **is not a pure status**: its menu switches **draft mode** on ("don't save the content to the server immediately"). It's a real menu button on every page (item 24).

### 7.1 States

| State | Look | Content | Next to it |
|---|---|---|---|
| **Automatic, saved** (normal) | white, `border-2`, `pressable` | ✓ "Gespeichert" ▾ | "Abmelden" |
| **Automatic, saving** | same button | spinner "Speichert …", `aria-live="polite"` | "Abmelden" |
| **Draft mode, changes open** | `bg-main-soft`, **dashed** `border-2`, no shadow | ✎ "Entwurf · {n} Änderungen" ▾ | **"Speichern"** (orange, pressable) + "Abmelden" |
| **Error** | `bg-danger`, black text, `border-2` | ⚠ "Nicht gespeichert" ▾ | **"Erneut versuchen"** (orange) + "Abmelden" |
| **Menu open** | button pressed in (`translate(2px,2px)`, shadow 2px), black/white, chevron up | | |

Dashed = "not on the server yet" (warning tier, §1.2).

### 7.2 Menu

- `role="menu"`, white, `border-2`, shadow 4px, `p-1`, ~360px wide, right-aligned under the button.
- Two **radio items** (`menuitemradio`, `aria-checked`), each with a one-line explanation:
  - **Automatisch speichern**: "Jede Änderung geht sofort an den Server." (active item `bg-main-soft`)
  - **Entwurfsmodus**: "Änderungen sammeln und erst mit „Speichern“ übertragen."
- Separator (`--rule`), then muted 12px: "Zuletzt gespeichert: {Zeit}".

### 7.3 Abmelden

**Stays a normal button** (white, `border-2`, pressable, 14/700). A version as a text link was rejected: a logout shouldn't look like a link.

---

# Part III – Page components `COMPONENT`

Each component here is built **once** and used on every page that needs it. **Rules** are binding everywhere. **Example: Workshops** shows the filled-in instance. Other pages supply their own content in the same slots.

## 8. Page header `COMPONENT`

`[data-slot='screen-header']`

### Rule
- **H1 = name of the area or page** (30/700). No eyebrow above it.
- Description below: 16/400 muted, one sentence.
- **Don't repeat the same word on every level.** The area name may appear in the primary tab and the H1. The first section is "Übersicht". A list heading that repeats the H1 is dropped, because the view tab labels the list.
- Before the first content, count how often the same word appears. More than 3 occurrences is a smell.

### Example: Workshops (item 4)
- Section tab "Workshops" → **"Übersicht"**. Eyebrow "WORKSHOPS" deleted. H1 "Workshopübersicht" → **"Workshops"**. H2 "Aktive Workshops" dropped.
- Result: "Workshops" appears 3 times (primary tab, H1, view tab), each with a different meaning. Before: 6 times.
- Description: "Workshops anlegen und bearbeiten, Leitungen und Zielgruppen im Blick behalten."

---

## 9. Phase card and stepper `COMPONENT`

`[data-slot='workflow-stepper']`. For every page that guides organisers through a **process with stages**. Stepper, explanation and action live in **one white card** (`bg-secondary-background border-2 border-border rounded-base`).

### 9.1 Rules
1. **Collapsed is the default.** The whole card, including "Nächster Schritt", shrinks to **one line**. Organisers stay oriented without getting all the details every time.
2. **No action buttons in the collapsed line.** Only the step track and the toggle "Alle Schritte".
3. **Expanded:** full stepper at the top, then a rule, then "Nächster Schritt: …" with explanation and actions.
4. **Orange buttons in the phase card move the process to the next stage** (or are the gate for it, see §9.6). Pure navigation to where the work happens is a **white link button** ("… →").
5. **The last stage is an end state:** no action, its heading is the stage name, and the current circle shows a white ✓ on black.
6. Actions that are useful but **don't change the stage** belong on the page itself, not in the stepper.
7. Remember collapsed/expanded **per user and per page** in `localStorage` (key e.g. `"{page}.phase.expanded"`, wrap it in try/catch, fall back to collapsed).

### 9.2 Visuals (the original stepper look is kept)
- **28px circles:** done = white, `border-2`, black ✓ · current = black fill, white number (14/700) · open = white, `border-2 border-dashed` muted, muted number.
- **Connector lines:** **solid black, 2px** up to and including the current stage; **dashed, muted, 2px** after it. The line from stage n to n+1 is solid if n+1 ≤ current stage.
- **No** segment bars or pills.

### 9.3 Expanded
- From 40rem: `<ol aria-label="Ablauf …">` as `grid` with one column per stage. Each `li`: row "circle + line (`flex-1 mx-2.5`)", below it label 14px (current 700, done 500 black, open 500 muted) and sub-line 12/400 muted.
- **Below 40rem: vertical** (§4.2).
- Toggle top right: ghost button "Weniger" + chevron rotated 180°.
- Panel: `h2` 18/700 "Nächster Schritt: …" (end state: stage name), line 1 14/400, line 2 14/400 muted, actions on the right (full width below on phones).

### 9.4 Collapsed
- Same circles and lines as a compact track (lines 28px, `mx-2`).
- **Only the current stage is labelled**, inline: label 14/700 + " · " + sub-line 14/400 muted, `truncate`.
- Done and open stages get **screen-reader text** ("Schritt 1: …, erledigt" / "…, offen"). Current stage `aria-current="step"`.
- On the right only: ghost toggle "Alle Schritte ▾" (`aria-expanded="false"`, `aria-controls`).
- Below 40rem: §4.2.

### 9.5 What a page supplies (props)

| Prop | Meaning |
|---|---|
| `stages[]` | label, sub-line when done, sub-line when current/open |
| `current` | index of the current stage |
| `panel` per stage/state | heading, line 1, line 2 (muted) |
| `actions` per stage/state | list of `{kind: primary | neutral | link | disabled, label, onClick/href}` |
| `notes` (optional) | count, list, acknowledgement state for the gate in §9.6 |

### 9.6 Notes gate before a stage change (optional part of the component)
For stages where **open notes** (data problems, conflicts) should be seen before the process continues:
- While notes are open and not yet acknowledged, the heading is "Nächster Schritt: Hinweise prüfen". "**{n} Hinweise prüfen**" is orange and the stage-changing action is **white**. **Both** open the review.
- **Inline review** inside the phase card (not a modal, so organisers can jump to the affected entry, fix it and come back): dashed frame, `bg-warning-bg`, `role="region" aria-labelledby`. Heading "{n} offene Hinweise" (16/700), short explanation, at most 5 rows "⚠ **{Entry}** · {Note}" + link "Zum …", then "+ {n−5} weitere · Alle in der Liste zeigen" (sets the list filter to "entries with notes"), then "Abbrechen" (white) and "**Zur Kenntnis genommen**" (orange).
- Only after confirming does the stage-changing action become orange. "Hinweise prüfen" stays as a white button and filters the list.
- With no notes, only the orange stage-changing action is shown.
- **Buttons keep their positions**, so only their colour changes.
- Persist the acknowledgement **on the server** (user + timestamp). If the number of notes changes afterwards, the acknowledgement becomes invalid again.
- Focus: on open, to the review heading; on cancel, back to the triggering button.

### 9.7 Component sketch

```tsx
type Action = { kind: "primary" | "neutral" | "link" | "disabled"; label: string; onClick?: () => void; href?: string };
type Stage = { label: string; subDone: string; subOpen: string };

function PhaseCard({ id, stages, current, panel, actions, notes }: {
  id: string; stages: Stage[]; current: number;
  panel: { heading: string; text: string; note?: string };
  actions: Action[];
  notes?: { count: number; state: "open" | "reviewing" | "acknowledged"; items: NoteItem[] };
}) {
  const [expanded, setExpanded] = usePersistentState(`${id}.phase.expanded`, false);
  return (
    <section aria-label={`Ablauf: ${id}`}
             className="rounded-base border-2 border-border bg-secondary-background">
      {expanded ? (
        <>
          <div className="flex items-start gap-4 border-b-[1.5px] border-rule py-4 pr-3 pl-5">
            <StepperFull stages={stages} current={current} />
            <ToggleButton expanded onClick={() => setExpanded(false)} />
          </div>
          <PhasePanel {...panel} actions={notes?.state === "reviewing" ? [] : actions} />
          {notes?.state === "reviewing" && <NotesReview {...notes} />}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 py-2.5 pr-3 pl-5">
          <StepperCompact stages={stages} current={current} />
          <ToggleButton expanded={false} onClick={() => setExpanded(true)} className="ml-auto" />
        </div>
      )}
    </section>
  );
}

// Below sm: vertical stepper. Render both lines; CSS shows the right one:
//   <span className={cn("hidden sm:block flex-1 mx-2.5", connector(n, current))} />              // horizontal
//   <span className={cn("sm:hidden flex-1 w-0 min-h-5 my-1 border-l-2", connectorV(n, current))} /> // vertical
//   li: "grid grid-cols-[28px_1fr] gap-x-3 sm:block"
const connector = (n: number, current: number) =>
  n + 1 <= current ? "border-t-2 border-solid border-border" : "border-t-2 border-dashed border-muted";
const connectorV = (n: number, current: number) =>
  n + 1 <= current ? "border-solid border-border" : "border-dashed border-muted";
```

### 9.8 Example: Workshops (item 19)

Stages: **1 Workshops anlegen · 2 Wahl öffnen · 3 Zuordnung prüfen · 4 Festgelegt**. Today it's stage 2.

```
expanded
┌──────────────────────────────────────────────────────────────────────┐
│ (✓)━━━━━━━━━━━━(2)┄┄┄┄┄┄┄┄┄┄┄┄(3)┄┄┄┄┄┄┄┄┄┄┄┄(4)          Weniger ▴ │
│ Workshops anlegen Wahl öffnen   Zuordnung prüfen Festgelegt          │
│ 33 Workshops      Zieltermin:   13 Hinweise      Ergebnis für        │
│ angelegt          15. April 2027 offen           Familien festlegen  │
├──────────────────────────────────────────────────────────────────────┤
│ Nächster Schritt: Wahl öffnen                        [ Wahl öffnen ] │
│ Workshopdaten sind vorhanden. Prüfe Zielgruppen …                    │
│ Familien sehen noch keine Workshops, bis die Wahl geöffnet ist.      │
└──────────────────────────────────────────────────────────────────────┘

collapsed
┌──────────────────────────────────────────────────────────────────────┐
│ (✓)━━(2) Wahl öffnen · Zieltermin: 15. April 2027 ┄┄(3)┄┄(4)  Alle Schritte ▾ │
└──────────────────────────────────────────────────────────────────────┘
```

| Stage / state | Collapsed sub-line | Heading (expanded) | Actions (expanded only) |
|---|---|---|---|
| **1 · Workshops anlegen** | "33 Workshops angelegt" | Nächster Schritt: Workshops anlegen | **link** "Workshops anlegen →" (white) → jumps to the list with "+ Workshop hinzufügen" |
| **2 · Wahl öffnen** (today) | "Zieltermin: 15. April 2027" | Nächster Schritt: Wahl öffnen | **"Wahl öffnen"** (orange) |
| **3 · notes open** | "13 Hinweise offen" | Nächster Schritt: Hinweise prüfen | **"13 Hinweise prüfen"** (orange) + "Ergebnis festlegen" (white), both open the review |
| **3 · review open** | – | Nächster Schritt: Hinweise prüfen | hidden; review shows "Abbrechen" + "Zur Kenntnis genommen" |
| **3 · acknowledged** | "13 Hinweise zur Kenntnis genommen" | Nächster Schritt: Ergebnis festlegen | "13 Hinweise prüfen" (white, filters the list) + **"Ergebnis festlegen"** (orange) |
| **3 · no notes** | "Keine offenen Hinweise" | Nächster Schritt: Ergebnis festlegen | **"Ergebnis festlegen"** (orange) |
| **4 · Festgelegt** (end) | "Für Familien sichtbar" | Festgelegt | none |

Sub-lines when done: 1 "33 Workshops angelegt", 2 "Geöffnet am 15. April 2027", 3 "Alle Hinweise erledigt", 4 "Für Familien sichtbar".

Panel copy:

| Stage | Line 1 | Line 2 (muted) |
|---|---|---|
| 1 | Lege alle Workshops mit Zielgruppe, Leitung und Plätzen an. | Familien sehen noch nichts. |
| 2 | Workshopdaten sind vorhanden. Prüfe Zielgruppen und Leitungen, bevor du die Wahl öffnest. | Familien sehen noch keine Workshops, bis die Wahl geöffnet ist. |
| 3 · notes open | Die Wahl ist geschlossen. 13 Hinweise sind offen, z. B. überbuchte Workshops. Prüfe sie, bevor du das Ergebnis festlegst. | Familien sehen „Zuordnung läuft“, bis das Ergebnis festgelegt ist. |
| 3 · acknowledged | 13 Hinweise sind zur Kenntnis genommen und bleiben an den Workshops sichtbar. | Mit dem Festlegen sehen Familien ihre Workshops. Danach sind Änderungen nur noch einzeln möglich. |
| 3 · no notes | Alle Hinweise sind erledigt. | Mit dem Festlegen sehen Familien ihre Workshops. Danach sind Änderungen nur noch einzeln möglich. |
| 4 | Das Ergebnis ist festgelegt und für Familien sichtbar. | Festgelegt am [DATUM]. Änderungen sind nur noch einzeln möglich. |

Stage 2 is the existing copy. **Stages 1, 3, 4 are proposals.**

Notes review (example rows):
```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  13 offene Hinweise
  Behebe sie in der Liste oder nimm sie bewusst zur Kenntnis.
  Sie bleiben danach an den Workshops sichtbar.
  ⚠ Keramik · Zielgruppe „Erwachsene“ passt nicht zum Alter 5–14 Jahre.   Zum Workshop
  ⚠ Spielewerkstatt · Eine Leitung (ID „per_p2“) ist keiner Person zugeordnet.  Zum Workshop
  ⚠ Kletterwand · 32 Wünsche für 12 Plätze.                             Zum Workshop
  ⚠ Erste Hilfe am Kind · 34 Wünsche für 14 Plätze.                     Zum Workshop
  ⚠ Zirkus · Noch nicht eingeplant.                                     Zum Workshop
  + 8 weitere · Alle in der Liste zeigen
                                   [ Abbrechen ]  [ Zur Kenntnis genommen ]
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

"Ergebnis festlegen" is hard to undo. Whether it needs its own confirmation is an open question (§19).

---

## 10. Key figures `COMPONENT`

### Rules
- Tiles in `grid grid-cols-2 md:grid-cols-4 gap-3`, white, `border-2`, `rounded-base`, `px-4 py-3`, left-aligned. Number `text-2xl font-bold tabular-nums` (24/700), label `text-sm font-normal text-muted`.
- **Only show numbers that are news or actionable.** A count of entries that have the default value is not a key figure.
- A tile that points to a **problem** gets the warning tier: **dashed** border, ⚠ icon, and it is a **button** (`aria-pressed`) that toggles the matching list filter, with link text "anzeigen" / "alle zeigen". It shares state with the matching quick filter in the toolbar (§11).
- Never larger than the H1 (before: 36px = H1).

### Example: Workshops (items 7, 22, optional 23)
1. **33** aktive Workshops
2. ⚠ **12** noch nicht eingeplant · *anzeigen*: filter tile, linked to "Nur nicht eingeplante".
3. **14** mehr Wünsche als Plätze *(optional, item 23; replaces "32 automatische Zuordnung", which is the default)*. Count of workshops with `wishes > places`.
4. **6** externe Leitungen

---

## 11. List header and toolbar `COMPONENT`

`[data-slot='collection-controls']`, `[data-slot='collection-actions']`

### Rules
- **View tabs + create action** in one row (`border-b-[1.5px] border-border/20`): left `nav aria-label="Ansicht"`, underline tabs 14px, `min-h-11`, 2px underline, **with counts** (active 700 black, inactive 500 muted). Right: the **create action** (orange, pressable, plus icon). Below 40rem the action wraps below the tabs.
- **Toolbar** `flex flex-wrap items-center gap-x-4 gap-y-3`:
  - **Segmented filter**: `inline-flex` (**not** full width; below 40rem full width with equal buttons), `border-2 rounded-base bg-white overflow-hidden`, 2px separators, buttons `min-h-10 px-3.5 text-sm`, active black/white 700, inactive white 500, **counts in the labels**, `role="group" aria-label`, `aria-pressed`. No separate visible label above it.
  - **Quick filter** as a checkbox (18px, `accent-color: black`, label with `min-h-11`).
  - **Result count** right-aligned (`ml-auto`; below 40rem on its own line), `aria-live="polite"`: "{n} {Einträge}" or "{n} {Einträge} von {total}".
- If the page has **no** view switch, the row contains just the list heading (h2) + the create action.

### Example: Workshops (items 5, 21)
- View tabs: "**Workshops** 33 · Leitungen · Externe Leitungen 6". Action: "+ Workshop hinzufügen".
- Segmented filter "Zielgruppe": "Alle 33 · Kinder 22 · Erwachsene 14" ("Kinder und Erwachsene" workshops count towards both). Before: full width, with a separate label "Gruppe".
- Quick filter: "Nur nicht eingeplante". Count: "33 Workshops" / "5 Workshops von 33".

---

## 12. List rows `COMPONENT`

`[data-slot='collection-row']`, `[data-slot='row-actions']`

### 12.1 Rules: layout
- List: `ul`, white, `border-2 border-border rounded-base overflow-hidden`. Between rows **`border-t-[1.5px] border-rule`**, not 2px black (item 17).
- Row: `article` `flex flex-wrap items-start gap-x-6 gap-y-3 p-4 sm:px-5`.
  - Text column `flex-[999_1_320px] min-w-0`.
  - Metric column (optional) `flex-[1_1_190px] max-w-[260px]`.
  - Row action (e.g. "Bearbeiten"): white, pressable, `min-h-10 px-3`, `ml-auto`, `sr-only` row name.
  - Wrapping: **≥ 48rem** one row · **40–48rem** text + metric, action wraps below on the right · **< 40rem** stacked.

### 12.2 Rules: content
1. **Title** 18/700 (item 9).
2. **Description** 14/400 muted.
3. **Meta row** `flex flex-wrap gap-x-4 gap-y-1.5`, 14/400: information as **text with an icon** (e.g. time/place with a clock icon, 14/500), the rest as a muted text chain "A · B · C".
4. **Chips only for exceptions.** (items 13–15)
   - A value that most rows have (**the default**) is **not** shown as a chip.
   - A value that the **active filter** already shows is **not** repeated as a chip; at most as text in the meta row.
   - **Information** (times, places, people) is never a chip.
   - Missing required information → **dashed warning chip** "⚠ Noch nicht …" (12/700, `border-[1.5px] border-dashed`).
5. **People/references:** label muted 400 + names 400. Unresolved references → "+ 1 unbekannte Person" (§13).
6. **Inline notes** (item 18): one line per problem below the content, `border-[1.5px] border-dashed`, `bg-warning-bg`, ⚠, 14/500. **The same checks** feed the notes count of the phase card (§9.6) and the key figures.

### 12.3 Rules: metric column (item 16)
For rows with "fill level vs. demand" (or any value/limit):
- Value "**{a}/{b}**" 20/700 `tabular-nums` + unit word 12 muted.
- Bar: 8px, `border-[1.5px] border-border rounded-full bg-white`, black fill at `a/b`, `role="img" aria-label="{a} von {b} …"`. Print: `print-color-adjust: exact`.
- Line below: **bold** if demand > capacity ("{x} … für {b} …"), otherwise muted. Zero: "Noch keine …".

### 12.4 Example: Workshops

```
┌──────────────────────────────────────────────────────────────────────┐
│ Keramik                                     0/10 zugeordnet  [Bearbeiten] │
│ Schalen und Figuren aus Ton, gebrannt …     ▭▭▭▭▭▭▭▭▭▭ (bar)          │
│ 🕒 Sa. 11:30 · Atelier Zwei  Erwachsene · 5–14 J. · braucht Brennofen  28 Wünsche für 10 Plätze │
│ Leitung Anna Albers                                                  │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                         │
│   ⚠ Zielgruppe „Erwachsene“ passt nicht zum Alter 5–14 Jahre.        │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

| Slot | Workshops content |
|---|---|
| Title | workshop name |
| Exception chip | "Anmeldung statt Wahl" (Bandprobe). **Dropped:** "Automatische Zuordnung" (default, on 32 of 33) |
| Meta row: icon info | slot "Sa. 11:30 · Atelier Zwei". Missing: "⚠ Noch nicht eingeplant" |
| Meta row: text | "{Zielgruppe} · {Alter} · braucht {Ausstattung}". The audience chip moves here, because it duplicates the "Zielgruppe" filter |
| People | "Leitung" + names |
| Inline notes | e.g. "Zielgruppe „Erwachsene“ passt nicht zum Alter 5–14 Jahre." |
| Metric | "0/10 zugeordnet" (registration: "angemeldet"), bar, "28 Wünsche für 10 Plätze" (bold) / "3 Wünsche" / "1 Wunsch" / "Noch keine Wünsche" / "1 Anmeldung bisher" |
| Row action | "Bearbeiten" |

---

## 13. Helpers for text and data `GLOBAL`

Shared utils used by every page.

| Helper | Rule | Example (Workshops) |
|---|---|---|
| **Plurals** (item 25) | `plural(n, "Wunsch", "Wünsche")` or `Intl.PluralRules("de")`. Never "1 Wünsche". | Wünsche, Anmeldungen, Workshops, Plätze, Hinweise |
| **Unresolved references** (item 26) | When a lookup of a person/entry fails: never show the raw ID. Show "+ 1 unbekannte Person" + inline note, and log it. | "Tobias Hess, **per_p2**" → "Tobias Hess + 1 unbekannte Person" |
| **Open-ended ranges** (item 28) | Sentinel maxima (e.g. 99) render as "ab X": `max >= 99 ? \`ab ${min} J.\` : \`${min}–${max} J.\`` | "18–99 Jahre" → "ab 18 J." |

---

# Part IV – The Workshops page `WORKSHOPS`

## 14. Everything Workshops-specific in one place `WORKSHOPS`

This is the **only** content that belongs to the Workshops page alone. Other pages **don't copy** any of it.

| Topic | Workshops content | Built with |
|---|---|---|
| Area / sections | "Workshops" · Übersicht, Teilnahme, Wünsche, Räume und Slots, Listen | §6.4 |
| Page header | H1 "Workshops", description "Workshops anlegen und bearbeiten, Leitungen und Zielgruppen im Blick behalten." | §8 |
| Process | 4 stages: Workshops anlegen → Wahl öffnen → Zuordnung prüfen → Festgelegt, with copy and actions | §9.8 |
| Notes gate | in stage 3 before "Ergebnis festlegen"; the notes come from the workshop checks below | §9.6 |
| Key figures | 33 aktive Workshops · 12 noch nicht eingeplant (filter) · 14 mehr Wünsche als Plätze (optional) · 6 externe Leitungen | §10 |
| View tabs | Workshops 33 · Leitungen · Externe Leitungen 6 | §11 |
| Filters | Zielgruppe (Alle / Kinder / Erwachsene, "Kinder und Erwachsene" counts towards both) · Nur nicht eingeplante | §11 |
| Row fields | name, description, slot, Zielgruppe, Alter, Ausstattung, Leitung, capacity "zugeordnet"/"angemeldet", Wünsche | §12.4 |
| Exception chip | "Anmeldung statt Wahl"; "Automatische Zuordnung" is the default and therefore hidden | §12.2 |
| **Workshop checks** (feed inline notes + notes gate + key figures) | not scheduled · more wishes than places · audience doesn't match age · leader unresolved | §12.2, §9.6 |
| **Validation rule** (item 27) | "Erwachsene" requires min. age ≥ 16 (Chor starts at 16), "Kinder" requires max. age ≤ 17 | – |
| **Data fixes** | Keramik: tagged "Erwachsene" but 5–14 years → fix the record · `per_p2`: person record missing (probably seed) → fix the join | §13 |
| Print filter line | "Ansicht: Workshops · Zielgruppe: Alle · 33 Workshops" | §5 |
| Optional | key figure "32 automatische Zuordnung" → "14 mehr Wünsche als Plätze" (item 23) | §10 |

---

# Part V – Rollout

## 15. Applying it to other pages

Work through each organiser page with this recipe. The answers determine which components it uses and with what content.

0. **Stories and docs**: when the page uses a component, check that its stories and docs cover the page's case. If they don't, add a story/state there, not a one-off in the page.
1. **App shell**: nothing to do (`GLOBAL`). Check that the page's area has the right **sections**: if it has sub-pages, the band shows them (first one "Übersicht"); if not, no band.
2. **Page header**: H1 = area/page name, one-sentence description, no eyebrow. Count word repetitions (§8).
3. **Does the page guide a process with stages?** → phase card (§9). Define the stages, the sub-lines, the panel copy per stage, the stage-changing actions and the end state. Do any checks have to be seen before a stage change? → notes gate.
4. **Which numbers are news or actionable?** → key figures (§10). Problem numbers become dashed filter tiles.
5. **Does the page show a collection?** → list header + toolbar (§11): views, create action, filters with counts, quick filters, result count.
6. **List rows** (§12): which value is the **default** (→ no chip)? Which value is already **filtered** (→ no chip)? What is **information** (→ text with an icon)? What is a **real exception** (→ chip)? Is there a **value vs. limit** (→ metric column)? Which **checks** produce inline notes?
7. **Texts**: plurals, unresolved references, open-ended ranges via the helpers (§13).
8. **Print**: filter context line, which parts print, pagination check (§5).
9. **Breakpoints**: check at 390 / 640 / 768 / 1024 / 1280 (§4).

**Page-specific content** goes into the page code and, if they exist, the page/feature docs. It does **not** go into the design-system rules.

**Don't copy:** Workshops wording, the 4 Workshops stages, the Workshops checks, the audience/age rule, the Workshops key figures.

---

## 16. Problem analysis (before), with labels

What was found on the Workshops page, and whether the cause is page-specific or global.

| Problem found | Label | Notes |
|---|---|---|
| Second navigation level heavier than the first (boxes vs. none), two identical black active pills, orange hover on nav, secondary nav above the title | `GLOBAL` | app shell (§6) |
| Same word 6× before the content | `COMPONENT` rule, `WORKSHOPS` instance | page header (§8) |
| Stat numbers at 36px = H1 | `COMPONENT` | key figures (§10) |
| App title 20px bold, the same weight as every card title | `GLOBAL` | header (§6.2) |
| Nav 16px vs. buttons 14px in the same box | `GLOBAL` | shapes (§1.1) |
| 700 almost everywhere | `GLOBAL` | weight budget (§1.5) |
| Off-scale sizes 11/13/15/0.8125rem | `GLOBAL` | type scale (§1.4) |
| Orange = CTA, nav hover and warning | `GLOBAL` | colour tiers (§1.2) |
| 2–3 bordered chips per row + 2px black dividers | `COMPONENT` | list rows (§12) |
| "Automatische Zuordnung" on 32/33 rows | `COMPONENT` rule (no default chips), `WORKSHOPS` instance | §12.2 |
| Audience chip duplicates the filter | `COMPONENT` rule, `WORKSHOPS` instance | §12.2 |
| Slot as a chip | `COMPONENT` rule, `WORKSHOPS` instance | §12.2 |
| Capacity vs. wishes buried in the grey meta line | `COMPONENT` (metric column), `WORKSHOPS` instance | §12.3 |
| ~800px of chrome above the first row, `space-y-8` everywhere, full-width segmented filter | `GLOBAL` + `COMPONENT` | §1.6, §9, §11 |
| "Gespeichert" ambiguous (status or control?) | `GLOBAL` | §7 |
| "1 Wünsche", "1 Anmeldungen" | `GLOBAL` helper | §13 |
| Raw ID "per_p2" | `GLOBAL` helper + `WORKSHOPS` data bug | §13, §14 |
| Keramik: Erwachsene + 5–14 years | `WORKSHOPS` | §14 |
| "18–99 Jahre" | `GLOBAL` helper | §13 |

---

## 17. Implementation order

Every step includes its **Storybook stories and design-system docs** (§0.2). A step without them isn't finished.

**Phase 1 – `GLOBAL` (once, benefits every page)**
1. Tokens & utilities (§2): `--main-soft`, `--warning-bg`, shadows, `.pressable`/`.liftable`, type scale cleanup. *(items 6, 12)*
2. App shell (§6, §7): tabs, band, app title, hover rules, save button. *(items 1, 2, 3, 8, 11, 24)*
3. Helpers (§13). *(items 25, 26 helper, 28)*
4. Weight and spacing rules (§1.5, §1.6), focus rings, reduced motion. *(items 10, 20)*

**Phase 2 – `COMPONENT` (build once, with props)**

5. Page header (§8).
6. List rows incl. metric column and inline notes (§12). *(items 9, 13–18 as rules)*
7. List header + toolbar (§11). *(items 5, 21)*
8. Key figures (§10). *(items 7, 22)*
9. Phase card + stepper incl. notes gate, server-side acknowledgement, vertical variant, print (§9). *(item 19)*

**Phase 3 – `WORKSHOPS` (fill in the example page)**

10. Wire the Workshops page to the components with the content in §14. *(items 4, 13–19 content, 23)*
11. Workshop checks, validation rule, data fixes Keramik / `per_p2`. *(items 26 data, 27)*

**Phase 4 – check**

12. Breakpoints and print on the Workshops page, then the same on every other page converted with §15. *(item 29)*
13. **Storybook and docs audit:** every `GLOBAL`/`COMPONENT` item has an up-to-date story and docs page, the obsolete patterns are removed, and Workshops content appears only as labelled examples. *(item 30)*

---

## 18. Checklist (all 30 items, labelled)

Effort: **S** = under 30 min, **M** = 1–3 h (code only; stories and docs add roughly 30–50 %). Where an item has two labels, the first part is the rule/component and the second the Workshops content.

**Each item is only done when it is ticked in all three columns: code · Storybook · docs** (§0.2). For `WORKSHOPS`-only items, "docs" means the page/feature docs, not the design-system rules.

### A · Navigation hierarchy
- [ ] **1** `GLOBAL` Primary nav as tabs on the bottom edge of the header (§6.3) · M
- [ ] **2** `GLOBAL` Section band under the header, only for areas with sections (§6.4) · M
- [ ] **3** `GLOBAL` Lift / tab-outline hover instead of orange (§6.5) · S
- [ ] **4** `COMPONENT` + `WORKSHOPS` No repetition: first section "Übersicht", no eyebrow, H1 = area name. Workshops: H1 "Workshops", H2 dropped (§8) · S
- [ ] **5** `COMPONENT` + `WORKSHOPS` View tabs with counts + create action in one row. Workshops: "Workshops 33 · Leitungen · Externe Leitungen 6" (§11) · S

### B · Type and weight
- [ ] **6** `GLOBAL` Type scale 12/14/16/18/20/24/30, remove 11/13/15/0.8125rem (§1.4) · M
- [ ] **7** `COMPONENT` Key-figure numbers 24px, labels regular and muted (§10) · S
- [ ] **8** `GLOBAL` App title split into name + subtitle, logo tile (§6.2) · S
- [ ] **9** `COMPONENT` List-row titles 18px (§12.2) · S
- [ ] **10** `GLOBAL` Weight budget (§1.5) · M
- [ ] **11** `GLOBAL` Three shapes: tab, chip, button (§6.6) · S

### C · Colour
- [ ] **12** `GLOBAL` Three colour tiers (§1.2) · M

### D · List rows
- [ ] **13** `COMPONENT` + `WORKSHOPS` No chips for default values. Workshops: drop "Automatische Zuordnung", keep "Anmeldung statt Wahl" · S
- [ ] **14** `COMPONENT` + `WORKSHOPS` Don't repeat the active filter as a chip. Workshops: audience as text · S
- [ ] **15** `COMPONENT` + `WORKSHOPS` Information as text with an icon, missing info as a dashed warning chip. Workshops: slot / "Noch nicht eingeplant" · S
- [ ] **16** `COMPONENT` + `WORKSHOPS` Metric column value/limit + bar + demand. Workshops: zugeordnet + Wünsche (§12.3) · M
- [ ] **17** `COMPONENT` Row dividers 1.5px `--rule` · S
- [ ] **18** `COMPONENT` + `WORKSHOPS` Inline notes fed by the page's checks. Workshops: the 4 workshop checks (§12.2, §14) · M

### E · Above the fold
- [ ] **19** `COMPONENT` + `WORKSHOPS` Phase card (collapsed by default, original stepper lines, stage rules, notes gate, vertical on phones, print). Workshops: 4 stages + copy (§9) · M+
- [ ] **20** `GLOBAL` Spacing in groups (§1.6) · S
- [ ] **21** `COMPONENT` + `WORKSHOPS` Segmented filter auto-width with counts. Workshops: Zielgruppe (§11) · S
- [ ] **22** `COMPONENT` + `WORKSHOPS` Problem key figure as a dashed filter tile. Workshops: "12 noch nicht eingeplant" (§10) · S
- [ ] **23** `WORKSHOPS` *(optional)* "32 automatische Zuordnung" → "14 mehr Wünsche als Plätze" · S

### F · Shell, helpers, data
- [ ] **24** `GLOBAL` Save button shows mode and state, menu with radio items (§7) · M
- [ ] **25** `GLOBAL` Plural helper (§13) · S
- [ ] **26** `GLOBAL` + `WORKSHOPS` Unresolved-reference fallback. Workshops: fix `per_p2` (§13, §14) · S
- [ ] **27** `WORKSHOPS` Keramik record + audience/age validation (§14) · S
- [ ] **28** `GLOBAL` Open-ended ranges "ab X" (§13) · S

### G · Check
- [ ] **29** `GLOBAL` Every page: 390/640/768/1024/1280, A4 print with `print-color-adjust`, keyboard, focus, `aria-*`, contrast (§3, §4, §5) · M per page
- [ ] **30** `GLOBAL` Storybook + design-system docs audit: stories for every state, viewport and print stories, docs pages per foundation and component, obsolete patterns removed, Workshops only as labelled examples (§0.2) · M

---

## 19. Open questions

| # | Question | Label |
|---|---|---|
| 1 | **Dark mode** exists in `globals.css` but wasn't designed in this round. How do `--main-soft`, `--warning-bg` and the dashed/black language look there? | `GLOBAL` |
| 2 | **Draft mode:** is there an explicit "Speichern" and a counter of pending changes? (Assumed in §7.) | `GLOBAL` |
| 3 | **Acknowledging notes:** stored per organiser or per event? Invalid when the count changes? (Suggestion: yes.) | `COMPONENT` |
| 4 | **Final confirmation** for irreversible stage changes: always, never, or only without a prior notes review? | `COMPONENT` (Workshops: "Ergebnis festlegen") |
| 5 | **Vote running:** which stage is current while the vote is open? Possibly a fifth state ("Wahl läuft · endet am …"). | `WORKSHOPS` |
| 6 | **Stage 1 → 2:** automatic once workshops exist, or an explicit action? Assumed: automatic. | `WORKSHOPS` |
| 7 | **"Wünsche"**: all ranks or first choices only? (Affects key figure 23 and "x Wünsche für y Plätze".) | `WORKSHOPS` |
| 8 | **Panel copy** for Workshops stages 1, 3, 4 is a proposal. | `WORKSHOPS` |
| 9 | **Logo:** the mockup uses a placeholder. The real logo goes on the soft-orange tile. | `GLOBAL` |

---

## 20. Decision log

### 20.1 Section navigation – variants considered (`GLOBAL`)

| Variant | Idea | Decision |
|---|---|---|
| **A** – underline tabs under the H1 | quiet, standard, clearly page-related | first proposal, then **replaced**: no visual link to the area in the header |
| **B** – second row inside the white header | most compact | shortlisted. Primary nav would have to move next to the title (title shortened) |
| **B1** – black band, white text, active as a sticker with an orange shadow | loudest | rejected |
| **B2** – menubar container (neobrutalism.dev style) with an orange-tinted active chip | closest to the component library | rejected in favour of C2 |
| **B3** – underline tabs with a "highlighter" stroke | quietest | rejected |
| **C** – active primary item as a tab that opens downward into a strip | strongest link between the levels | shortlisted; alignment of active/inactive tabs fixed (same box) |
| **C1** – cream strip with an extra 4px black edge | – | rejected |
| **C2** – **tab + strip in soft orange**, chips that lift on hover | "you are in this area" shown as colour | ✅ **chosen** |
| **C3** – "hanging card" instead of a full-width strip | most neobrutal | rejected (fragile: the card must be wide enough to reach under the tab) |
| **D** – menubar with dropdown + breadcrumb | compact, good on phones | rejected: sections hidden behind a click |
| **E** – folder tabs sitting on a white content panel | very physical | rejected: the whole page would have to move into one panel |
| **F** – sidebar with the area expanded | scales, everything visible | rejected: biggest rebuild, takes width away from content |

### 20.2 Further corrections during the discussion

| Topic | Label | First proposal | Correction | Reason |
|---|---|---|---|---|
| "Gespeichert" | `GLOBAL` | quiet status (ghost) | **real menu button with states** | it switches draft mode |
| "Abmelden" | `GLOBAL` | underlined text link | **normal button** | a logout shouldn't look like a link |
| Type scale | `GLOBAL` | secondary nav 15px | 14px chips | 15px would be off-scale |
| Collapsed stepper | `COMPONENT` | 4-part segment bar | **circles with the original solid/dashed lines** | the bar looked out of proportion |
| Collapsed phase card | `COMPONENT` | only the stepper collapses | **the whole card** collapses | orientation without details |
| Buttons when collapsed | `COMPONENT` | CTA in the collapsed line | **no buttons** in the collapsed line | stage changes only happen deliberately, expanded |
| Navigation in a stage | `COMPONENT` | no button | **white link button "… →"** | leads to where the work happens |
| Non-stage actions | `COMPONENT` | "Hinweise prüfen" as the stage CTA | stage-changing action + **notes gate** | "Hinweise prüfen" is actionable but doesn't change the stage |
| Notes gate | `COMPONENT` | checkbox "bewusst übergehen" | **inline review**, opened by either button, "Zur Kenntnis genommen" | notes must be seen, not ticked away |
| End stage | `COMPONENT` | stage with an action + separate "Abgeschlossen" | **end state without action** | the last stage has no action |
| Key figures layout | `COMPONENT` | flex-wrap, 180px basis | **grid 2 / 4 columns** | flex-wrap broke 3+1 at 640px |
| Workshops stage 3 / 4 | `WORKSHOPS` | "Hinweise prüfen" / "Festlegen" | "Ergebnis festlegen" / "**Festgelegt**" | see above, applied to Workshops |
