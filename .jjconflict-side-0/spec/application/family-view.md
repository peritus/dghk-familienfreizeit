# Family view

The screen plans are [family preferences](../ui/screens/family-preferences.md) and
[family assignment](../ui/screens/family-assignment.md). They are
English planning examples; family copy follows [the translation guidelines](../ui/german-translation-guidelines.md).

One email per family. One login. A family can review its current information and
its fixed arrangements on the same page. The design constraint is that families
state preferences and never see machinery: no scores, solver language, organiser
notes or other families' preferences.

The Worker returns the signed-in family's server-derived, privacy-projected response
from `GET /api/family`. Its composition is defined in [phases](../architecture/phases.md)
§6; the event log, full `World`, solver and organiser-only data never reach a family's
browser. Current inputs remain visible whether or not any area has been closed.

---

## 1. Information and arrangements

### Current information and controls

The shared profile-driven inputs, people forms, family display-name correction,
REST resources, target/closed notices and privacy boundary are implemented in
[the family application](../../docs/application/family-view.md). Both apps use
one neutral component with peer adapters; custom family components are not
required for current inputs.

The final family presentation remains one scrolling page rather than a wizard.
It must combine returning editable inputs with the fixed arrangements below.
The shared [family preferences contract](../modules/family-preferences.md)
continues to govern outstanding controls and audience-specific behavior.

### Fixed arrangements

Accommodation and workshop results take the top once their area is closed
([phases](../architecture/phases.md) §6). Each shows the latest closed result for
the family and, when the area has been closed more than once, can expand an inline
before/after comparison between its two most recent closed results. Both sides are
closed results, so nothing about a change the organisers are preparing is
disclosed; the current derivation never enters this comparison. There is no single
before/after switch for the whole page.

Closing an area closes its input controls: they show the saved answers read-only
with the closed-input notice, until the organisers reopen the area. While an area
is open, a late edit remains valid input and changes nothing the family sees until
the area is closed.

Workshop controls appear once workshop choice is open: eligible people rank the
live catalogue before a schedule exists; the closed result later shows each
workshop's time and location. Sign-up workshops offer join/leave controls and
current places remaining, and interest workshops offer a non-binding toggle. Own
responses appear immediately. A conflict between a live sign-up and the closed
attendance result is explained in plain words.

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
[phases](../architecture/phases.md).

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

Fixed arrangements come from the latest closed result; current own-family answers
and permitted live participation remain current. Current names and descriptors are
joined to the closed result, a withdrawn person is not shown, and a referenced
entity that no longer exists is shown as unavailable. The family sees only its own
before/after comparison, never organiser findings, notes, scores, traces or
other-family content.

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

The implemented REST mutation and recovery behavior is described in
[the family application](../../docs/application/family-view.md#rest-resources).
The final family presentation must also give a plain inline success confirmation,
such as “Gespeichert um 14:22.”, and be exercised on representative slow phones.

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

The ranking list contains only workshops eligible for that person in the current
choice cycle; it does not require a slot or room.

Target dates, late copy and closed-input notices are implemented in
[the shared current-input interface](../../docs/application/family-view.md#shared-presentation-and-adapters).
The final arrangement presentation must preserve these notices.

---

## 4. Emails

Invitation and reminder emails are kernel. Initial and change messages are
deferred under [change notifications](../deferred-ideas/change-notifications.md), which
selects recipients from closing events; email does not determine whether
arrangements are visible.

**Invitation:** a short explanation of the occasion and what to do, with a magic
link. **Reminder:** names missing answers, such as a person's workshop wishes.
**Initial:** includes the fixed arrangements in the body. **Change:** gives
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
