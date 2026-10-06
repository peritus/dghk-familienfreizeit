# German translation guidelines

English is the source language for code, configuration, and technical
documentation. German is the default language for family-facing copy. This
document is the source of truth for German wording; translations should not be
literal when a more natural German phrase is clearer.

## 1. Voice and tone

- Address families with **Du**, **Dir**, and **Dein**, never **Sie**, **Ihnen**,
  or **Ihr**. Capitalise the polite-informal forms consistently in family copy.
- Use a warm, calm, practical tone. Sound like a helpful organiser, not a
  government form or a marketing campaign.
- Prefer short sentences and familiar words. Explain a necessary technical
  term rather than exposing it.
- Be direct about actions: **Speichern**, **Ändern**, **Weiter**, **Zurück**.
- Avoid exclamation marks, alarmist language, blame, and unexplained jargon.
- Use inclusive language naturally. Use **Familie** for the authenticated family
  account, **Person** for an individual human, and **Familienmitglied** when the
  family relationship matters. Use **Teilnehmende** only for people taking part
  in a workshop or other activity.

## 2. Canonical domain terms

These translations are intentional and should remain consistent across screens,
emails, notifications, and help text.

| English source term | German family-facing term | Notes |
|---|---|---|
| occasion | **Veranstaltung** | The real-world family weekend or other occasion being planned |
| event-log event | **Ereignis** | An entry in the append-only event log |
| event log | **Ereignisprotokoll** | The persisted log of domain events |
| person | **Person** | The canonical individual domain entity |
| people | **Personen** | A group of individual people |
| family | **Familie** | The authenticated account and domain grouping |
| family member | **Familienmitglied** | Use when the relationship to the family matters |
| room | **Zimmer** | |
| bed | **Bett** | |
| place | **Schlafplatz** | A generated place in a bed or room |
| workshop | **Workshop** | Familiar and preferred over *Arbeitsgruppe* |
| workshop participant | **teilnehmende Person** | Use **Teilnehmende** for a group taking part in a workshop |
| slot | **Zeitslot** | Use **Zeitfenster** in prose when *Zeitslot* feels too technical |
| preference | **Wunsch** | Use **Angabe** when it is not a preference or choice |
| constraint | **Vorgabe** | The calculated effect of a fixed resolver mechanism and the relevant Angaben; use **Regel** only when explaining behaviour informally |
| organiser decision | **Entscheidung des Organisationsteams** | A human planning decision that guides the calculated result |
| organiser decision note | **Zusätzliche Informationen** | Optional context; the token itself needs no second name |
| label | **Angabe** | Do not expose the storage term *Label* in family copy |
| set a label | **Eine Angabe machen** / **Angabe ändern** | Use for a family-facing action; organiser screens may say **Entscheidung hinzufügen** |
| clear a label | **Eine Angabe aufheben** | Use when removing an existing family-facing Angabe; do not expose *LabelCleared* |
| plan | **Einteilung** | The generated room/workshop result |
| communicate | **An Familien kommunizieren** | Open the selected-scope review; final action: Jetzt an Familien kommunizieren |
| communicated | **An Familien kommuniziert** | Visible in family views; email delivery is separate |
| release control | **Freigabesteuerung** | Technical mechanism; organiser navigation uses Kommunikation |
| draft changes | **Änderungsentwürfe** | Browser-local changes awaiting application; other organisers cannot yet see them |
| start drafting mode | **Entwurfsmodus starten** | The organiser control for deferring the ordinary Apply command |
| drafting mode active | **Entwurfsmodus aktiv** | State text for the enabled local commit-timing policy |
| immediate mode | **Änderungen werden sofort angewendet** | Explanation for the default policy |
| draft workspace | **Entwurfsbereich** | The shared organiser area for browser-local draft changes |
| discard drafts | **Entwürfe verwerfen** | Removes all local draft events without contacting the server |
| apply drafts | **Änderungen speichern** | Starts the ordinary Worker append for the current draft batch; use "speichern" everywhere in the flow (button, confirmation, status, screen-reader announcements) rather than "anwenden," which reads as developer language |
| uncommunicated | **Noch nicht an Familien kommuniziert** | Applied changes not yet made visible to families through Communicate |
| organiser | **organisierende Person** | One person acting on behalf of the organisation team |
| organisation team | **Organisationsteam** | The collective group responsible for organising the occasion |
| member of the organisation team | **Mitglied des Organisationsteams** | Use for one person when the team relationship matters |
| family view | **Familienansicht** | The view where a family sees and edits its own data |
| organisation team view | **Ansicht des Organisationsteams** | The view where the organisation team manages the occasion |
| report | **Übersicht** | The generic browser and print view derived from the current world |
| overview | **Übersicht** | Use for a summary-style report title |
| list | **Liste** | Use only when the output is genuinely a list, such as a workshop roster |
| shared report | **gemeinsame Übersicht** | A coordination view available to more than one family |
| family report | **Familienübersicht** | A view containing one family's own information |
| accommodation requirement | **Anforderung** | A family or person's room requirement; show its strength as **erforderlich** or **Wunsch** |
| required | **erforderlich** | The hard strength of an accommodation requirement |
| room feature | **Merkmal** | A feature provided by a room; use **Merkmale** for the room editor heading |
| accessible room | **Barrierearmes Zimmer** | The family requirement; the room feature itself is **Barrierearm** |
| do not share a room | **Zimmer nicht teilen** | Organiser-facing private-room requirement |
| share a room | **Zimmer teilen** | Family-facing wording; do not replace it with *Eigenes Zimmer* |
| free sleeping places | **Freie Schlafplätze** | Board statistic; use **Platz/Plätze** in capacity sentences |
| fixed assignment | **Fest zuordnen** / **Fest zugeordnet** | Organiser action and resulting state |
| remove fixed assignment | **Zuordnung aufheben** | Organiser action |
| without a room | **Ohne Zimmer** | A family with no resulting room |
| without a matching room | **Ohne passendes Zimmer** | A family for which hard room requirements prevent a match |

## 3. CQRS and technical language

The English word **event** is reserved in the technical model for an entry in
the append-only event log. In German, use **Ereignis** for that log entry and
**Veranstaltung** for the real-world occasion.

Family-facing text should normally hide technical concepts. Say **Deine Angaben**,
**Deine Einteilung**, or **die Veranstaltung**, depending on meaning. Never show
`event`, `event log`, `projection`, `solver`, `constraint`, or internal IDs in
family copy unless a support or debugging screen explicitly requires them.

**Vorgabe** describes the constraint that the application calculates from an
Angabe and the fixed resolver configuration. It is not a separate object that a
family or organising person defines. An organiser's human planning action is an
**Entscheidung des Organisationsteams**; the resulting concrete data is still an
Angabe in the event log.

## 4. Grammar and formatting

- Capitalise nouns according to German rules: **Deine Angaben**, **Ein Zimmer**.
- Use the informal possessives consistently: **Dein**, **Deine**, **Deinem**.
- Use German quotation marks only where quotation is necessary: „…“.
- Use a non-breaking space before `%`, but no space before `!` or `?`.
- Format dates as `30.04.2027` in family copy. Include the weekday when it
  helps orientation: **Freitag, 30.04.2027**.
- Use the German decimal comma and a non-breaking space before currency:
  **103,00 €**.
- Keep names, room names, workshop titles, and user-entered text unchanged.
- Get the singular right: a count-driven sentence must read "1 Änderung", not
  "1 Änderungen". Use `Intl.PluralRules('de')` (or an equivalent small
  helper) rather than hand-rolled `count === 1` checks scattered across
  components, and apply the same fix to any `aria-label` that repeats the
  count.

## 5. Preferred examples

| Avoid | Prefer |
|---|---|
| Bitte wählen Sie Ihre Präferenzen | **Bitte gib Deine Wünsche an** |
| Bericht | **Übersicht** |
| Workshop roster | **Teilnehmendenliste** |
| Constraint | **Vorgabe** |
| Deine Präferenzen wurden gespeichert! | **Deine Angaben wurden gespeichert.** |
| Fehler: Invalid input | **Diese Angabe ist nicht gültig.** |
| Submit | **Speichern** or **Weiter**, depending on the action |

When English and German concepts are ambiguous, resolve the ambiguity in the
copy rather than adding an English technical word. A translation is successful
when a family understands what to do without knowing the application's internal
model.
