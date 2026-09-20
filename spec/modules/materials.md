# Materials

Module id `materials` · factory `materials`

## 1. Purpose and boundary

Materials coordinates items that families, people, or workshops need brought from
outside the occasion inventory. It records requests and commitments and connects them
explicitly. It does not manage purchasing, stock, menus, or physical delivery.

Requests and commitments are separate records with independent lifecycles. A
commitment can be withdrawn without changing the request it was meant to satisfy, so a
request keeps needing attention until it is fulfilled or explicitly cancelled.

This document is the authoritative description of material requests, commitments,
fulfilment, and the materials resolver.

## 2. Dependencies

Requires: none. Enhances: [`workshops`](workshops.md) — when selected,
records may be linked to a workshop.

## 3. Parameters

```ts
type MaterialsParams = {
  categories: readonly string[]
  requester_kinds: readonly ('family' | 'person' | 'workshop')[]
  contributor_kinds: readonly ('family' | 'person')[]
  workshop_links: boolean
  person_links: boolean
  commitment_fulfills_many: boolean
  copy: {
    categories: Readonly<Record<string, LocalizedText>>
  }
}
```

| Parameter | Default | Validation |
|---|---|---|
| `categories` | — (required) | non-empty, unique, kebab-case |
| `requester_kinds` | `['family', 'person']` | `workshop` requires `workshop_links` |
| `contributor_kinds` | `['family', 'person']` | non-empty |
| `workshop_links` | `false` | `true` requires `workshops` |
| `person_links` | `false` | `true` requires `workshop_links` |
| `commitment_fulfills_many` | `false` | — |
| `copy.categories` | — | one entry per category |

## 4. Entity kinds

| Kind | Id prefix | Created by |
|---|---|---|
| `material-request` | `mreq_` | `MaterialRequested` |
| `material-commitment` | `mcom_` | `MaterialCommitted` |

## 5. Events

### `MaterialRequested` / `MaterialRequestUpdated`

```ts
{
  request_id: string,
  requested_by: string,                // family, person, or workshop id
  category: string,
  name: string,
  quantity_text: string | null,
  description: string | null,
  workshop_id: string | null,
  concerns_person_id: string | null
}
```

### `MaterialRequestCancelled`

```ts
{ request_id: string, reason: string | null }
```

### `MaterialCommitted` / `MaterialCommitmentUpdated`

```ts
{
  commitment_id: string,
  contributed_by: string,              // family or person id
  category: string,
  name: string,
  quantity_text: string | null,
  description: string | null,
  workshop_id: string | null,
  fulfills: string | null              // request id
}
```

### `MaterialFulfilmentAdded` / `MaterialFulfilmentRemoved`

```ts
{ commitment_id: string, request_id: string }
```

Connects a commitment to a further request, and only when
`commitment_fulfills_many` is set.

### `MaterialCommitmentWithdrawn`

```ts
{ commitment_id: string, reason: string | null }
```

Payload fields fold to labels under their kebab-case names, with one `fulfills`
label per connected request. Updates are full restatements.

*Invariants:* `requested_by` and `contributed_by` resolve to allowed kinds;
`category` is in the parameters; `workshop_id` is null unless `workshop_links`;
`concerns_person_id` is null unless `person_links` and `workshop_id` is set; every
`fulfills` target is a live request.

*Authorisation:* a family may request and commit for itself and its people, and
withdraw or update only its own records. Organisers may do everything, including
requests on behalf of a workshop.

```kdl
MaterialRequested request_id=mreq_paint requested_by=ws_malen category=material name="Acrylfarben" quantity_text="5 Tuben" description=#null workshop_id=ws_malen concerns_person_id=#null
MaterialCommitted commitment_id=mcom_paint-braun contributed_by=fam_braun category=material name="Acrylfarben" quantity_text="5 Tuben" description=#null workshop_id=ws_malen fulfills=mreq_paint
```

## 6. Labels and tag roles

Module-owned label keys on `material-request` and `material-commitment`, set only
by the module's events: `requested-by`, `contributed-by`, `category`, `name`,
`quantity-text`, `description`, `workshop`, `concerns-person`, `fulfills`,
`cancelled-reason`, `withdrawn-reason`. Ownership is per (key, entity kind), so
`name` on a building and `description` on a workshop belong to their own modules
([modules](contract.md) §3.1).

Tag roles: none.

Matching is never inferred from similar names. Only `fulfills` connects a commitment
to a request.

## 7. Solver input and stages

None. `derive` builds a world-level summary from the current resolved material
labels, like `FoodSummary`. Materials do not contribute solver arrays, plan sections
or release scopes. Relationship resolution stays in the configured resolver.

## 8. Rules and scoring

None.

## 9. Preflight checks

None in the solver. The following world-level diagnostics feed organiser attention:

| Id | Severity | Fires when |
|---|---|---|
| `materials.invalid-fulfilment` | warning | an active commitment fulfils a cancelled or unknown request |
| `materials.open-workshop-request` | info | a workshop-linked request is open |

## 10. Output and diff

No plan section. `MaterialsSummary` ignores withdrawn commitments and cancelled
requests when computing active fulfilment. It identifies open and fulfilled requests,
unmatched active commitments and invalid relations. Withdrawing a commitment can
reopen a request; no match is inferred from names or free-text quantities.

Arrays use category order then id, and nested commitment ids are sorted. Numeric
quantity accounting is outside this module; text such as `2-3 Packs` stays text.

```ts
type MaterialsSummary = {
  open: readonly string[]                    // request ids
  fulfilled: readonly { request_id: string, commitment_ids: readonly string[] }[]
  unmatched_commitments: readonly string[]
  invalid: readonly { commitment_id: string, request_id: string, reason: string }[]
}
```

`diff` change kinds: `material-request-opened` and `material-request-fulfilled`, for
the organiser dashboard's live coordination attention. They are world changes,
not plan changes or uncommunicated arrangements. Material diagnostics never enter
the canonical solver-output hash. The plan metadata may still reflect a newer input sequence.

Own records and the permitted shared overview are immediate after append. Workshop
reference display and privacy follow [release control](../application/release-control.md) §2;
resolving a current material link must not expose draft programme details. Material
changes never trigger communication emails.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Screen | Materials section in the organiser application: open requests, commitments, withdrawals, workshop materials |
| Family view | Request and commit forms for the family's own records; the shared materials list |
| Reports | Materials overview (shared); materials part of the family information sheet; unresolved materials in open issues ([reports](../application/reports.md) §3) |
| Controls, emails | none |

## 12. Tests

- Withdrawing a commitment reopens its request.
- A request is never matched by name.
- `MaterialFulfilmentAdded` is rejected unless `commitment_fulfills_many`.
- A family cannot update another family's record.
- A saved commitment is visible immediately after communication of arrangements.
- Materials-only changes do not create release backlog or notification recipients.
- Current links cannot disclose uncommunicated workshop titles, rooms or times.

## 13. When not selected

No material kinds or events exist; the materials screens, forms, and reports are
absent.
