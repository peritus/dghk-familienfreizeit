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
the scheduling output, and the workshop-assignment solver section. It exposes three
allocation views shown in the German UI as **Wünsche · Antworten**, **Wünsche · Nachfrage**,
and **Wünsche · Verlauf**, plus the **Teilnahme · Personen** overview. Answers preserve explicit no-preference and no-response
states; demand combines first-choice and ranked counts with configured capacity and
placement; trace stages preserve solver reasons, fixed violations,
and unassigned outcomes. The trace presenter reads the solver's round snapshots
and adds only display labels; it does not reconstruct assignment events. The
projection adds no folded table, relationship store, or screen-local domain
rule. It is recalculated for the prospective local-first world so unapplied
organiser drafts are visible immediately.

The participation overview adds a read-only projection of slots and people to the
same allocation projection. It combines derived rankings, attendance assignments,
scheduled internal leadership, sign-ups, interests, and solver-reported unassigned
ranked choices into person-by-slot cells. A choice is marked received only when the
solver assigns that workshop to that person. It does not infer participation to meet
a per-person target or persist a second roster. The overview links each name to the
existing trace route and is recalculated from the prospective world and plan.

The trace view presents the allocation as a cumulative funnel. It shows the
answer intake, one stage per configured ranking, and a final result stage for
fixed assignments and open cases. Within each stage, the presentation lists
fixed and fulfilled wishes before rejected or unprocessed wishes, so the trace
starts with positive progress even though the solver may have produced those
outcomes in another order. This is a UI-only ordering decision: it does not
change solver decisions, round snapshots, counts, or explanations. Each stage includes the people and workshops affected
plus structured reasons such as capacity, slot overlap,
leader conflicts, eligibility, cancellation, or no schedule. The sticky
controls support all-person, highlighted-person, and single-person views; the
single-person context also reports matching workshops, leaderships, wish
status, and the explicit no-wishes state. People in the explanation rows are
keyboard-usable selectors; highlight mode marks the active person, while
rejected names remain visibly struck through. The table collapses to
responsive cards and remains usable with keyboard focus and screen-reader
labels.
