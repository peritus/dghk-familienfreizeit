# Workshop space

Workshop-space identity, event facts, capability resolution, and the organiser
inventory are implemented in [workshop spaces](../../docs/modules/workshop-space.md).
The remaining module work is its contribution to the M11 report host.

## M11 — Workshop-space inventory report

Register an organiser-only workshop-space inventory report with the shared report
host. Derive it from the selected module's current world; do not persist report
state or add a second relationship lookup.

The report includes live and retired spaces, their names and location descriptions,
physical capacity, ordering, and resolver-backed capabilities. Per-slot blocks
belong to workshop scheduling. Retired spaces remain distinguishable from spaces
available to current scheduling.

Acceptance: organisers can open and print the report through the M11 report host;
it identifies the current data cut and does not present a retired space as an
available scheduling candidate. Responsive layout, print behavior, and report
metadata follow [the report contract](../application/reports.md).
