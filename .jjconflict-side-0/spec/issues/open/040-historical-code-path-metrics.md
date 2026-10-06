---
id: "040"
title: Historical code-path performance metrics
status: open
severity: gap
category: tooling
source: Worker tracing follow-up
related_decisions: []
related_milestones: []
opened: 2026-10-03
---

# Historical code-path performance metrics

## Problem

Cloudflare custom spans provide an individual request timeline, but the
application has no persisted time series for answering questions such as:

- What are the p50 and p95 durations of event-log derivation over time?
- Which request phase is becoming slower as the event log grows?
- How do performance and error rates differ by stable operation or deployment?

The architecture already treats telemetry as operational data rather than
domain state: [event architecture](../../architecture/events.md) identifies
Workers analytics as the destination for telemetry such as page views and
login times. The new Worker spans remain useful for request-level debugging,
but they do not provide this historical aggregate view.

## Recommendation

Add a deliberately sampled Workers Analytics Engine dataset for operational
performance measurements. Record stable operation names and numeric durations,
event counts, outcome, and build revision. Query the dataset for percentiles and
visualize it through a Cloudflare or Grafana dashboard.

The implementation must keep Analytics Engine data outside the event log and
must not record emails, family or person identifiers, event payloads, or solver
trace text. Define the dataset schema and retention/cost guardrails before
adding the binding.

## Open questions

1. Which environments should write metrics: preview, production, or both?
2. What sampling rate and daily data-point budget are appropriate for the
   expected request volume?
3. Should the first dashboard cover only Worker phases, or also browser solver
   timings collected through a server endpoint?

## Related files

- [architecture/events.md](../../architecture/events.md)
- [engineering/testing.md](../../engineering/testing.md)
