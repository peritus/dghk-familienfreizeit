# Workshop spaces

`workshop-space` derives the physical spaces available to the workshop planner.
Each space has a stable identity, display name, location description, capacity,
availability windows, deterministic order, and resolver-backed capabilities.
It is separate from accommodation rooms and is maintained at
`/organiser/workshop-spaces`.

The screen provides event-backed add, retire, availability, and per-slot block
actions. Scheduling consumes the derived live spaces and checks capacity,
availability, capabilities, leader conflicts, and explicit blocks. Space inventory
does not become a workshop audience list and does not assign attendance itself.

Retired spaces disappear from active planning and remain recoverable in historical
replays. Browser print is the only print path; no space screen exports or prints
from inside the application.
