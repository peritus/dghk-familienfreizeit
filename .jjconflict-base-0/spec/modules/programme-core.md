# Programme core

Module id `programme-core` · factory `programmeCore`

Programme core owns the common identity and facts shared by official workshops
and self-organised sessions. It does not decide how a session is proposed,
ranked, scheduled, or attended.

## 1. Entity kinds and events

The module owns the stable `programme-session` identity. A session carries its
proposer attribution, source mode (`official` or `self-organized`), shared
content, and lifecycle facts. Official and self-organised modules own their
source-specific events and reference this identity; they do not create a second
session identity.

Scheduled offerings are owned by [workshop scheduling](workshop-scheduling.md),
not by this module.

## 2. Typed module boundary

Source modules contribute a pure, typed scheduleable-session value:

```ts
type ScheduleableSessionContribution = {
  session_id: string
  source_module: string
  mode: 'official' | 'self-organized'
  placement_policy: 'solver' | 'proposer-selected'
  eligibility: unknown
  capacity: number | null
  constraints: readonly unknown[]
}
```

The concrete contribution types are defined by the module contract and resolved
from derived world data. Scheduling never reads another module's raw event
payloads or performs a per-screen lookup.

## 3. Boundary rules

- The event log remains the only persisted domain state.
- Common identity is typed; domain properties remain generic labels.
- Source modules own their event types and labels.
- This module contributes no solver stage, ranking control, attendance result, or
  release scope of its own.

## 4. Tests

Profile composition tests cover official and self-organised sources sharing the
same session identity boundary without duplicate entity or event ownership.
