# Workshop rankings

The current-cycle label schema, eligibility validation, demand projection, and
organiser review are implemented in [workshop rankings](../../docs/modules/workshop-rankings.md).
The remaining product work is the family-facing ranking control under
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

The family-facing control records eligible choices in the active cycle before a
schedule exists. It must use the configured rank limit, preserve dense unique
ranks, provide explicit no-preference, and save through the ordinary family event
path. Its control schema and route behavior belong to the shared family-preferences
contract; this module contributes only its ranking semantics.

The policy for whether a reviewed calculation stays fixed after ranking changes
is unresolved and remains in the [deferred scheduling idea](../deferred-ideas/demand-aware-workshop-scheduling.md).
