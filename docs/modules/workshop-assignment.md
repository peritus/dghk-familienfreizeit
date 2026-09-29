# Workshop assignment

Attendance assignment consumes the derived current-cycle demand, one-placement
schedule, workshop modes, person roles, capacities, and profile configuration.
Assigned-mode workshops receive deterministic ranked or fill assignments, with at
most one assignment per person in an overlapping slot. Sign-up and interest lists
remain separate outputs and are not converted into automatic assignments.

The active profile uses top two ranked choices, weights `[3, 2, 1]`, a minimum of
two workshops, configured child/adult fairness targets, fill enabled, and five
repair passes. The stage emits assignments, unassigned outcomes, sign-ups,
interests, and explainable traces. Fixed attendance decisions remain an event-backed
future extension; the initial UI is automatic-only.
