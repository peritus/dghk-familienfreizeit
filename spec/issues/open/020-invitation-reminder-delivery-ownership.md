---
id: "020"
title: Invitation and reminder delivery has two milestone owners
status: open
severity: contract-contradiction
category: kernel
source: milestone-feasibility-review
related_decisions: [D10]
related_milestones: [M8, M14]
opened: 2026-09-21
---

# Invitation and reminder delivery has two milestone owners

## Problem

The roadmap assigns invitation and reminder messages to both M8 and M14 without
stating which milestone owns message construction, a request to send, transport,
delivery records, and provider configuration. The module contract now clarifies
that transport, `email_log`, invitations, and reminders are kernel concerns,
while `change-notifications` renders communication and change messages. The
roadmap still risks claiming an M8 message feature without a hosted-delivery
boundary, or duplicating M14 delivery work.

## Evidence

- [M8](../../roadmap.md#m8--family-authentication-and-preference-controls) includes
  invitation and reminder messages with the family login path.
- [M14](../../roadmap.md#m14--notifications-and-operational-email) again includes
  invitation and reminder messages, then
  adds delivery claims, retries, `email_log`, provider configuration, and delivery
  status.
- [Change notifications](../../deferred-ideas/change-notifications.md) assigns transport,
  `email_log`, invitations, and reminders to the kernel, while its own module
  contribution renders communication and change messages. This separates runtime
  ownership but does not assign the milestone at which each boundary becomes
  available.
- [Implemented authentication](../../../docs/application/authentication.md) states
  that the current M1 foundation does not send email.

## Recommendation

Assign each responsibility to exactly one milestone: family/login workflow,
message rendering, dispatch intent, provider transport, and operational delivery
records. State the M8 development-only or non-delivery behavior and make M14 the
first hosted-delivery acceptance gate, so the M8 acceptance claim cannot imply
operational email delivery.

## Related files

- [roadmap.md](../../roadmap.md)
- [change notifications](../../deferred-ideas/change-notifications.md)
- [authentication](../../application/authentication.md)
- [implemented authentication](../../../docs/application/authentication.md)
