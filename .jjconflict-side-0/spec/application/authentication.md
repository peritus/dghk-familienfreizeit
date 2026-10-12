# Authentication delivery

Invite-only login, canonical identities, magic-link redemption, sessions,
request authorization, and local development behavior are implemented in
[authentication](../../docs/application/authentication.md). This specification
contains only the remaining delivery intent and hosted email requirements.

<a id="m10-delivery-intent"></a>
## 1. M10 — Development-time delivery intent

The family login workflow must create an operational delivery intent for an
eligible family address and its single-use login link. Local development may
expose the link through the existing debug output. M10 does not render hosted
messages, call provider transport, or record delivery outcomes.

Authentication secrets and delivery state remain operational data; they do not
enter the domain event log. The intent must give M14 enough information to render
and send invitation or reminder email without reading event payloads for message
content.

Acceptance: an eligible family can request and redeem a link in development,
while the send request remains available to the later delivery owner without
changing domain visibility.

<a id="m14-hosted-delivery"></a>
## 2. M14 — Hosted invitation and reminder delivery

- Render invitation and reminder messages from M10 delivery intents.
- Own provider transport and configuration, recipient preview, delivery claims,
  retries, suppression, unknown-send handling, and idempotency.
- Record attempts and delivery status in operational `email_log`, separate from
  domain visibility and event history.
- Keep closing and change messages in the separate deferred
  [change-notifications](../deferred-ideas/change-notifications.md) contract.

Acceptance: invitation and reminder delivery is reliable and idempotent; an
unknown provider outcome can be resolved without duplicate delivery; and delivery
failure never changes authentication or domain visibility. Deployment bindings
and operational recovery follow the
[deployment contract](../engineering/deployment.md).

<a id="m15-organiser-perimeter"></a>
## M15 — Organiser perimeter

During development and the early run-up, put Cloudflare Access in front of
`/organiser/*` and `/api/organiser/*` as defense in depth. The application's own
allowlist check remains mandatory with or without Access. Before handing the
tool to non-technical organisers, review whether the extra login creates enough
friction to remove Access; removing it must not remove application authorization.
