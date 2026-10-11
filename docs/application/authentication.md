# Authentication

The Worker implements invite-only magic-link authentication without passwords.
The event log identifies families; operational tables hold only hashed tokens,
sessions, and rate-limit buckets.

## Login and redemption

The `/login` form submits to `POST /api/login`. The Worker canonicalizes the
submitted email, applies address and IP limits, checks the family-derived world
or the comma-separated runtime organiser allowlist in
`DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS`, and creates a 15-minute
single-use magic link for known identities. The variable is the complete
organiser allowlist: when it is absent or empty, no organiser identities are
configured. The response is uniform and does not reveal whether an address is
invited.

When `DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN=true` is also configured, an
eligible family or organiser receives the single-use link as `magic_link` in the same
JSON response. The login form replaces the input and submit button with a
highlighted orange demo panel offering an “Anmelden” link. This
is a dangerous development adapter, not an
email-delivery replacement; it must be unset for real user authentication.

During local development, requests served on `localhost`, `127.0.0.1`, or
`::1` print the link to the Worker terminal. A non-loopback Station preview may
do so only when the exact preview hostname is supplied through
`DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST` together with the two alarming debug
bindings. The hostname gate prevents those bindings from silently enabling
token logging or insecure cookies on another deployment. Real email delivery
remains a separate deployment concern.

Session cookies are always `Secure`, except when the exact local-preview host
and `DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES=true` are both
configured. Shared and deployed environments must leave these bindings unset.

`GET /auth/:token/` (also accepted without the trailing slash) atomically deletes an unexpired token with `DELETE … RETURNING`,
creates a hashed session, and redirects to `/apps`. Reusing or expiring a
token redirects to the invalid-link screen.

Family sessions idle-expire after 30 days and organiser sessions idle-expire
after 7 days. Absolute lifetimes are 90 days for families and 30 days for
organisers. The secure, HttpOnly, SameSite=Lax cookie contains the raw session
token while D1 stores only its SHA-256 hash. `POST /api/logout` revokes the
hashed session immediately.

## Request authorization

Every request resolves the session email again. Organiser status is checked from
the runtime allowlist on every request. Family status is resolved from the
current folded event world, so a family email change invalidates the old address
without session cleanup.

`GET /api/me` returns `{principal: {email, roles, family_id}}`. Roles is an
array containing `family`, `organiser`, or both. Matching an organiser's email
to the current family email grants both memberships through one session; an
organiser's allowlist membership never grants access to another family's REST
resources. A dual membership uses the stricter organiser expiry policy.
`/apps` enters a sole app or shows equal links to both. An organiser app switch
with pending drafts asks before discarding that in-memory workspace.

The [family REST resources](family-view.md#rest-resources) require the current
family membership, including for an organiser who attends. Organiser subroutes
return JSON 401 to unauthenticated or non-organiser requests; the base
`/api/organiser` returns JSON 404. `POST /api/events` is organiser-only; it sets the
actor server-side, requires same-origin Origin, bounds the body and batch, and
rejects stale heads. Families do not submit events or receive an event log.

Cookie-authenticated mutations require a same-origin `Origin` header. Worker
responses set browser security headers, and authentication/API responses are
not cacheable. Expired magic links, sessions, and rate-limit buckets are removed
by the scheduled cleanup handler.

## Limits

The runtime allowlist is optional and has no built-in organiser identity.
`DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS` must be configured deliberately
where a demo organiser is needed, and `DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN`
must remain unset outside that demo. The local `dev-preview` task creates a
temporary ignored `.dev.vars` file with the synthetic identity
`demo-organiser@example.invalid`; it does not put these values in committed
Wrangler configuration. Email delivery and hosted secrets remain
separate deployment work. A family's mailbox is its authentication boundary:
anyone who can use the shared mailbox can sign in, and a forwarded link can be
redeemed once before its 15-minute expiry. The application does not provide
per-person family accounts or prevent a recipient from forwarding a live link.
