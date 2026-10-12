# Proposal: a cache that is only a cache (revises D1, amends D2)

*Status:* proposal awaiting review. Nothing in the specification has changed yet.

## Context

D1 requires Workers Paid. Read models are derived from the event log; closing
computes a complete solver result. CPU cost must be measured at the intended
occasion shape, including cold requests.
An in-isolate memo only helps requests handled by an already warm isolate.

D1/D2 make the event log the only persisted domain state. A cache proposal must
preserve that authority and avoid a second stored domain model with a rebuild
or synchronization lifecycle. Adopting the proposal requires review of D1/D2,
the alternatives below, and explicit scope approval.

## Derivation boundaries the proposal must preserve

[Phases](../architecture/phases.md) are authoritative. A family response needs the
current world at head plus each area's closed result, which its closing event
already carries; no historical prefix is derived. Live workshop admission needs
head labels. A cache cannot hide a newly saved own answer.

Organiser apply still verifies solver agreement. Closing derives at the reviewed
head and records the result. Any benchmark must exercise family responses, live
participation checks, closing reviews and ordinary apply. Do not assume saves are
fold-only. This proposal is outside the active architecture; phases introduce no
persisted cache.

## Measurement foundation

The [performance tracking guide](../../docs/engineering/performance-tracking.md)
and [scale evidence](../../docs/engineering/performance-scale.md) describe the
implemented benchmark, indexes, solver costs and deterministic regression gates.
The [lifecycle capacity lab](../../docs/engineering/lifecycle-capacity.md) measures
family counts, natural event counts, payload bytes and allocation quality.
[Issue 041](../issues/archived/041-incremental-derivation.md) records the accepted
100-family local envelope. Hosted/browser verification belongs to launch hardening.

A plan cache helps an unchanged-head reader. Cold isolates, a new build revision
and an appended event still require fresh computation. Organiser drafts create
a prospective head absent from the committed log; an unchanged-head cache does
not remove that draft calculation. The store choice below remains a proposal
requiring D1/D2 review and scope approval.

## Why a cache here needs no invalidation

`derive` is pure (D3), so a plan is fully identified by
`(cut input_seq, build_revision, compatibility_revision)` ([solver contract](../architecture/solver-contract.md)). If the key
is exactly that triple, a cached value can never be wrong. New events change the
seq, a new deploy changes the build revision, and old entries just stop being looked up.
Nothing is ever rebuilt, repaired, or kept in sync. This is the difference from the
removed projection tables.

## Alternatives

| Option | Verdict |
|---|---|
| **D1 table `derive_cache`** | **Recommended.** Uses the binding we already have, no new service. Strongly consistent (irrelevant anyway with content keys). Old rows are cleaned up by the existing 03:00 cron. `DELETE FROM derive_cache` is always safe. |
| Workers KV | Close second. Built for caching, `expirationTtl` means no cleanup code, free tier (100k reads / 1k writes a day) is plenty. Costs one more binding, and 13 says "no KV". Eventual consistency is harmless with content keys. |
| Cache API (`caches.default`) | Least code, but per-datacenter, best-effort, and doesn't work on the `workers.dev` preview. Preview would never hit the cache, so it would behave differently from production. Rejected. |
| In-isolate `Map` memo | Fine as a zero-cost layer in front of any of the above. On its own, cold isolates miss (the reason D1 already gives). |
| Redis / memcached (Upstash etc.) | Workers can't use them natively: needs an external vendor, an account, a secret, and an HTTP client for a few hundred KB. Rejected. |

## Recommendation

1. **Cache only the solve output**, not the whole world:
   `derive_cache(key TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL)`.
   `key = "plan:" || input_seq || ":" || build_revision || ":" || compatibility_revision`,
   `value` = canonical JSON of plan + trace. Always refold, which keeps parse cost
   small and keeps entities and labels out of storage.
2. **Rules** (added to 01 and AGENTS.md):
   - The cache is operational, not domain state. The solver never reads it.
   - Emptying it at any time must be correct.
   - Keys contain only the plan identity triple. Nothing else, and never a key that can be overwritten with a different value.
   - Writes are `INSERT OR IGNORE`.
   - Only one module (`src/db/cache.ts`) reads or writes it.
   - A test asserts that a cache hit's canonical plan equals a fresh derive's.
3. **D1 revision is conditional on a measurement**, not an assumption:
   - Benchmark in `workerd` against
     `test/fixtures/event-logs/full-event.kdl`:
     (a) fold at head, (b) cache-hit family view, (c) cold solve.
   - (a) and (b) within ~5 ms CPU → the free tier is viable for everything except a
     cold miss.
   - Measure cold misses at head, including live saves and closing reviews. If (c) > 10 ms, D1 stays Paid and the cache is kept only for latency. If
     (c) fits, D1 becomes "Free tier + derive cache", with Paid as the documented
     fallback.
   - I'd write D1 as "Free + cache, pending the benchmark; switch to Paid if the
     cold solve exceeds the limit." That's honest about the one path a cache can't
     remove.

## Verification

- `grep -rn 'Paid\|memoise\|derive_cache\|KV' *.md`: every mention is consistent with the new D1/D2.
- No spec text implies the cache is read by `derive`, the solver, or authentication.
- AGENTS.md rule "no tables that store folded domain state" still holds as worded, with the cache carved out explicitly.
- Finalize: bookmark, clean `@`, `next-manage add`, `jj git export --ignore-working-copy`.

## Open choice for you

The store: **D1 table** (recommended) or **KV with TTL**. Everything else in this
plan stays the same either way.
