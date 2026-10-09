# Workshop spaces

`workshop-space` derives the physical spaces available to the workshop planner.
Each space has a stable identity, display name, location description, capacity,
deterministic order, and resolver-backed capabilities.
It is separate from accommodation rooms and is maintained at
`/organiser/workshops/spaces`.

The screen provides event-backed add, retire, and per-slot block actions. A space
has no separate availability date range; organisers represent unavailability by
blocking that space for a slot. Scheduling consumes the derived live spaces and
checks capacity, capabilities, leader conflicts, and those explicit blocks. Space
inventory does not become a workshop audience list and does not assign attendance
itself.

Retired spaces disappear from active planning and remain recoverable in historical
replays. Browser print is the only print path; no space screen exports or prints
from inside the application.
