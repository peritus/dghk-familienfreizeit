# Family view

The screen plans are [family preferences](../ui/screens/family-preferences.md) and
[family assignment](../ui/screens/family-assignment.md). They are
English planning examples; family copy follows [the translation guidelines](../ui/german-translation-guidelines.md).

One email per family. One login. A family can review its current information and
communicated arrangements on the same page. The design constraint is that families
state preferences and never see machinery: no scores, solver language, organiser
notes or other families' preferences.

The Worker returns the signed-in family's server-derived, privacy-projected response
from `GET /api/family/view`. Its composition is defined in [release control](release-control.md)
§2; the event log, full `World`, solver and organiser-only data never reach a family's
browser. Current inputs remain visible whether or not any arrangements have been
communicated.

---

## 1. Information and arrangements

### Current information and controls

One scrolling page, not a wizard. A wizard implies a one-time completion; this is
a form people return to as they change their minds. Everything saves on change.

Section 2 ("Zimmerwünsche") and the later sections are **generated from the
active occasion profile**: every trait declaring
`family_facing` produces a control, in the sections the profile configures.
Selected module-owned participation controls are placed through `module_controls`
as defined by [family preferences](../modules/family-preferences.md). The
mock-up below is explanatory only; no occasion-specific form is hard-coded here.

The page, its sections, the closed `control` union, and the save-on-change contract
are specified by the [family preferences](../modules/family-preferences.md) module. A trait
that reuses an existing control needs no family view code.

```
Willkommen, Familie Müller

  Dein Zimmer wird vom Organisationsteam eingeteilt.
  Deine Angaben kannst Du bis zum 31. März ändern.

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
  Barrierefreies Zimmer ( ) unbedingt ( ) gerne (•) egal
  Zimmer teilen       ( ) gerne mit einer anderen Familie
                      ( ) lieber nicht
                      ( ) auf keinen Fall

  Sonst noch etwas?   [                                    ]
                      Freitext — das Organisationsteam liest mit.

  ─────────────────────────────────────────────────
  3  WORKSHOPS
  ─────────────────────────────────────────────────
  Samstag Vormittag
    Anna    1. Töpfern   2. Kochen    3. —
    Kai     1. Klettern  2. Töpfern   3. —
    Jonas   1. Klettern  2. Bogen     3. Töpfern
    Emma    noch nichts gewählt  ⚠
  …
```

"Person hinzufügen" emits `PersonAdded`; an organiser can add, edit, or
withdraw a person on the family's behalf through the organiser family-detail
screen, writing the identical events (D24;
[events](../architecture/events.md) §"Setup and identity").

### Communicated arrangements

Communicated accommodation and workshop results take the top as they become
available. Each arrangement shows its [`FamilyScopeStatus`](release-control.md) —
`communicated` or `never-communicated`, never `changed` — and, when
`communicated`, can expand an inline before/after diff between its two most
recent communications. Both sides of that diff are already-released facts,
so nothing about a currently-preparing organiser change is disclosed;
current draft/live state never enters this computation. Current preferences
remain accessible and editable. Communication itself does not lock controls,
and a late edit does not alter a communicated arrangement until an organiser
explicitly reviews and publishes a new plan. There is no single before/after
switch for the whole page.

Workshop controls use the communicated candidate and programme scopes: eligible
people rank published official sessions before a schedule exists; scheduled official
offerings later show attendance results. Sign-up workshops offer join/leave controls
and current places remaining, and interest workshops offer a non-binding toggle.
Own responses appear immediately. A pending conflict between a sign-up and a
communicated attendance result is explained in plain words. Uncommunicated
candidate, programme, or schedule details are not offered as choices.

```
  Deine Zimmer

  ┌──────────────────────────────────────────────┐
  │  Haus B · Raum 14 · 1. Stock                 │
  │  Eigenes Bad                                 │
  │                                              │
  │  Anna Müller      Bett 14-A                  │
  │  Kai Müller       Bett 14-A                  │
  │  Jonas Müller     Bett 14-B (oben)           │
  │  Emma Müller      Bett 14-B (unten)          │
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
report's ([reports](reports.md) §5).

---

## 2. Privacy boundaries

Decided explicitly, because the defaults are wrong in both directions. The rows
below specify disclosure; timing is governed separately by
[release control](release-control.md).

| Data | Visible to the family? |
|---|---|
| Their own people and preferences | Yes |
| Other families' room preferences | No |
| Names of families sharing their room | Yes |
| Bed labels within their own rooms | Yes |
| Scores, traces, organiser decisions | No |
| Organiser notes about them | **No** — free text is theirs, organiser notes are not |
| Traits declaring `organiser_only` | **Never**, regardless of `family_facing` |
| Restricted values | Own-family values only where authorised; never shared or other-family |
| `descriptive` traits | Only explicitly family-facing own inputs; internal descriptive facts remain hidden |

Released arrangement fields come from their reviewed `input_seq`; current own-family
answers and permitted live participation remain current. Current names and withdrawal
status may annotate a released arrangement, but never change its historical placement.
The family sees only its own projected diff, never organiser findings, notes, scores,
traces or other-family content.

Cross-family co-room requests are outside the active sleeping model, so the family
view exposes only preferences that constrain the family's own placement unit. When
that idea is adopted, the rule to keep is that only a mutual match is shown: a
one-sided request stays invisible to the family it names, because showing it
creates social pressure to reciprocate and produces merges nobody wanted.

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
before they ask. The trait's `valid_for` evaluator decides: a control whose predicate
fails renders disabled with the reason.

**Workshop ranking is drag-to-order on desktop and numbered selects on mobile.**
The same underlying data. Do not build a mobile drag interaction; numbered

The ranking list contains only sessions eligible for that person in the active
candidate round; it does not require a slot or room.

**Deadlines are stated everywhere and remain advisory.** Accommodation and workshop
sections can show separate upcoming or passed notices with the relevant contact
copy. A passed notice does not disable its controls: families may continue to
update preferences, while organisers decide whether a late change belongs in a
newly reviewed and published plan.

---

## 4. Emails

Invitation and reminder emails are kernel. Communication and change messages are
deferred under [change notifications](../deferred-ideas/change-notifications.md). The recipient
selection and preview contract belongs to [release control](release-control.md)
§8; email does not determine whether arrangements are visible.

**Invitation:** a short explanation of the occasion and what to do, with a magic
link. **Reminder:** names missing answers, such as a person's workshop wishes.
**Communication:** includes the arrangements/details in the body. **Change:** gives
only relevant before/after details and a link, without internal explanations.

Messages are plain and short. Families whose relevant visible content did not
change do not receive a change message.

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

**Anxiety-reducing defaults.** "Zimmer teilen" starts with no answer rather than
"auf keinen Fall". An absent label means indifferent, which is what most families
are; making refusal the default would make the plan infeasible through inertia.

**No progress bars, no gamification, no "You're 60% done!"** This is a form about
where your family sleeps, not an onboarding funnel.
