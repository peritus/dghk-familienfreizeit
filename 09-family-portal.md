# 09 — Family portal

One email per family. One login. One page before publication, a different page
after.

The design constraint that shapes everything: **families state preferences and
never see machinery.** No scores, no parties, no solver, no other families'
preferences, no draft plans. The word "algorithm" does not appear anywhere in
this interface.

---

## 1. Two states

### Before publication — the preferences page

One scrolling page, not a wizard. A wizard implies a one-time completion; this is
a form people will return to three times over six weeks as they change their
minds. Everything saves on change.

Sections 2 ("Zimmerwünsche"), 3 ("Kinderzimmer") and 4 ("Mit wem möchten Sie
zusammen?") are **generated from the active event profile**: every tag declaring
`familyFacing` produces a control, in profile order, grouped by scope. The
mock-up below is explanatory only; no event-specific form is hard-coded here.

`control` is a closed union, and this is the thing to think about up front —
see [event profiles](15-event-profiles.md) §6:

| `control` | Renders | Writes |
|---|---|---|
| `tri-state` | three radios — unbedingt / gerne / egal | strength `required`, `preferred`, or `LabelCleared` |
| `toggle` | one checkbox | `LabelSet` with no strength, or `LabelCleared` |
| `family-picker` | searchable family list, multi-select | one `LabelSet` per selection, `value` = family id |
| `person-picker` | people within the same family | one `LabelSet` per selection, `value` = person id |

Adding a tag that reuses an existing control is a **one-file change**; adding a
*new kind* of control is two files.

`invert: true` on `sole-occupancy` flips the labels so the portal reads
"Zimmer teilen: gerne / lieber nicht / auf keinen Fall" while the stored tag
stays positively named. Presentation only.

```
Willkommen, Familie Müller

  Ihr Zimmer wird von den Organisatoren eingeteilt.
  Ihre Angaben können Sie bis zum 20. September ändern.

  ─────────────────────────────────────────────────
  1  WER KOMMT MIT
  ─────────────────────────────────────────────────
  Anna Müller          Erwachsene      38
  Kai Müller           Erwachsener     41
  Jonas Müller         Kind             9
  Emma Müller          Kind             6
  Mia Müller           Baby             0   schläft bei den Eltern

  [ Person hinzufügen ]     Stimmt etwas nicht? [ Melden ]

  ─────────────────────────────────────────────────
  2  ZIMMERWÜNSCHE
  ─────────────────────────────────────────────────
  Eigenes Bad         ( ) unbedingt  (•) gerne  ( ) egal
  Drinnen schlafen    (•) unbedingt  ( ) gerne  ( ) egal
  Zimmer teilen       (•) gerne mit einer anderen Familie
                      ( ) lieber nicht
                      ( ) auf keinen Fall

  Sonst noch etwas?   [                                    ]
                      Freitext — die Organisatoren lesen mit.

  ─────────────────────────────────────────────────
  3  KINDERZIMMER
  ─────────────────────────────────────────────────
  Kinder können gemeinsam in einem Kinderzimmer schlafen,
  ohne Erwachsene. Es gibt Zimmer für 8–14 Jahre.

  Jonas (9)   [x] möchte ins Kinderzimmer
  Emma (6)    [ ] möchte ins Kinderzimmer   — noch zu jung für die
                  vorhandenen Kinderzimmer

  ─────────────────────────────────────────────────
  4  MIT WEM MÖCHTEN SIE ZUSAMMEN?
  ─────────────────────────────────────────────────
  Familie Schmidt     ✓ möchte auch mit Ihnen
  Familie Weber       — noch keine Antwort
  [ Familie suchen… ]

  ─────────────────────────────────────────────────
  5  WORKSHOPS
  ─────────────────────────────────────────────────
  Samstag Vormittag
    Anna    1. Töpfern   2. Kochen    3. —
    Kai     1. Klettern  2. Töpfern   3. —
    Jonas   1. Klettern  2. Bogen     3. Töpfern
    Emma    noch nichts gewählt  ⚠
  …
```

### After publication — the assignment page

The preferences collapse to a read-only summary; the assignment takes the top.

```
  Ihre Zimmer

  ┌──────────────────────────────────────────────┐
  │  Haus B · Raum 14 · 1. Stock                 │
  │  Eigenes Bad                                 │
  │                                              │
  │  Anna Müller      Bett 14-A                  │
  │  Kai Müller       Bett 14-A                  │
  │  Emma Müller      Bett 14-C (unten)          │
  │  Mia Müller       bei den Eltern             │
  │                                              │
  │  Sie teilen das Zimmer mit Familie Schmidt.  │
  └──────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────┐
  │  Kinderzimmer K3 · Haus B · Raum 22          │
  │                                              │
  │  Jonas Müller     Bett 22-D (oben)           │
  │                                              │
  │  Mit 4 weiteren Kindern.                     │
  └──────────────────────────────────────────────┘

  Ihre Workshops
  Samstag Vormittag   Anna: Töpfern · Kai: Klettern ·
                      Jonas: Klettern · Emma: Basteln
  Samstag Nachmittag  …

  [ Als PDF speichern ]
```

The print stylesheet matters more than it sounds. People will print this and put
it on the fridge, and several will arrive at the hostel with it on paper because
the signal there is bad.

---

## 2. Privacy boundaries

Decided explicitly, because the defaults are wrong in both directions.

| Data | Visible to the family? |
|---|---|
| Their own people and preferences | Yes |
| Their own co-room requests | Yes |
| **Whether a co-room request is reciprocated** | **Yes — see below** |
| Other families' room preferences | No |
| Other families' co-room requests, including ones naming them | **No** |
| Names of families sharing their room, after publication | Yes |
| Names of children in their child's children's room, after publication | Yes |
| Bed labels within their own rooms | Yes |
| Any draft plan | No |
| Scores, parties, traces, admin constraints | No |
| Admin notes about them | **No** — free text is theirs, admin notes are not |
| Tags declaring `adminOnly` | **Never**, regardless of `familyFacing` |
| `descriptive` tags | Never |

**Reciprocity is visible; the request is not.** If the Müllers request the
Schmidts, the Müllers see "noch keine Antwort" until the Schmidts request them
back, at which point both see "✓". The Schmidts are *not* notified that the
Müllers asked.

This asymmetry is deliberate. Showing the incoming request creates social
pressure to reciprocate, which produces merges nobody wanted and is exactly the
dynamic that makes people dread these forms. Showing only mutual matches means a
request costs nothing socially and the data stays honest.

The cost: two families who each want to room together but neither goes first will
never match. Accepted. The admin party review screen surfaces one-sided requests,
and a human can make the phone call — which is the right tool for that problem.

**Admin notes are separate from family free text.** The family's "Sonst noch
etwas?" box is theirs and they can see it. If an admin wants to write "phoned,
they're flexible about the ensuite", that goes in an admin-only note field.
Conflating them means either admins self-censor or families read something they
should not have.

`apart-from` declares no `familyFacing` *and* `adminOnly: true`, deliberately
doubled, because exposing keep-apart relations to families would be the worst
privacy failure available to this application.

---

## 3. Interaction details

**Everything saves on change.** No save button, no draft state. A radio click
emits a `LabelSet` (or `LabelCleared`) and shows an inline confirmation:
*"Gespeichert um 14:22."* Families in their forties on a phone in a kitchen will
not find a save button at the bottom of a long page, and losing their input
once means they will not come back.

**Progressive enhancement throughout.** Every control is inside a real `<form>`
that works with JavaScript disabled, posting and redirecting. htmx intercepts to
swap fragments in place. This is not principle for its own sake — it is the
cheapest way to be sure the form works on whatever ancient Android tablet
someone uses.

**Age is computed and shown.** "Jonas (9)" uses the age at the event date, not
today. If a child turns 9 the week before, they are shown as 9 throughout, which
matches what the children's-room banding will do and avoids a confusing
mismatch.

**Ineligibility is explained, not hidden.** Emma's children's-room checkbox is
disabled with the reason next to it, not removed. A missing option makes people
think the site is broken; a disabled option with a reason answers the question
before they ask. This is now driven by `validFor` — a control whose predicate
fails renders disabled with the reason.

**Workshop ranking is drag-to-order on desktop and numbered selects on mobile.**
The same underlying data. Do not build a mobile drag interaction; numbered
dropdowns are less elegant and more reliable, and this form will mostly be filled
in on phones.

**The deadline is stated everywhere and enforced softly.** After it, the page
becomes read-only with *"Änderungen bitte an die Organisatoren."* plus the
contact address. Hard-blocking late changes just moves the work to email, which
is where it was before this application existed.

---

## 4. Emails

Four kinds. All plain, all short, all with the link.

**Invitation.** One paragraph on what the weekend is, one on what they need to
do, one button. The magic link is the invitation — there is no separate account
creation.

**Reminder.** Sent by an admin from the chase list. Names what is missing
specifically: *"Für Emma fehlen noch die Workshop-Wünsche."* A generic reminder
gets ignored; a specific one gets acted on.

**Publication.** The assignment in the body of the email, not only behind a link.
People forward this to grandparents and read it on trains.

**Change.** Only to affected families, only what changed:

> Ihre Zimmereinteilung hat sich geändert.
>
> Vorher:  Haus A · Raum 01
> Jetzt:   Haus B · Raum 14 · mit eigenem Bad
>
> Jonas bleibt im Kinderzimmer K3.
>
> [ Details ansehen ]

Computed from the plan diff. A family whose assignment did not change receives
nothing — which is what makes re-publication socially acceptable rather than a
thing that trains people to ignore your emails.

---

## 5. Copy principles for this surface

Different audience from the admin UI. Families are non-technical, mildly anxious
about where their children will sleep, and reading on a phone.

**Say what will happen and when.** "Ihr Zimmer wird von den Organisatoren
eingeteilt" appears at the top of the preferences page, because the first
question every person has is whether they are choosing or requesting.

**Never expose the model's vocabulary.** No "party", no "place", no "assignment
run". A family has a *Zimmer*; children go to a *Kinderzimmer*; they have
*Wünsche*.

**Preference strength in plain words.** "unbedingt / gerne / egal" rather than
"required / preferred / indifferent". The three-way distinction is the most
important thing the form collects and the labels have to make the difference
obvious without explanation.

**Anxiety-reducing defaults.** "Zimmer teilen: gerne mit einer anderen Familie"
is pre-selected because most families are fine with it and the ones who are not
will change it. Defaulting to "auf keinen Fall" would make the plan infeasible
through inertia.

**No progress bars, no gamification, no "You're 60% done!"** This is a form about
where your family sleeps, not an onboarding funnel.
