---
id: "040"
title: Historical code-path performance metrics
status: resolved
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

## Resolution

A durable local performance history, computation and authenticated HTTP labs,
sampled browser/Worker operational measurements, a provider CPU/wall Tail
collector and portable trace exports are implemented and locally verified.
The [performance tracking guide](../../../docs/engineering/performance-tracking.md)
contains the catalogue, schema, bounds, sampling/retention rules and queries;
[scale evidence](../../../docs/engineering/performance-scale.md) records measurements.

Collection is configured for production and off in the normal local/preview
application. Local unit, build and isolated HTTP verification is not a hosted
deployment claim. Deployment and provider dataset/query verification remain
operational follow-up.

Synchronous Worker clocks cannot provide exact per-stage CPU latency. The
implemented historical views distinguish browser elapsed time, Worker I/O
intervals, stage call counts and provider invocation CPU/wall time. Production
CPU profiles provide sampled function attribution. No zero-duration CPU-only
span is treated as a timing measurement.

## Related files

- [architecture/events.md](../../architecture/events.md)
- [Performance tracking](../../../docs/engineering/performance-tracking.md)
