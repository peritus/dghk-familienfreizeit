# 10 — Family view

The screen plans are [family preferences](ui/03-family-preferences.md) and
[family assignment](ui/04-family-assignment.md). They are
English planning examples; family copy follows [the translation guidelines](18-german-translation-guidelines.md).

One email per family. One login. One page before publication, a different page
after.

The design constraint that shapes everything: **families state preferences and
never see machinery.** No scores, no parties, no solver, no other families'
preferences. The word "algorithm" does not appear anywhere in this interface.

The family view derives the plan selected by the latest publication ([architecture](01-architecture.md)),
which settles the largest privacy question structurally: a family's view is
computed from the events before the latest publication, so unpublished work is not
hidden from them, it is simply not in the list they derive from.

The Worker performs that derivation and returns only the signed-in family's view
(`GET /api/family/view`), filtered by the boundaries in §2. The event log never
reaches a family's browser, and the family view bundle contains neither the solver nor
the organiser screens.

---

## 1. Two states

### Before publication — the preferences page

One scrolling page, not a wizard. A wizard implies a one-time completion; this is
a form people will return to three times over six weeks as they change their
minds. Everything saves on change.

Sections 2 ("Zimmerwünsche") and 3 ("Mit wem möchtest Du zusammen?") are
**generated from the active occasion profile**: every tag declaring
`family_facing` produces a control, in the sections the profile configures. The
mock-up below is explanatory only; no occasion-specific form is hard-coded here.

The page, its sections, the closed `control` union, and the save-on-change contract
are specified by the [family preferences](20.9-family-preferences.md) module. A tag
that reuses an existing control needs no family view code.

```
Willkommen, Familie Müller

  Dein Zimmer wird vom Organisationsteam eingeteilt.
  Deine Angaben kannst Du bis zum 20. September ändern.

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
                      Freitext — das Organisationsteam liest mit.

  ─────────────────────────────────────────────────
  3  MIT WEM MÖCHTEST DU ZUSAMMEN?
  ─────────────────────────────────────────────────
  Familie Schmidt     ✓ möchte auch mit Dir
  Familie Weber       — noch keine Antwort
  [ Familie suchen… ]

  ─────────────────────────────────────────────────
  4  WORKSHOPS
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
  Deine Zimmer

  ┌──────────────────────────────────────────────┐
  │  Haus B · Raum 14 · 1. Stock                 │
  │  Eigenes Bad                                 │
  │                                              │
  │  Anna Müller      Bett 14-A                  │
  │  Kai Müller       Bett 14-A                  │
  │  Jonas Müller     Bett 14-B (oben)           │
  │  Emma Müller      Bett 14-C (unten)          │
  │  Mia Müller       bei den Eltern             │
  │                                              │
  │  Du teilst das Zimmer mit Familie Schmidt.   │
  └──────────────────────────────────────────────┘

  Deine Workshops
  Samstag Vormittag   Anna: Töpfern · Kai: Klettern ·
                      Jonas: Klettern · Emma: Basteln
  Samstag Nachmittag  …
```

The print stylesheet matters more than it sounds. People will print this and put
it on the fridge, and several will arrive at the hostel with it on paper because
the signal there is bad. There is no print button and no PDF export (D21): families
print with the browser, and the page's print stylesheet meets the same rules as a
report's ([reports](19-reports.md) §5).

---

## 2. Privacy boundaries

Decided explicitly, because the defaults are wrong in both directions. The rows
below are the ones that need deciding; anything about *when* something becomes
visible is already answered by the latest publication, and needs no rule.

| Data | Visible to the family? |
|---|---|
| Their own people and preferences | Yes |
| Their own co-room requests | No — deferred with sleeping parties |
| **Whether a co-room request is reciprocated** | **No — deferred with sleeping parties** |
| Other families' room preferences | No |
| Other families' co-room requests, including ones naming them | **No** |
| Names of families sharing their room | Yes |
| Bed labels within their own rooms | Yes |
| Scores, parties, traces, organiser constraints | No |
| Organiser notes about them | **No** — free text is theirs, organiser notes are not |
| Tags declaring `organiser_only` | **Never**, regardless of `family_facing` |
| `descriptive` tags | Never |

**Reciprocity is visible; the request is not.** If the Müllers request the
Schmidts, the Müllers see "noch keine Antwort" until the Schmidts request them
back, at which point both see "✓". The Schmidts are *not* notified that the
Müllers asked.

This asymmetry is deliberate. Showing the incoming request creates social
pressure to reciprocate, which produces merges nobody wanted and is exactly the
dynamic that makes people dread these forms. Showing only mutual matches means a
request costs nothing socially and the data stays honest.

Cross-family co-room requests are deferred with sleeping parties. The initial family
view exposes only preferences that constrain the family's own placement unit.

**Organiser notes are separate from family free text.** The family's "Sonst noch
etwas?" box is theirs and they can see it. If an organiser wants to write "phoned,
they're flexible about the ensuite", that goes in an organiser-only note field.
Conflating them means either organisers self-censor or families read something they
should not have.

`apart-from` declares no `family_facing` *and* `organiser_only: true`, deliberately
doubled, because exposing keep-apart relations to families would be the worst
privacy failure available to this application.

---

## 3. Interaction details

**Everything saves on change.** No save button, no draft state. A radio click
emits a `LabelSet` (or `LabelCleared`) and shows an inline confirmation:
*"Gespeichert um 14:22."* Families in their forties on a phone in a kitchen will
not find a save button at the bottom of a long page, and losing their input
once means they will not come back.

**One request per change, and the response is the truth.** Each control posts its
label event as it changes and renders the confirmation from the response. A failed
save returns the control to its stored state and says so in plain words; nothing is
queued in the browser, so what a family sees is what was saved. Keep the family view
bundle small and test it on an old, slow phone — that is the device it will meet.

**Age is computed and shown.** "Jonas (9)" uses the age at the occasion date, not
today. If a child turns 9 the week before, they are shown as 9 throughout, which
matches what workshop age bounds will do and avoids a confusing mismatch.

**Ineligibility is explained, not hidden.** A control that does not apply to a
person, such as "Schläft bei den Eltern" for an adult, is disabled with the reason
next to it, not removed. A missing option makes people
think the site is broken; a disabled option with a reason answers the question
before they ask. This is now driven by `valid_for` — a control whose predicate
fails renders disabled with the reason.

**Workshop ranking is drag-to-order on desktop and numbered selects on mobile.**
The same underlying data. Do not build a mobile drag interaction; numbered
dropdowns are less elegant and more reliable, and this form will mostly be filled
in on phones.

**The deadline is stated everywhere and enforced softly.** After it, the page
becomes read-only with *"Änderungen bitte an das Organisationsteam."* plus the
contact address. Hard-blocking late changes just moves the work to email, which
is where it was before this application existed.

---

## 4. Emails

Invitation and reminder emails are kernel; publication and change emails are
contributed by [change notifications](20.10-change-notifications.md).

Four kinds. All plain, all short, all with the link.

**Invitation.** One paragraph on what the weekend is, one on what they need to
do, one button. The magic link is the invitation — there is no separate account
creation.

**Reminder.** Sent by an organiser from the chase list. Names what is missing
specifically: *"Für Emma fehlen noch die Workshop-Wünsche."* A generic reminder
gets ignored; a specific one gets acted on.

**Publication.** The assignment in the body of the email, not only behind a link.
People forward this to grandparents and read it on trains.

**Change.** Only to affected families, only what changed:

> Deine Einteilung hat sich geändert.
>
> Vorher:  Haus A · Raum 01
> Jetzt:   Haus B · Raum 14 · mit eigenem Bad
>
> [ Details ansehen ]

Computed from the plan diff. A family whose assignment did not change receives
nothing — which is what makes re-publication socially acceptable rather than a
thing that trains people to ignore your emails.

---

## 5. Copy principles for this surface

Different audience from the organiser UI. Families are non-technical, mildly anxious
about where their children will sleep, and reading on a phone.

**Say what will happen and when.** "Dein Zimmer wird vom Organisationsteam
eingeteilt" appears at the top of the preferences page, because the first
question every person has is whether they are choosing or requesting.

**Never expose the model's vocabulary.** No "party", no "place", no "assignment
run". A family has a *Zimmer* and *Wünsche*.

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
