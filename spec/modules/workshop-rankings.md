# Workshop rankings

The current-cycle label schema, eligibility validation, demand projection, and
organiser review are implemented in [workshop rankings](../../docs/modules/workshop-rankings.md).
The family REST ranking control is implemented in [the family app](../../docs/application/family-view.md).
The remaining explicit no-preference and final ranking interaction belong to
[M10](../roadmap.md#m10--family-access-and-release-control), owned by the
[family preferences contract](family-preferences.md).

<a id="1-purpose-and-boundary"></a>
## Implemented module boundary

See the [implemented ranking contract](../../docs/modules/workshop-rankings.md).

<a id="3-events-and-value-shape"></a>
## Implemented label shape

See the [implemented ranking contract](../../docs/modules/workshop-rankings.md).

<a id="4-validation-and-visibility"></a>
## Implemented validation and demand

See the [implemented ranking contract](../../docs/modules/workshop-rankings.md).

## M10 — Family ranking control

The family control must provide explicit no-preference, distinguishing it from
an unanswered empty ranking, and meet the final desktop/mobile interaction in
[the family view](../application/family-view.md#3-interaction-details).
Eligibility, current-cycle choices, dense unique ranks, configured rank limits
and REST saving are implemented in [the family app](../../docs/application/family-view.md).
The control schema remains owned by the shared family-preferences contract.

The policy for whether a reviewed calculation stays fixed after ranking changes
is unresolved and remains in the [deferred scheduling idea](../deferred-ideas/demand-aware-workshop-scheduling.md).
