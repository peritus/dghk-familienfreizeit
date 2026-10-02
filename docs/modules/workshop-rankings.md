# Workshop rankings

The ranking module stores a person's ordered choices for the current workshop
choice cycle. Each choice is a structured `{ workshop_id, rank }` value, not a
free-text title and not a slot or schedule identity. A no-preference value is
explicitly supported by the active profile.

The module filters choices using current workshop eligibility and exposes a sorted
demand summary to attendance assignment. The configured maximum rank is three for
Familienfreizeit 2027. Ranking facts remain independent from later schedule and
allocation communication scopes.

## Workshop allocation projection

The organiser allocation projection is derived in memory from the event-folded world,
the scheduling output, and the workshop-assignment solver section. It exposes the three
URL-backed views shown in the German UI as **Wünsche · Antworten**, **Wünsche · Nachfrage**,
and **Wünsche · Verlauf**. Answers preserve explicit no-preference and no-response
states; demand combines first-choice and ranked counts with configured capacity and
placement; trace stages preserve solver reasons, retention, drops, fixed violations,
and unassigned outcomes. The projection adds no folded table, relationship store, or
screen-local domain rule. It is recalculated for the prospective local-first world so
unapplied organiser drafts are visible immediately.
