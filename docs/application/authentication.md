# Authentication

The Worker implements invite-only magic-link authentication without passwords.
The event log identifies families; operational tables hold only hashed tokens,
sessions, and rate-limit buckets.

## Login and redemption

The `/login` form submits to `POST /api/login`. The Worker canonicalizes the
submitted email, applies address and IP limits, checks the family-derived world
or the code-level organiser allowlist, and creates a 15-minute single-use magic
link for known identities. The response is uniform and does not reveal whether
an address is invited.

During local development, requests served on `localhost`, `127.0.0.1`, or
`::1` print the link to the Worker terminal. A deliberate non-loopback override
is available only through the alarming binding
`DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE=true`; it must never be
enabled on a shared or production deployment. The binding is optional; when it
is unset, the loopback-only default remains in force. Real email delivery
remains a separate deployment concern.

Session cookies are always `Secure`, except when the separate alarming local-only
binding `DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES=true` is set.
The Station Tailscale preview uses it because browsers reject `Secure` cookies
over its plain-HTTP URL. Shared and deployed environments must leave it unset.
The binding is optional and leaving it unset preserves the secure default.

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

`/api/family/view` requires a family principal. Organiser API subroutes return
JSON 401 to unauthenticated or non-organiser requests; the base `/api/organiser`
route intentionally returns JSON 404 to conceal the organiser surface. `/api/me`
exposes only the current principal kind and identity needed by the shell.
`POST /api/events` sets the verified actor server-side, rejects stale heads, and
permits family principals only to append events about their own family or people;
organiser principals may append setup events.

## Limits

The allowlist currently contains the development organiser identity
`organiser@example.test`; production deployment must replace it deliberately.
Email delivery, organiser UI, family forms, CSRF origin enforcement, and hosted
secrets remain deployment/application work outside this M1 slice.
