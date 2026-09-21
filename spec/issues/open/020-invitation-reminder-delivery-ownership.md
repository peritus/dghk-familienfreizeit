---
id: "020"
title: Invitation and reminder delivery has two milestone owners
status: open
severity: contract-contradiction
category: kernel
source: milestone-feasibility-review
related_decisions: [D10]
opened: 2026-09-21
---

# Invitation and reminder delivery has two milestone owners

## Problem

The roadmap assigns invitation and reminder messages to both M8 and M14 without
stating which milestone owns message construction, a request to send, transport,
delivery records, and provider configuration. This risks claiming an M8 message
feature without a delivery boundary, or duplicating M14 delivery work.

## Evidence

- [M8](../../roadmap.md) includes invitation and reminder messages with the family
  login path.
- [M14](../../roadmap.md) again includes invitation and reminder messages, then
  adds delivery claims, retries, `email_log`, provider configuration, and delivery
  status.
- [Change notifications](../../modules/change-notifications.md) assigns transport,
  `email_log`, invitations, and reminders to the kernel, while its own module
  contribution renders communication and change messages.
- [Implemented authentication](../../../docs/application/authentication.md) states
  that the current M1 foundation does not send email.

## Recommendation

Assign each responsibility to exactly one milestone: family/login workflow,
message rendering, dispatch intent, provider transport, and operational delivery
records. State any earlier development-only link or non-delivery behavior so that
the M8 acceptance claim cannot imply hosted email delivery.

## Related files

- [roadmap.md](../../roadmap.md)
- [change notifications](../../modules/change-notifications.md)
- [authentication](../../application/authentication.md)
- [implemented authentication](../../../docs/application/authentication.md)
