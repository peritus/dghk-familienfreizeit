# Workshop rankings

The ranking module stores a person's ordered choices for the current workshop
choice cycle. Each choice is a structured `{ workshop_id, rank }` value, not a
free-text title and not a slot or schedule identity. A no-preference value is
explicitly supported by the active profile.

The module filters choices using current workshop eligibility and exposes a sorted
demand summary to attendance assignment. The configured maximum rank is three for
Familienfreizeit 2027. Ranking facts remain independent from later schedule and
allocation communication scopes.
