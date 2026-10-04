# Event kernel

The event log is the only persisted domain state. `src/events/types.ts` defines
the kernel envelope and payload schemas; `src/events/fold.ts` validates and folds
events into typed family/person entities and generic labels.

## Storage

Migration `0001_m1_kernel.sql` creates the append-only `event` table and the
operational authentication tables. `defineOccasionProfile` composes kernel and
selected-module payload schemas into its validation view. `readEvents` receives
that selected `KernelConfig`, so stored JSON is parsed with the selected
profile's payload schemas. The Worker prepares and validates a complete, parsed
`Event[]` with contiguous sequence numbers, then passes that canonical batch to
`appendEvents`. Storage writes those exact events and uses a compare-and-swap
predicate in one D1 batch. A stale or forward-moving head is rejected, and a
failed batch does not partially append.

No folded domain state is stored. `derive(events, config)` reconstructs the
current profile world in memory; sessions, magic links, rate limits, and email
records are not passed to it. Every Worker and authentication replay uses the
same selected profile configuration for storage parsing and derivation.

## Kernel events

M1 implements `FamilyInvited`, `FamilyEmailChanged`, `PersonAdded`,
`PersonUpdated`, `PersonWithdrawn`, `LabelSet`, and `LabelCleared`. Setup events
map their complete payloads to generic labels. Email identity is NFC-normalized,
trimmed, lowercased, and checked for uniqueness during replay.

The fold rejects sequence gaps, duplicate identities, duplicate family email
addresses, invalid payloads, invalid update history, and append-time dangling
entity references. Resolver diagnostics still expose unknown references in a
derived world, while `assertAppendableWorld` rejects error-severity dangling
references before storage. Withdrawn people are hard-removed from the live
world; historical views are reconstructed by re-deriving a truncated event
slice.

## Development event source

`loadKdl` and `TextFileEventSource` accept the restricted KDL fixture format: one
top-level event node per line, named properties only, no child blocks, no duplicate
properties, and deterministic fixture envelope defaults. They pass payload parsing
and replay invariants through the same kernel path as D1.

The KDL parser is an adapter dependency. The fold itself remains dependency-free;
boundary validation may use Zod as defined by [D26](../../decisions.md#d26--validation-boundary-and-pure-domain-core).

## Append cost

Appending a batch folds the log exactly twice, regardless of how many events the
batch contains: once for the world the batch is authorized against, and once for
the world the batch produces. Nothing on the path folds per event.

Two properties hold that:

- `authorizeEventBatch` takes one `World` for the whole batch. Authorization was
  previously expressed per event with the world as an argument, and the handler
  passed a fresh `derive(existing)` inside the loop — so a ten-event batch folded
  the entire log ten times. A batch signature makes that shape unrepresentable.
- `prepareEventBatch` returns the world it folded. That world describes
  `committed + batch`, which is what the response has to report once the append
  succeeds, so the handler serves it instead of folding the same events again.
  The same parsed event objects are passed to `appendEvents`, so persistence
  cannot create a second, divergent representation between preparation and the
  response.

Authorization sees the pre-batch world, so every event in one batch is judged
against the same state. That was true of the per-event version too; changing it
would be a policy decision rather than a cost one.

Family resolution during authorization goes through the derived indexes —
`labels_by_key` for an email, `labels_by_entity` and `entities_by_kind` for an
entity's family — rather than scanning the label store. Those lookups run once
per request and once per event in a batch, so a scan there grew with the
occasion's whole history. The
[solver cost gates](../engineering/testing.md#solver-cost-gates) budget this.

## Limits

`derive(events, config)` is implemented: it folds the kernel's identity,
person, and label event types, including the dedicated
`FamilyDisplayNameChanged` identity-correction event,
types and selected module event types into typed entities and generic labels
(`src/events/fold.ts`), while the fixed resolver operators validate label scope,
value shape, and references (`src/events/resolver.ts`). The room-inventory module
and workshop modules exercise this replay path with lifecycle tests. Workshop
authoring, slot, space, cancellation, retirement, ranking, and participation
facts are ordinary events; summaries and placements are derived and never stored
as folded domain state. Release and family-facing workshop projections remain
later scope.
