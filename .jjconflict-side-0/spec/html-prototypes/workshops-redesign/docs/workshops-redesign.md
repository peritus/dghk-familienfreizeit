# Workshops page (`/organiser/workshops`) – redesign brief

**Status:** agreed design, ready to implement · **As of:** 8 October 2026
**What this is:** the implementation brief for **one page**, the Workshops overview. It **applies** the rules of `organiser-design-guide.md` to this page and collects everything that is **Workshops-specific** (`WORKSHOPS`).
**What this is not:** a source of general rules. Colours, type, navigation, components, breakpoints and print are defined in the **organiser design guide**, and this brief only references them (§ numbers = sections of the guide). If the two documents disagree, the guide wins for rules and this brief wins for Workshops content.
**Mockups:** `../mockups/index.html`:
- `nachher*.html`: this page, responsive, at 1280 / 1024 / 768 / 640 / 390 px and as A4 print
- `stepper*.html`: every phase-card state, incl. a clickable demo of step 3
- `vorher.html`: the current state

---

## 1. Order of work

The Workshops page is the **first consumer** of the new foundations and components. Build in this order (guide §17):

1. **`GLOBAL` first** (once, for all pages): tokens and utilities (guide §2), app shell with tabs, band and save button (guide §6, §7), helpers (guide §13).
2. **`COMPONENT` next** (once, with props): page header, phase card/stepper, key figures, list header + toolbar, list rows (guide §8–§12).
3. **Then this page:** wire the components with the content in §3–§9 below, fix the data (§10), and check breakpoints and print (§11–§12).

Every step includes its **Storybook stories and design-system docs** (guide §0.2). Workshops content appears there **only as labelled examples** (`…/Example: Workshops`), never as the generic case.

---

## 2. Page at a glance

```
┌ header (GLOBAL) ─────────────────────────────────────────────────────┐
│ [▣] Familienfreizeit Lübben 2027                 [✓ Gespeichert ▾] [Abmelden] │
│     DGHK Berlin-Brandenburg · Organisationsteam                       │
│  Dashboard   Familien   Unterbringung  ┌Workshops┐                    │
├────────────────────────────────────────┘         └───────────────────┤
│ [Übersicht]  Teilnahme  Wünsche  Räume und Slots  Listen             │ band
└──────────────────────────────────────────────────────────────────────┘
  Workshops                                                     H1 (§3)
  Workshops anlegen und bearbeiten, Leitungen und Zielgruppen …

  ┌ phase card, collapsed by default (§4) ───────────────────────────┐
  │ (✓)━━(2) Wahl öffnen · Zieltermin: 15. April 2027 ┄┄(3)┄┄(4)  Alle Schritte ▾ │
  └──────────────────────────────────────────────────────────────────┘
  [33 aktive Workshops] [⚠ 12 noch nicht eingeplant] [14 mehr Wünsche …] [6 externe …]   (§5)

  Workshops 33 · Leitungen · Externe Leitungen 6        [+ Workshop hinzufügen]   (§6)
  [Alle 33|Kinder 22|Erwachsene 14]  ☐ Nur nicht eingeplante        33 Workshops
  ┌ list rows (§7) ──────────────────────────────────────────────────┐
  │ Keramik …                                 0/10 zugeordnet [Bearbeiten] │
  └──────────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation and page header

Built with guide §6 (app shell) and §8 (page header).

| Element | Workshops content |
|---|---|
| Active primary tab | **Workshops** |
| Section band | **Übersicht** (active) · Teilnahme · Wünsche · Räume und Slots · Listen. The first tab was "Workshops" and is renamed to "Übersicht" |
| `aria-label` of the band | "Workshopbereiche" |
| Eyebrow | **deleted** (was "WORKSHOPS") |
| H1 | **Workshops** (was "Workshopübersicht") |
| Description | "Workshops anlegen und bearbeiten, Leitungen und Zielgruppen im Blick behalten." |
| List heading H2 | **dropped** (was "Aktive Workshops"). The view tab labels the list |

Result: "Workshops" appears 3× before the content (primary tab, H1, view tab). Before: 6×.

---

## 4. Phase card: the Workshops process

Built with guide §9 (component, rules, visuals, notes gate). This section holds only the **Workshops content**.

### 4.1 Stages

| # | Label | Sub-line when current/open | Sub-line when done |
|---|---|---|---|
| 1 | Workshops anlegen | 33 Workshops angelegt | 33 Workshops angelegt |
| 2 | Wahl öffnen | Zieltermin: 15. April 2027 | Geöffnet am 15. April 2027 |
| 3 | Zuordnung prüfen | 13 Hinweise offen · 13 Hinweise zur Kenntnis genommen · Keine offenen Hinweise | Alle Hinweise erledigt |
| 4 | Festgelegt *(end state)* | Ergebnis für Familien festlegen (while open) | Für Familien sichtbar (current = end) |

Today the current stage is **2**. Stage 4 as the current stage shows a white ✓ on black.

### 4.2 Panel and actions per state

| Stage / state | Heading | Line 1 | Line 2 (muted) | Actions (expanded only) |
|---|---|---|---|---|
| **1** | Nächster Schritt: Workshops anlegen | Lege alle Workshops mit Zielgruppe, Leitung und Plätzen an. | Familien sehen noch nichts. | link "Workshops anlegen →" (white) → jumps to the list / "+ Workshop hinzufügen" |
| **2** | Nächster Schritt: Wahl öffnen | Workshopdaten sind vorhanden. Prüfe Zielgruppen und Leitungen, bevor du die Wahl öffnest. | Familien sehen noch keine Workshops, bis die Wahl geöffnet ist. | **"Wahl öffnen"** (orange) |
| **3 · notes open** | Nächster Schritt: Hinweise prüfen | Die Wahl ist geschlossen. 13 Hinweise sind offen, z. B. überbuchte Workshops. Prüfe sie, bevor du das Ergebnis festlegst. | Familien sehen „Zuordnung läuft“, bis das Ergebnis festgelegt ist. | **"13 Hinweise prüfen"** (orange) + "Ergebnis festlegen" (white). Both open the review |
| **3 · review open** | Nächster Schritt: Hinweise prüfen | (as above) | (as above) | hidden. The review shows "Abbrechen" + **"Zur Kenntnis genommen"** |
| **3 · acknowledged** | Nächster Schritt: Ergebnis festlegen | 13 Hinweise sind zur Kenntnis genommen und bleiben an den Workshops sichtbar. | Mit dem Festlegen sehen Familien ihre Workshops. Danach sind Änderungen nur noch einzeln möglich. | "13 Hinweise prüfen" (white, filters the list) + **"Ergebnis festlegen"** (orange) |
| **3 · no notes** | Nächster Schritt: Ergebnis festlegen | Alle Hinweise sind erledigt. | Mit dem Festlegen sehen Familien ihre Workshops. Danach sind Änderungen nur noch einzeln möglich. | **"Ergebnis festlegen"** (orange) |
| **4** | Festgelegt | Das Ergebnis ist festgelegt und für Familien sichtbar. | Festgelegt am [DATUM]. Änderungen sind nur noch einzeln möglich. | none |

Copy for stage 2 is the existing text. **Stages 1, 3, 4 are proposals** (§13).

### 4.3 Notes gate in stage 3
- The gate (guide §9.6) sits **before "Ergebnis festlegen"**.
- The notes come from the **workshop checks** (§8). The same checks feed the inline notes on the rows and the key figures.
- Review rows show "⚠ **{Workshop}** · {Note}" + link **"Zum Workshop"** (scrolls to the row and highlights it). At most 5 rows, then "+ {n} weitere · Alle in der Liste zeigen" (sets the list filter to "workshops with notes").
- Example rows:
  - Keramik · Zielgruppe „Erwachsene“ passt nicht zum Alter 5–14 Jahre.
  - Spielewerkstatt · Eine Leitung (ID „per_p2“) ist keiner Person zugeordnet.
  - Kletterwand · 32 Wünsche für 12 Plätze.
  - Erste Hilfe am Kind · 34 Wünsche für 14 Plätze.
  - Zirkus · Noch nicht eingeplant.
- Persist "Zur Kenntnis genommen" on the server (organiser + timestamp). When the number of notes changes, the state goes back to "notes open".

### 4.4 Storage key
`workshops.phase.expanded` (per user, default collapsed).

---

## 5. Key figures

Built with guide §10.

| # | Number | Label | Type |
|---|---|---|---|
| 1 | 33 | aktive Workshops | normal |
| 2 | ⚠ 12 | noch nicht eingeplant · *anzeigen* / *alle zeigen* | **warning tile = filter button**, shares state with "Nur nicht eingeplante" |
| 3 | 14 | mehr Wünsche als Plätze | normal, *optional* (replaces "32 automatische Zuordnung", see §13) |
| 4 | 6 | externe Leitungen | normal |

Definitions:
- **noch nicht eingeplant** = workshops without a slot.
- **mehr Wünsche als Plätze** = workshops with `wishes > places`.
- **externe Leitungen** = distinct external leaders.

---

## 6. List header and toolbar

Built with guide §11.

| Element | Workshops content |
|---|---|
| View tabs | **Workshops 33** · Leitungen · Externe Leitungen 6 (`aria-label="Ansicht"`) |
| Create action | **+ Workshop hinzufügen** (orange) |
| Segmented filter | "Zielgruppe": **Alle 33 · Kinder 22 · Erwachsene 14**. Workshops for "Kinder und Erwachsene" count towards both. The old visible label "Gruppe" is removed |
| Quick filter | ☐ **Nur nicht eingeplante** (same state as key figure 2) |
| Result count | "33 Workshops" / "{n} Workshops von 33" (plural helper) |

---

## 7. List rows: workshop fields

Built with guide §12. Field mapping:

| Row slot (guide §12) | Workshop field | Display |
|---|---|---|
| Title | name | e.g. "Keramik" |
| Exception chip | registration mode | only **"Anmeldung statt Wahl"** (e.g. Bandprobe). "Automatische Zuordnung" is the default and is **not** shown |
| Description | description | muted |
| Meta: icon info | slot | 🕒 "Sa. 11:30 · Atelier Zwei". If missing: dashed chip "⚠ Noch nicht eingeplant" |
| Meta: text chain | audience · age · equipment | "Erwachsene · 5–14 J. · braucht Brennofen". Audience labels: Kinder / Erwachsene / Kinder und Erwachsene. Age via the open-range helper ("ab 18 J."). The audience chip is removed, because it duplicates the filter |
| People | leaders | "Leitung" (muted) + names; external leaders "Name (extern)"; unresolved → "+ 1 unbekannte Person" |
| Inline notes | workshop checks (§8) | dashed lines below the content |
| Metric value | assigned / places | "0/10 **zugeordnet**". Registration mode: "1/8 **angemeldet**" |
| Metric bar | assigned ÷ places | black fill |
| Metric demand | wishes | `wishes > places` → **bold** "28 Wünsche für 10 Plätze"; otherwise muted "3 Wünsche" / "1 Wunsch" / "Noch keine Wünsche"; registration mode: "1 Anmeldung bisher" |
| Row action | edit | "Bearbeiten" + `sr-only` ": {Name}" |

Before/after for the noisiest row:
- **Before:** `[Erwachsene] [Automatische Zuordnung]` · "5–14 Jahre · 10 Plätze · braucht: Brennofen · 0/10 zugeordnet · 28 Wünsche" · `[Sa., 11:30 Uhr · Atelier Zwei]`
- **After:** 🕒 Sa. 11:30 · Atelier Zwei · Erwachsene · 5–14 J. · braucht Brennofen | **0/10** zugeordnet ▭ **28 Wünsche für 10 Plätze** | ⚠ Zielgruppe „Erwachsene“ passt nicht zum Alter 5–14 Jahre.

---

## 8. Workshop checks (source of all notes)

One shared check function produces the notes for the inline notes (§7), the notes gate (§4.3) and the key figures (§5).

| Check | Condition | Note text (German) |
|---|---|---|
| Not scheduled | no slot | Noch nicht eingeplant. |
| Oversubscribed | `wishes > places` | {wishes} Wünsche für {places} Plätze. |
| Audience vs. age | "Erwachsene" with min. age < 16, or "Kinder" with max. age > 17 | Zielgruppe „{Zielgruppe}“ passt nicht zum Alter {min}–{max} Jahre. |
| Unresolved leader | a leader ID has no person record | Eine Leitung (ID „{id}“) ist keiner Person zugeordnet. |

**Validation rule (new):**
- "Erwachsene" requires min. age ≥ 16 (Chor starts at 16).
- "Kinder" requires max. age ≤ 17.
- Show it in the edit form as well as in the list.

Whether "oversubscribed" should count as a **note** in the gate, or only as information, is open (§13). Today's "13 Hinweise" comes from the existing checks.

---

## 9. Texts

- Plurals via the helper (guide §13): Wunsch/Wünsche, Anmeldung/Anmeldungen, Workshop/Workshops, Platz/Plätze, Hinweis/Hinweise.
- Ages: "ab {min} J." when the max is ≥ 99, otherwise "{min}–{max} J.".
- Times: "Sa. 11:30" (no "Uhr", no comma after the weekday). Use this one format everywhere on the page; before, both "Sa., 11:30 Uhr" and "Sa. 11:30" appeared.

---

## 10. Data fixes

| Problem | Fix |
|---|---|
| **Keramik** tagged "Erwachsene" but age 5–14 | Correct the record. Then the validation rule (§8) prevents it from happening again |
| **Spielewerkstatt** shows "Tobias Hess, per_p2" | Find out why `per_p2` has no person record (probably missing from the seed). Fix the join. Until then, the fallback "+ 1 unbekannte Person" + note |
| "1 Wünsche", "1 Anmeldungen" | plural helper |
| "18–99 Jahre" | open-range helper |

---

## 11. Breakpoints: Workshops specifics

The general rules are in guide §4. On this page specifically:

| Width | What to look for |
|---|---|
| **390** | **Active tab "Workshops" must be scrolled into view** (it sits last in the primary tabs). Phase card collapsed: "Wahl öffnen" + "Zieltermin: 15. …" on two lines, chevron-only toggle. Key figures 2×2; "noch nicht eingeplant" wraps to two lines. "+ Workshop hinzufügen" below the view tabs. Zielgruppe filter full width. Rows stacked: text → metric → "Bearbeiten" |
| **640** | Key figures 2×2. Rows: text + metric side by side, "Bearbeiten" below on the right |
| **768** | Key figures 4 in a row. Rows: text, metric and "Bearbeiten" in one row (text column basis 320px) |
| **1024 / 1280** | Content `max-w-5xl`, centred |

Mockups: `nachher-390.html` … `nachher-1280.html`, `stepper-390.html` (vertical stepper).

---

## 12. Print: Workshops specifics

General rules: guide §5. On this page:
- **Filter line** under the H1: "Ansicht: Workshops · Zielgruppe: {Alle|Kinder|Erwachsene}{ · nur nicht eingeplante} · {n} Workshops".
- **Phase card** expanded with the stage-2 panel text, no buttons.
- **Key figures** in one row (33 · 12 · 14 · 6).
- **List heading** "Workshops (33)". Continuation pages "Workshops (33) · Fortsetzung".
- Rows: name, description, slot/warning chip, audience · age · equipment · Leitung in one wrapped meta line, inline notes; right column: "0/10 zugeordnet", bar (`print-color-adjust: exact`), wishes line.
- Mockup pagination: page 1 = header + 7 workshops, then 12 per page → 4 pages (`nachher-druck-a4.html`).

---

## 13. Open questions (Workshops)

1. **Vote running:** which stage is current while the vote is open? Possibly a fifth state ("Wahl läuft · endet am …").
2. **Stage 1 → 2:** automatic once workshops exist, or an explicit action? Assumed: automatic.
3. **Final confirmation** for "Ergebnis festlegen": always, never, or only without a prior notes review?
4. **"Wünsche":** all ranks or first choices only? This affects "mehr Wünsche als Plätze" and "x Wünsche für y Plätze".
5. **Oversubscribed workshops:** should they count as notes in the gate, or only as information?
6. **Key figure 3:** keep "32 automatische Zuordnung" or switch to "14 mehr Wünsche als Plätze"?
7. **Panel copy** for stages 1, 3, 4 is a proposal.

---

## 14. Checklist for this page

Global and component work is in guide §18. These are the **Workshops-specific** steps once the components exist. Each step: code · Storybook example stories (`…/Example: Workshops`) · feature docs, if any.

- [ ] Section band entries + rename "Workshops" → "Übersicht" (§3)
- [ ] Page header: H1 "Workshops", no eyebrow, no H2 (§3)
- [ ] Phase card: 4 stages, sub-lines, panel copy, actions, storage key (§4)
- [ ] Notes gate in stage 3 incl. server-side acknowledgement (§4.3)
- [ ] Key figures 1–4 incl. the warning filter tile (§5)
- [ ] View tabs, create action, Zielgruppe filter with counts, quick filter, result count (§6)
- [ ] Row mapping incl. exception chip, metric column, notes (§7)
- [ ] Shared workshop check function + validation rule (§8)
- [ ] Text formats: plurals, ages, times (§9)
- [ ] Data fixes Keramik, `per_p2` (§10)
- [ ] Active tab scrolled into view on phones; check all widths (§11)
- [ ] Print: filter line, pagination, `print-color-adjust` (§12)
- [ ] Storybook: Workshops example stories for phase card (all states), key figures, toolbar, rows (Keramik, Bandprobe, Zirkus, Spielewerkstatt cover all row variants)
- [ ] Decide the open questions (§13)
