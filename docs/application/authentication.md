# Authentication

The Worker implements invite-only magic-link authentication without passwords.
The event log identifies families; operational tables hold only hashed tokens,
sessions, and rate-limit buckets.

## Login and redemption

`POST /api/login` canonicalizes the submitted email, applies address and IP
limits, checks the family-derived world or the code-level organiser allowlist,
and creates a 15-minute single-use magic link for known identities. The response
is uniform and does not reveal whether an address is invited. Delivery is a
separate operational adapter; M1 does not send email.

`GET /auth/:token` atomically deletes an unexpired token with `DELETE … RETURNING`,
creates a hashed session, and redirects to the application. Reusing or expiring a
token redirects to the invalid-link screen.

Family sessions last 30 days; organiser sessions last 7 days. The secure,
HttpOnly, SameSite=Lax cookie contains the raw session token while D1 stores only
its SHA-256 hash.

## Request authorization

Every request resolves the session email again. Organiser status is checked from
the code-level allowlist on every request. Family status is resolved from the
current folded event world, so a family email change invalidates the old address
without session cleanup.

`/api/family/view` requires a family principal. Organiser routes return JSON 404
to non-organisers. `/api/me` exposes only the current principal kind and identity
needed by the shell.

## Limits

The allowlist currently contains the development organiser identity
`organiser@example.test`; production deployment must replace it deliberately.
Email delivery, organiser UI, family forms, CSRF origin enforcement, and hosted
secrets remain deployment/application work outside this M1 slice.
