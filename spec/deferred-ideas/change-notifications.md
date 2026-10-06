# Change notifications

This accepted module contract is deferred from the active roadmap. It is the
canonical specification for a future promotion; it is not selected by the
Familienfreizeit 2027 profile. Authentication invitation and reminder email
remains active independently of this module.

Module id `change-notifications` · factory `changeNotifications`

## 1. Purpose and boundary

This module renders emails when an area is closed and integrates operational
delivery. [Phases](../architecture/phases.md) own closing, visibility, and the
before/after comparison. Transport, `email_log`, invitations and reminders are
kernel. Email failure never undoes a closing.

## 2. Dependencies

Requires: none. Enhances: none. It consumes closing events and the family
projection of their results, built from contributions of whichever domain modules
are selected.

## 3. Parameters

```ts
type ChangeNotificationsParams = {
  include_arrangements_in_body: boolean
  copy: {
    initial_subject: LocalizedText
    change_subject: LocalizedText
  }
}
```

| Parameter | Default | Validation |
|---|---|---|
| `include_arrangements_in_body` | `true` | — |
| `copy` | — (required) | both subjects supplied |

Recipient policy is fixed in §10, not a configurable list of difference kinds.

## 4. Entity kinds

None.

## 5. Events

None of its own. The closing review offers an optional email choice only while
this module is selected; the choice is an operational intent recorded with
delivery, not part of the closing payload.

## 6. Labels and trait roles

None.

## 7. Solver input and stages

None.

## 8. Rules and scoring

None.

## 9. Preflight checks

None.

## 10. Output and diff

Recipients come from comparing an area's new closed result with its previous one,
after family privacy projection:

- the first closing of an area addresses every family represented in its result,
  including explicitly unassigned people;
- a later closing addresses families whose own result changed, including
  movement, removal, and cancellation of an attended workshop;
- an unchanged family-visible result sends no email;
- materials, live answers, and live descriptor edits never trigger an email;
- families are deduplicated and sorted by family order, then id.

Send one message per family per closing. Initial messages include the
arrangement when `include_arrangements_in_body` is set; change messages give only
the family's before/after details and a family-view link, never internal
constraints, findings, or other families' values. Previews and messages are
rendered by the Worker from the same family projection the family view uses.

Operational `email_log` records the closing event sequence, family, kind,
delivery status and retry identity. Retries rebuild the message from the two closed
results named by the closing sequence, never from the current derivation. Claim
delivery atomically and use a stable provider idempotency key where supported;
without provider idempotency, an ambiguous send is marked unknown for explicit
review rather than blindly retried. Current authorisation applies at send time:
suppress recipients no longer entitled to the content and record the suppression.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Emails | **Initial**: the family's fixed arrangements; **Change**: relevant before/after details; both with a family-view link |
| Screen | Exact recipient and message previews plus the optional email choice in the closing review; delivery status shown separately |
| Reports | Change notice, limited to the reader's permitted content ([reports](../application/reports.md)) |
| Controls | none |

## 12. Tests

- Preview recipients and messages match delivery for the same closing, after the
  same authorisation and privacy suppression.
- A family whose result did not change receives nothing; materials-only and live
  descriptor changes never send.
- A closing sends at most one message per family; failed sends retain status.
- A retry uses the closed results named by its closing sequence, not current data.
- Unknown delivery is surfaced rather than blindly duplicated.

## 13. When not selected

Closing works unchanged. The email choice, initial and change emails, and delivery
views are absent. Own information and fixed arrangements remain visible through
ordinary family views and reports.
