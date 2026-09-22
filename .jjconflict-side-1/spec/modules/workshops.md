# Workshops

Workshop programme behavior is composed from these module contracts:

- [programme core](programme-core.md) owns shared programme-session identity;
- [official workshops](official-workshops.md) owns official workshop facts;
- [workshop scheduling](workshop-scheduling.md) owns offerings and placement;
- [workshop rankings](workshop-rankings.md) owns pre-schedule rankings; and
- [workshop attendance](workshop-assignment.md) owns final allocation.

The shared workshop route and programme reports compose these contributions. No
single module owns all workshop behavior, and no module reads another module's
raw event payloads.

Proposal review and self-organized sessions remain in the deferred contracts
[call for papers](../deferred-ideas/call-for-papers.md) and
[self-organized sessions](../deferred-ideas/self-organized-sessions.md).
