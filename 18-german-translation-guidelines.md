# 18 — German translation guidelines

English is the source language for code, configuration, and technical
documentation. German is the default language for attendee-facing copy. This
document is the source of truth for German wording; translations should not be
literal when a more natural German phrase is clearer.

## 1. Voice and tone

- Address attendees with **Du**, **dir**, and **dein**, never **Sie**, **Ihnen**,
  or **Ihr**.
- Use a warm, calm, practical tone. Sound like a helpful organiser, not a
  government form or a marketing campaign.
- Prefer short sentences and familiar words. Explain a necessary technical
  term rather than exposing it.
- Be direct about actions: **Speichern**, **Ändern**, **Weiter**, **Zurück**.
- Avoid exclamation marks, alarmist language, blame, and unexplained jargon.
- Use inclusive language naturally. Prefer **Teilnehmende** where a group is
  meant; use **Teilnehmer** when the singular term is required by the context.

## 2. Canonical domain terms

These translations are intentional and should remain consistent across screens,
emails, notifications, and help text.

| English source term | German attendee-facing term | Notes |
|---|---|---|
| occasion | **Ereignis** | The real-world thing being planned; distinguish it from a log event by context |
| attendee | **Teilnehmer** | Use **Teilnehmende** for a gender-neutral plural or group label |
| person | **Person** | A person record; do not translate as *Teilnehmer* unless addressing the attendee |
| family | **Familie** | A domain grouping; retain when the family itself is meant |
| party | **Gruppe** | A solver grouping; never expose *Partei* |
| room | **Zimmer** | |
| bed | **Bett** | |
| place | **Schlafplatz** | A generated place in a bed or room |
| workshop | **Workshop** | Familiar and preferred over *Arbeitsgruppe* |
| slot | **Zeitslot** | Use **Zeitfenster** in prose when *Zeitslot* feels too technical |
| preference | **Wunsch** | Use **Angabe** when it is not a preference or choice |
| constraint | **Vorgabe** | Use **Regel** only when explaining behaviour informally |
| label | **Angabe** | Do not expose the storage term *Label* to attendees |
| plan | **Einteilung** | The generated room/workshop result |
| publish | **Veröffentlichen** | For making an approved plan visible |
| pending | **Noch nicht veröffentlicht** | Prefer this phrase over a literal technical translation |
| admin | **Organisationsteam** | Use **Admin** only in technical or internal documentation |
| attendee view | **Teilnehmeransicht** | The attendee-facing surface |

## 3. CQRS and technical language

The English word **event** is reserved in the technical model for an entry in
the append-only event log. In German, both `event` and `occasion` translate to
**Ereignis**. Disambiguate through context: **Ereignis im Ereignisprotokoll**
for CQRS events and **das Ereignis** for the real-world thing.

Attendee-facing text should normally hide both concepts. Say **Deine Angaben**,
**Deine Einteilung**, or **die Veranstaltung**, depending on meaning. Never show
`event`, `event log`, `projection`, `solver`, `constraint`, or internal IDs in
attendee copy unless a support or debugging screen explicitly requires them.

## 4. Grammar and formatting

- Capitalise nouns according to German rules: **Deine Angaben**, **Ein Zimmer**.
- Use the informal possessives consistently: **dein**, **deine**, **deinem**.
- Use German quotation marks only where quotation is necessary: „…“.
- Use a non-breaking space before `%`, but no space before `!` or `?`.
- Format dates as `30.04.2027` in attendee copy. Include the weekday when it
  helps orientation: **Freitag, 30.04.2027**.
- Use the German decimal comma and a non-breaking space before currency:
  **103,00 €**.
- Keep names, room names, workshop titles, and user-entered text unchanged.

## 5. Preferred examples

| Avoid | Prefer |
|---|---|
| Bitte wählen Sie Ihre Präferenzen | **Bitte gib Deine Wünsche an** |
| Familienportal | **Teilnehmeransicht** |
| Event-Profil | **Ereignisprofil** for configuration; **Veranstaltung** for the occasion |
| Constraint | **Vorgabe** |
| Deine Präferenzen wurden gespeichert! | **Deine Angaben wurden gespeichert.** |
| Fehler: Invalid input | **Diese Angabe ist nicht gültig.** |
| Submit | **Speichern** or **Weiter**, depending on the action |

When English and German concepts are ambiguous, resolve the ambiguity in the
copy rather than adding an English technical word. A translation is successful
when an attendee understands what to do without knowing the application's
internal model.
