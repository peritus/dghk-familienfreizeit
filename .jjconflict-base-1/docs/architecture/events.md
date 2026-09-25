# Event kernel

The event log is the only persisted domain state. `src/events/types.ts` defines
the kernel envelope and payload schemas; `src/events/fold.ts` validates and folds
events into typed family/person entities and generic labels.

## Storage

Migration `0001_m1_kernel.sql` creates the append-only `event` table and the
operational authentication tables. `readEvents` parses stored JSON through the
same payload schemas used for writes. `appendEvents` assigns contiguous sequence
numbers and uses a compare-and-swap predicate in one D1 batch. A stale or
forward-moving head is rejected, and a failed batch does not partially append.

No folded domain state is stored. `derive(events)` reconstructs the current
kernel world in memory; sessions, magic links, rate limits, and email records are
not passed to it.

## Kernel events

M1 implements `FamilyInvited`, `FamilyEmailChanged`, `PersonAdded`,
`PersonUpdated`, `PersonWithdrawn`, `LabelSet`, and `LabelCleared`. Setup events
map their complete payloads to generic labels. Email identity is NFC-normalized,
trimmed, lowercased, and checked for uniqueness during replay.

The fold rejects sequence gaps, duplicate identities, unknown references,
duplicate family email addresses, invalid payloads, and invalid update history.
Withdrawn people retain their identity and historical labels while being marked
retired for future derivation.

## Development event source

`loadKdl` and `TextFileEventSource` accept the restricted KDL fixture format: one
top-level event node per line, named properties only, no child blocks, no duplicate
properties, and deterministic fixture envelope defaults. They pass payload parsing
and replay invariants through the same kernel path as D1.

The KDL parser is an adapter dependency. The fold itself remains dependency-free;
boundary validation may use Zod as defined by [D26](../../decisions.md#d26--validation-boundary-and-pure-domain-core).

## Limits

`derive(events, config)` is implemented: it folds the kernel's seven event
types into typed families/people and generic labels (`src/events/fold.ts`),
and the fixed resolver operators validate label scope, value shape, and
references (`src/events/resolver.ts`). A selected module may now contribute
its own event types and entity kinds into this same replay path — see
[implemented typed entity identity](data-model.md#typed-entity-identity) —
though this is proven against a synthetic test module only; no real module
selects it yet. The derived-world resolver, diagnostics, projections, draft
derivation, and diff are documented in [derived world](derived-world.md).
Solver stages remain outstanding.
