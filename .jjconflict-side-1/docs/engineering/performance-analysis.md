# Hosted performance analysis

This runbook describes how to investigate slow hosted Worker requests from an
agent workspace. It combines server timings, Cloudflare Workers Observability,
Chromium measurements, source correlation, and a guarded authenticated edit.

The result should distinguish four different costs:

- network and browser rendering;
- authentication and D1 round trips;
- event-log loading and parsing;
- world replay, validation, resolver work, response construction, and commit.

## Safety and evidence boundary

Use a deployment explicitly placed in scope by the user. Treat session cookies,
Cloudflare API tokens, magic-link tokens, event payloads, emails, IP addresses,
and request headers as secrets. Keep them in environment variables or local
configuration; never print them, commit them, or paste them into a report.

Start read-only. An authenticated mutation is useful only when the user has
authorized it and the target instance is disposable or explicitly theirs. Use a
reversible change, read the event head after every request, and never retry a
503 from an append endpoint until the current head has been re-read. A Worker
can commit an event and then exceed its CPU limit while constructing the
response.

Hosted observations document the deployed build at the time of measurement.
They do not prove that a local build or a later deployment behaves the same.
Record the Worker name, public base URL, build revision, compatibility revision,
event-log head, UTC time, and the exact request shape alongside each benchmark.

## 1. Establish a baseline

Use the repository flake for every command:

```sh
nix develop -c <command>
```

Set these variables without echoing their values:

```sh
export BASE_URL='https://<worker-host>'
export SID='<short-lived organiser session cookie>'
```

The session may come from the normal magic-link flow or from a cookie supplied
by the instance owner. Do not obtain a token by bypassing authentication.

Check public availability, identity, and event-log size:

```sh
nix develop -c bash -c '
  for route in /api/health /api/me /api/organiser/log; do
    curl -q -sS -o /tmp/dghk-response.json \
      -w "$route status=%{http_code} total_seconds=%{time_total} \
ttfb_seconds=%{time_starttransfer} bytes=%{size_download}\n" \
      -H "Cookie: sid=$SID" "$BASE_URL$route"
  done
  jq -c "{head_seq,event_count:(.events|length),build_revision,compatibility_revision}" \
    /tmp/dghk-response.json
'
```

The response body in `/tmp` is temporary diagnostic data. Remove it after the
run if it contains event payloads. For a more useful baseline, repeat each
route at least three times and retain status, total time, time to first byte,
and response size.

## 2. Measure perceived browser performance

If a browser tool is available, use it. Otherwise use the Chromium supplied by
the Nix environment and the Chrome DevTools Protocol. Set the `sid` cookie with
`Network.setCookie`; do not place it in a URL or screenshot.

For every important route, record:

- navigation `responseStart`, DOM-content-loaded, and load times;
- visible body text or a stable screen marker;
- resource duration and transfer size for `/api/*` requests;
- JavaScript bundle duration and transfer size;
- response status for every API request.

At minimum test `/organiser`, `/organiser/families`, one family detail route,
`/organiser/accommodation/inventory`, `/organiser/accommodation/assignment`,
`/organiser/workshops`, and one workshop sub-route. The organiser shell loads
`/api/me` and `/api/organiser/log` in parallel, so a failure or delay in either
can hide the actual screen behind a generic loading/error state.

Do not use Chromium process startup time as FCP. `--dump-dom` is useful as a
smoke test, but CDP navigation and resource timings are the user-perspective
measurement.

## 3. Query Cloudflare traces

The deployment enables Worker observability in
[`wrangler.json.template`](../../deploy/cloudflare/wrangler.json.template).
The telemetry query endpoint requires Unix millisecond timestamps and an
arbitrary `queryId` when parameters are supplied inline. See the [Cloudflare
telemetry query reference](https://developers.cloudflare.com/api/typescript/resources/workers/subresources/observability/subresources/telemetry/methods/query/).

Load account-specific values from the deployment configuration without
printing the token:

```sh
CF_CONFIG="$HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit"
ACCOUNT_ID="$(jq -r .account_id "$CF_CONFIG/target.json")"
WORKER="$(jq -r .worker_name "$CF_CONFIG/target.json")"
CF_API_TOKEN="$(tr -d '\r\n' < "$CF_CONFIG/api-token")"
TELEMETRY_API="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/observability/telemetry/query"
```

For trace summaries, query a broad window and filter the returned
`rootTransactionName` client-side. A Worker-name filter can return no rows in
the `traces` view even when the unfiltered query contains the Worker’s traces.

```sh
NOW="$(date +%s000)"
FROM="$(date -d '24 hours ago' +%s000)"
jq -n --argjson from "$FROM" --argjson to "$NOW" '{
  queryId: "hosted-performance-traces",
  view: "traces",
  dry: true,
  timeframe: {from: $from, to: $to},
  limit: 200,
  parameters: {}
}' > /tmp/dghk-trace-query.json

nix develop -c curl -q -sS -X POST "$TELEMETRY_API" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/dghk-trace-query.json \
  > /tmp/dghk-traces.json
```

Retain only these fields in notes:

```text
traceId, rootTransactionName, traceDurationMs, spans, traceStartMs,
traceEndMs, errors
```

For detailed child spans, query the `events` view by the selected trace ID:

```sh
TRACE='<trace id from the redacted trace summary>'
jq -n --arg trace "$TRACE" --argjson from "$FROM" --argjson to "$NOW" '{
  queryId: ("hosted-performance-events-" + $trace),
  view: "events",
  dry: true,
  timeframe: {from: $from, to: $to},
  limit: 200,
  parameters: {
    filterCombination: "and",
    filters: [{
      key: "$metadata.traceId",
      operation: "eq",
      type: "string",
      value: $trace
    }]
  }
}' > /tmp/dghk-event-query.json

nix develop -c curl -q -sS -X POST "$TELEMETRY_API" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/dghk-event-query.json \
  > /tmp/dghk-trace-events.json
```

Redact `cookie`, token/hash fields, emails, IP addresses, account IDs, and
request headers before sharing the response. For each span, capture:

- `source.name`, `source.startTime`, `source.endTime`, and `source.durationMS`;
- `source.event` attributes such as event count and expected head;
- D1 `rows_read`, `rows_written`, `changes`, `sql_duration_ms`, and operation;
- root response status, outcome, `cpu_time_ms`, and `wall_time_ms`.

The D1 `sql_duration_ms` value is database execution time. The span duration
also includes the Worker/D1 round trip and scheduling; compare both.

## 4. Correlate traces with source

Search for route handlers and span names in the workspace:

```sh
nix develop -c rg -n \
  "enterSpan|readEventLog|prepareEventBatch|deriveEventWorld|appendEventBatch" \
  src/worker src/events src/auth
```

For this application, pay particular attention to:

- [`src/events/store.ts`](../../src/events/store.ts): complete event-log query
  and per-row payload parsing;
- [`src/events/prepare.ts`](../../src/events/prepare.ts): prospective full
  derivation before append;
- [`src/events/fold.ts`](../../src/events/fold.ts): event normalization, replay,
  resolver work, indexes, diagnostics, and summaries;
- [`src/worker/index.ts`](../../src/worker/index.ts): authentication, log read,
  authorization, append, and final response derivation.

Do not treat a custom synchronous span with `0 ms` duration as proof that the
operation is cheap. In the benchmark below, the custom derivation spans had
millisecond-resolution zeroes while the invocation consumed roughly two
seconds of CPU. Use root CPU/wall metrics, D1 spans, source call order, and
controlled comparisons together.

## 5. Exercise an authenticated mutation safely

Only do this when explicitly authorized. Read the current organiser log first
and derive the current head, build revision, compatibility revision, target
entity, and current value from the response. Prefer one reversible
`FamilyDisplayNameChanged` or equivalent edit over fixture imports or new
entities.

Record the response status and timing. On any 503 or connection failure:

1. Read `/api/organiser/log` again.
2. Compare `head_seq` and the last event with the pre-request head.
3. Only then decide whether a restore or retry is needed.

Never assume a 503 means “not committed.” The apply handler appends before it
derives the response world, so CPU exhaustion can occur after D1 has changed.
Confirm the restored domain value and record the audit events added by the test.

## 6. Benchmark captured on 2026-10-03

Target: the deployed `curly-firefly-8f4e` Worker, with 1,314 events at the
start of the authenticated test. The initial controlled edit was a family-name
change. It succeeded once; the restore returned 503 but was committed. The
domain value was restored, leaving two intentional audit events and a final
head of 1,316.

| Operation | Outcome | Measurement | Detail |
|---|---:|---:|---|
| Authenticated dashboard | visible | navigation load ~270 ms | `/api/me` ~236 ms; `/api/organiser/log` ~409 ms; log transfer ~17.8 KB, JSON ~301 KB |
| `/api/organiser/log` normal | 200 | 431–459 ms wall; 30–46 ms CPU | D1 read 287–316 ms; 1,314 rows; SQL 3.5–4.4 ms |
| `/api/organiser/log` failure | 503 / 1102 | 216–411 ms wall; 10–16 ms recorded CPU | D1 read completed; Cloudflare reported `exceededCpu`, so accounting is inconsistent here |
| `/api/organiser/apply` successful edit | 200 | 2,300 ms wall; 1,952 ms CPU | full read 77 ms; append 403 ms; final response returned |
| `/api/organiser/apply` failed restore | 503 / 1102 | 2,708 ms wall; 2,010 ms CPU | D1 wrote the event, then the request failed during post-append work |
| `/api/health` | 200 | 29–144 ms trace duration | no event-log replay |

The benchmark supports these conclusions:

1. D1 SQL execution is not the dominant cost; round trips and Worker-side
   processing are much larger.
2. The apply path performs multiple full-log/world passes: preparation,
   authorization, and final response derivation.
3. The post-append derivation makes the API result ambiguous under CPU
   exhaustion.
4. The organiser UI re-fetches the complete log on page loads, so the same
   event-log cost affects perceived navigation even without an edit.
5. `/api/organiser/log` needs separate investigation because its successful
   traces are mostly D1/read latency, while its failed traces report a low CPU
   value alongside `exceededCpu`.

## 7. Report format for future runs

End the investigation with:

- target URL, Worker name, UTC timestamp, build and compatibility revisions;
- event head before and after, including whether test data was restored;
- browser route timings and API resource timings;
- route-level status/time/size measurements;
- trace IDs for representative success and failure cases;
- child-span table with D1 rows, SQL time, round-trip span time, CPU, and wall;
- source locations matching each span;
- confirmed causes, unresolved instrumentation limits, and proposed fixes;
- explicit statement that no repository files were changed, or the jj revision
  and verification checks if implementation followed the analysis.
