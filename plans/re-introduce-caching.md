# Proposal: a cache that is only a cache (revises D1, amends D2)

*Status:* proposal awaiting review. Nothing in the specification has changed yet.

## Context

`kkrzzvqs` ("plan Workers Paid") made D1 require Workers Paid. The reason: every
server request that shows domain state runs `derive`, the attendee view and the
admin apply run the solver, and fold + solve + trace won't reliably fit in 10 ms
of CPU. The only alternative it considered was an in-isolate memo, and it turned
that down because a cold isolate still has to solve from scratch.

`xsppsvly` removed persisted projections (`entity`, `label`,
`constraint_definition`, `src/project/`). That was the right call. Those tables
were a second copy of domain state with a rebuild step that could fail or race.
The same commit also dropped the old "KV keyed by `max(seq)`" note.

You asked for caching that is **only** caching. Per AGENTS.md, touching D1/D2 is a
decision revision, so this plan is the review: what changed, the alternatives, and
a recommendation. The spec gets edited only after you approve.

## What the server actually derives (from the spec)

| Request | Needs | Cut | How often the cut changes |
|---|---|---|---|
| `currentPrincipal` → `familyByEmail(worldAtHead)` (11 §4) | fold only | head | every append |
| Family save (VALIDATE step 2) | fold (+ profile validation) | head | every append |
| `GET /api/family/view` (10) | fold + **solve** | before latest `PlanPublished` | only on publish |
| `POST /api/admin/apply`, publish (`output_hash` check) | fold + **solve** | new head | every admin apply |
| `GET /api/admin/log` | no derive (raw events) | — | — |
| Admin screens | derived **in the browser** (D15) | — | — |

The key point: the expensive step (solve) is only needed at the **publication cut**
and on admin apply/publish. The per-append paths only need the fold, which the spec
already calls sub-millisecond.

## Why a cache here needs no invalidation

`derive` is pure (D3), so a plan is fully identified by
`(cut input_seq, config_hash, solver_version)` (01 "A plan's identity"). If the key
is exactly that triple, a cached value can never be wrong. New events change the
seq, a new deploy changes the hashes, and old entries just stop being looked up.
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
   `key = "plan:" || input_seq || ":" || config_hash || ":" || solver_version`,
   `value` = canonical JSON of plan + trace. Always refold (it's cheap), which keeps
   parse cost small and keeps entities and labels out of storage.
2. **Rules** (added to 01 and AGENTS.md):
   - The cache is operational, not domain state. The solver never reads it.
   - Emptying it at any time must be correct.
   - Keys contain only the plan identity triple. Nothing else, and never a key that can be overwritten with a different value.
   - Writes are `INSERT OR IGNORE`.
   - Only one module (`src/db/cache.ts`) reads or writes it.
   - A test asserts that a cache hit's `output_hash` equals a fresh derive's.
3. **D1 revision is conditional on a measurement**, not an assumption:
   - Add an M0/M2 task: benchmark in `workerd` against `events/…full-event.json`:
     (a) fold at head, (b) cache-hit attendee view, (c) cold solve.
   - (a) and (b) within ~5 ms CPU → the free tier is viable for everything except a
     cold miss.
   - A cold miss happens once per publish, and on admin apply for the `output_hash`
     check. If (c) > 10 ms, D1 stays Paid and the cache is kept only for latency. If
     (c) fits, D1 becomes "Free tier + derive cache", with Paid as the documented
     fallback.
   - I'd write D1 as "Free + cache, pending the M2 benchmark; switch to Paid if the
     cold solve exceeds the limit." That's honest about the one path a cache can't
     remove.

## Spec edits after approval (docs only, one commit)

- `17-decisions.md`:
  - D1: rewrite *Why Paid* as above. Replace the rejected-memo alternative with the
    table of alternatives. Add the measurement gate.
  - D2: add *Consequence:* the derive cache is allowed because it's keyed by plan
    identity; distinguish it from the rejected persisted projections.
- `AGENTS.md`: add to the operational-tables bullet: "a content-keyed derive cache
  that is safe to empty".
- `01-architecture.md`:
  - Replace the "memoise the fold … do not pre-build it" paragraph with a short
    "Derive cache" section (key, rules, what's cached).
  - `src/db/cache.ts` in the tree, plus a fourth load-bearing boundary.
- `02-data-model.md` §6: `derive_cache` DDL.
- `13-deployment.md`: §10 cost row. Cron also deletes cache rows whose `input_seq` is below the latest publication and head, or older than N days. §1 unchanged (no new binding).
- `14-testing.md`: the cache-hit ≡ fresh-derive test, plus a "table emptied mid-run" test.
- `15-roadmap.md`: M0 "deployed on Workers Paid" becomes the free/Paid choice. Add the benchmark task to M2 (the solver milestone).

Commit: `docs: cache derived plans by plan identity instead of requiring Workers Paid`.
Bookmark: `re-introduce-caching` (this plan); implement on top of it.

## Verification

- `grep -rn 'Paid\|memoise\|derive_cache\|KV' *.md`: every mention is consistent with the new D1/D2.
- No spec text implies the cache is read by `derive`, the solver, or authentication.
- AGENTS.md rule "no tables that store folded domain state" still holds as worded, with the cache carved out explicitly.
- Finalize: bookmark, clean `@`, `next-manage add`, `jj git export --ignore-working-copy`.

## Open choice for you

The store: **D1 table** (recommended) or **KV with TTL**. Everything else in this
plan stays the same either way.
