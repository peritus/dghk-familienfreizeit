# Δ1 – changes since Baseline 1

**For:** whoever implemented Baseline 1 (`organiser-design-guide.md` + `workshops-redesign.md`, delivered 8 October 2026).
**Contains:** only what changes against Baseline 1. Everything not mentioned here stays as implemented.
**Visual reference:** the HTML files in `mockups/` next to this file. They open offline in any browser and are clickable: the pill opens the menu, the radio buttons switch the save mode, and the collapsed phase card expands. Each width renders in its own frame that scrolls like a device viewport. The top bar links all files.

| File | Shows |
|---|---|
| `mockups/nachher-1280.html` · `-1024` · `-768` · `-640` · `-390` | the Workshops page with T1–T3 applied, at each breakpoint (Baseline 1 + Δ1) |
| `mockups/menue-sheet-390.html` | the menu as a bottom sheet, in draft mode with 3 open changes |
| `mockups/menue-popover-640.html` | the menu as a popover, in automatic mode |
| `mockups/menue-zustaende.html` | the 5 states of the menu toggle |

The mockups are design references, not production code. Take measurements and rules from this file; take the look from the mockups.

**Done means**, as before (guide §0.2): code · Storybook · design-system docs.

| # | Task | Label | Breakpoints | Effort |
|---|---|---|---|---|
| T1 | Save status + Abmelden move into a compact **menu toggle** (status pill) with a **menu** | `GLOBAL` (app shell) | < 48rem | M |
| T2 | **Phones: one step smaller type**, especially the two navigation levels | `GLOBAL` (foundations) | < 40rem | M |
| T3 | **Collapsed phase card is clickable as a whole** (cursor pointer) | `COMPONENT` (phase card) | all | S |

---

## T1 · Menu toggle instead of "Gespeichert ▾" + "Abmelden" on narrow screens `GLOBAL`

### Why
Below 48rem the header row has no room for the title plus two boxed buttons. Both are **general controls** (save mode/state, logout) rather than page content, so they go together behind **one** small control at the top right.

- **Not a hamburger:** the toggle is a **status pill** that keeps the save state visible without opening anything.
- **Not an account:** there is no account concept here, so no person icon and no name. It is simply **"Menü"**, and further general controls can be added to it later.

### What changes
- **≥ 48rem: nothing.** "Gespeichert ▾" + "Abmelden" stay as in Baseline 1 (guide §7).
- **< 48rem** (`md:` breakpoint): both buttons are hidden (`hidden md:flex`). In their place, at the top right:

**Menu toggle (status pill)**
- Shape: height 40px, `rounded-full`, `border-2 border-border`, `bg-secondary-background`, `shadow-sm` (2px), `overflow-hidden`. Hover: press by 1px.
- Two segments separated by a 2px divider:
  - **Left: the save state** (min-width 36px, `px-2`)
  - **Right: a slider icon** ("controls", 18px, 36px wide). This marks it as a menu of controls and is deliberately **not** three lines.
- `aria-haspopup="dialog"`, `aria-expanded`, `aria-label` = "Menü (Speichern, Abmelden) – {status}" (e.g. "… alles gespeichert", "… 3 ungespeicherte Änderungen", "… nicht gespeichert").

| Save state | Left segment | Pill border | Also visible next to the pill |
|---|---|---|---|
| Automatic, saved | white, ✓ | solid | – |
| Automatic, saving | white, spinner (static with `prefers-reduced-motion`); announce via `aria-live="polite"` | solid | – |
| Draft mode, n > 0 changes | `bg-main-soft`, ✎ + n (14/700) | **dashed** | **"Speichern"** (orange, pressable): the action stays one tap away |
| Draft mode, 0 changes | `bg-main-soft`, ✎ | **dashed** | – |
| Error | `bg-danger`, "!" | solid | **"Wiederholen"** (orange, pressable) |

**The menu** (opens on tap):
- **< 40rem: bottom sheet.**
  - Placement: `fixed` at the bottom, full width, `border-t-2`, top radius 14px, drag handle (40×4px), `max-h-[85dvh]` scrollable, bottom padding incl. `env(safe-area-inset-bottom)`.
  - Backdrop `rgba(20,20,19,.45)`; tapping it closes the menu.
- **40–48rem: popover.**
  - Placement: anchored top-right under the header row (≈ `top-16 right-4`), `w-[340px]`, `border-2`, `rounded-base`, 4px shadow, no handle.
  - Transparent backdrop for outside-click.
- **Content** (same in both):
  1. Heading **"Menü"** (16/700, `h2`) and a close button (X, `aria-label="Schließen"`). No name, no account information.
  2. Group label **"Speichern"** (12/700 uppercase muted) and the **save box**:
     - Frame: `border-2`, solid in automatic mode, **dashed + `bg-warning-bg`** in draft mode.
     - Content:
       - status line (14/700): "Alles gespeichert" / "Entwurf · {n} ungespeicherte Änderungen" / "Entwurfsmodus · nichts offen" / "Nicht gespeichert"
       - "Zuletzt gespeichert: {Zeit}" (12 muted)
       - `radiogroup` "Speichermodus" with the **same two options and copy as the menu in guide §7.2** (Automatisch speichern / Entwurfsmodus, each with its one-line explanation)
       - in draft mode with n > 0: full-width orange **"{n} Änderungen speichern"**
  3. Group label **"Sitzung"**, then **"Abmelden"** as a full-width normal button (white, pressable). It stays a button, as decided in Baseline 1.
  4. Room for future general controls as further labelled groups, e.g. "Ansicht" or "Hilfe". **Only add them when they exist**; no placeholders.
- **Behaviour:**
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → heading.
  - Focus moves into the menu on open and is trapped. Esc, X and backdrop close it, and focus returns to the pill.
  - Lock body scroll while the sheet is open (< 40rem).
- **One state source:** the pill, the menu and the ≥ 48rem save menu read the **same** save-state model. This is a second presentation, not a second implementation.
- **Print:** unchanged (header actions are hidden in print anyway).

### Icons
Use the project's icon set if it has equivalents (e.g. Lucide `sliders-horizontal`, `check`, `pencil`, `loader-circle`, `x`). Otherwise these are the exact SVGs from the mockups (24×24 viewBox, `stroke="currentColor"`, no fill):

```html
<!-- controls (right segment of the pill), 18px -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/></svg>
<!-- saved, 16px -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
<!-- saving, 16px (rotates; static with prefers-reduced-motion) -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>
<!-- draft, 14px -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
<!-- close, 20px -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
```
The error state uses a plain "!" (14/700), no icon.

### Data
- "Zuletzt gespeichert: {Zeit}" needs the **timestamp of the last successful save** from the save-state model. If the model doesn't expose it yet, add it. If that isn't possible, drop the line rather than showing a made-up time.
- The open-changes count {n} in draft mode comes from the same model.

### Stories
- `AppHeader` at 390 and 640 px × all 5 pill states.
- `HeaderMenu` open as sheet (390) and popover (640): automatic / draft with changes / draft without changes / error.
- An interaction story: open → switch to draft mode → save → close with Esc (focus returns to the pill).

### Docs
- Guide §7 (save button): new subsection **"Compact presentation below 48rem: menu toggle + menu"** with the tables above.
- Guide §6.1 (header structure): add the narrow header diagram.
- Guide §4.1 (breakpoint table): new row "Header controls": < 48rem menu toggle · ≥ 48rem save button + Abmelden.
- Guide §3 (accessibility): dialog rules (focus trap, Esc, focus return).

### Acceptance
- [ ] At 390 and 640 px only the pill (plus "Speichern"/"Wiederholen" when needed) sits at the top right. At 768 px and up, nothing has changed.
- [ ] The left segment shows all 5 states. A screen reader announces the state through the pill's label.
- [ ] The sheet (390) and popover (640) open and close by tap, X, backdrop and Esc. Focus is trapped and then returned.
- [ ] Switching the mode in the menu changes the same state as the desktop save menu.
- [ ] The title truncates with an ellipsis instead of pushing the pill off-screen.
- [ ] No person icon, name or "Konto" wording anywhere.

---

## T2 · Phones: one step smaller type, compact navigation `GLOBAL`

### Why
At 390 px the Baseline 1 sizes feel large: the two nav rows plus header take a lot of height, and headings and figures dominate. Below 40rem everything moves **one step down the existing scale**, with the strongest reduction on navigation levels 1 and 2. The scale itself stays 12/14/16/18/20/24/30.

### What changes (< 40rem only; from `sm:` everything stays as in Baseline 1)

| Role | Baseline 1 | **< 40rem** |
|---|---|---|
| H1 | 30 | **24** |
| Key-figure number | 24 | **20** |
| Metric value (list row) | 20 | **18** |
| App title, list-row title, phase-card heading | 18 | **16** |
| Body text, page description | 16 | **14** |
| Primary nav tabs (level 1) | 16 / 700, `h-12 px-4` | **14 / 700, `h-11 px-3`**, nav offset `-ml-[14px]` |
| Section chips (level 2) | 14, `px-3`, band `gap-2 py-2.5` | **12** (500, active 700), `px-2.5`, band `gap-1 py-2`. Chip height **stays `min-h-10`** (touch target) |
| App subtitle | 14 | **12** |
| Logo tile | 36 px | **32 px** |
| Header top padding / row gap | 12 / 12 | **10 / 10** |
| Buttons, meta row, labels | 14 | 14 (floor for running text) |
| Chips, captions, sub-lines | 12 | 12 (absolute floor) |

Rules:
- Running text never goes below 14. Nothing goes below 12.
- **Touch targets keep their height:** tabs 44, chips 40, buttons 40–44.

### Implementation tip
Make the sizes **role-based tokens** in `globals.css`, so pages don't each sprinkle `sm:` variants. For example:

```css
:root {
  --fs-h1: 1.5rem;  --fs-figure: 1.25rem; --fs-metric: 1.125rem; --fs-title: 1rem;
  --fs-body: 0.875rem; --fs-nav1: 0.875rem; --fs-nav2: 0.75rem; --fs-sub: 0.75rem;
}
@media (width >= 40rem) {
  :root {
    --fs-h1: 1.875rem; --fs-figure: 1.5rem; --fs-metric: 1.25rem; --fs-title: 1.125rem;
    --fs-body: 1rem; --fs-nav1: 1rem; --fs-nav2: 0.875rem; --fs-sub: 0.875rem;
  }
}
```

Expose them as Tailwind `@theme` utilities (e.g. `text-h1`, `text-nav1`) and use them in the shared components. Print is unaffected (it has its own pt sizes).

### Stories
- Typography foundation story at 390 vs 640 px (the token table rendered).
- `AppHeader` + section band at 390 px.
- Component stories at 390 px for key figures, list row and phase card.

### Docs
- Guide §1.4 (type scale): add a **"< 40rem"** column to the role table, plus the floor rules.
- Guide §4.1 (breakpoint table): rows "Type" and "Navigation" for < 40rem.
- Workshops brief §11: the 390 px row mentions the smaller nav.

### Acceptance
- [ ] At 390 px all sizes match the table. At 640 px and up, nothing has changed.
- [ ] No text below 12px. No running text below 14px.
- [ ] Tabs ≥ 44px and chips ≥ 40px high.
- [ ] The active tab is still scrolled into view (Baseline 1 rule).

---

## T3 · Collapsed phase card: whole row clickable `COMPONENT`

### Why
In collapsed mode the only target was the small "Alle Schritte ▾" toggle. The whole one-line card should expand it, with a pointer cursor as the cue.

### What changes (all breakpoints)
- **Collapsed:** the entire row (step track + label + toggle) is the click target. `cursor-pointer`, hover `bg-paper` (the toggle's own hover tint shows at the same time).
- **Implementation:**
  - Put `onClick` (expand) on the row container.
  - The **"Alle Schritte" button stays** as the accessible control (`aria-expanded`, `aria-controls`, keyboard). Don't give it a second handler: its click bubbles to the row. Alternatively keep its handler and call `stopPropagation()`.
  - **Don't** add `role="button"` or `tabindex` to the row, and don't turn the `ol` into a button. The row click is a pointer convenience; keyboard and screen-reader users use the real button.
  - No other interactive elements inside the collapsed row.
  - Optional: `select-none` on the row against accidental text selection on double tap.
- **Expanded: unchanged.** Only "Weniger ▴" collapses it; the expanded area isn't a click target, because it contains actions.
- Print: unaffected.

### Stories
- `PhaseCard` collapsed: hover state.
- Interaction test: a click on the track (not the button) expands. Enter/Space on the button expands. Only one toggle per click.

### Docs
- Guide §9.1 rule 1 and §9.4 (collapsed): "The whole collapsed row expands the card (pointer); the toggle button remains the accessible control."

### Acceptance
- [ ] A click anywhere on the collapsed card expands it, with a pointer cursor and hover tint.
- [ ] A click on "Alle Schritte" toggles exactly once.
- [ ] Keyboard: Tab reaches only the toggle button, and Enter/Space expands.
- [ ] Expanded mode behaves as in Baseline 1.

---

## Not changed by Δ1
- Everything at ≥ 48rem except T3.
- The colour tiers, shapes, section band, list, key-figure layout, print and the Workshops content.
- The open questions in both Baseline 1 docs still stand.

## Note on the Baseline 1 documents
`organiser-design-guide.md` and `workshops-redesign.md` still describe Baseline 1. The **Docs** sections above say where Δ1 goes into the design-system docs. An updated copy of both guides (Baseline 2) follows once Δ1 is confirmed.
