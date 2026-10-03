---
id: "041"
title: Authentication and family-access security readiness
status: open
severity: privacy
category: process
source: Deep security review and login-flow review
related_decisions: []
related_milestones: [M10, M14, M15]
opened: 2026-10-03
---

# Authentication and family-access security readiness

## Problem

Family authentication and family writes are not live yet, but the current
authorization boundary is not ready to expose them. A family principal can
pass the `PersonUpdated` ownership check with its own `family_id` while naming
a person belonging to another family. The fold then accepts the update and can
rewrite that person's family membership. Enabling family login before this is
fixed would create a cross-family write and privacy boundary violation.

The existing authentication contract also names security controls that are
not yet implemented or verified: origin checking, hosted canonical login URLs,
operational cleanup, bounded writes, revocable sessions, and deployment
hardening. The earlier login-flow review additionally identified public-route,
cooldown, logout, and unauthenticated-state work that should be completed as
one coherent access-surface pass.

## Evidence

| Finding | Status and consequence | Evidence |
| --- | --- | --- |
| `PersonUpdated` checks the submitted family rather than the existing person's family | Confirmed vulnerability. A family that knows another person's opaque ID can rewrite that person and move the membership boundary. | [`authorization.ts`](../../../src/auth/authorization.ts) (line 43), [`fold.ts`](../../../src/events/fold.ts) (line 572), [`worker/index.ts`](../../../src/worker/index.ts) (line 213) |
| Family event ownership is not covered by a complete cross-family matrix | The current tests cover selected `PersonAdded` and label cases, but not `PersonUpdated`, `PersonWithdrawn`, module events, or read projections as one matrix. | [`authorization.test.ts`](../../../test/config/authorization.test.ts), [`auth.test.ts`](../../../test/worker/auth.test.ts) |
| Origin/CSRF checking is specified but absent | `SameSite=Lax` and JSON requests mitigate common cross-site cases, but same-site origins and future request changes remain unsafe without the specified boundary check. | [`authentication.md`](../../application/authentication.md) (threat-model table), [`worker/index.ts`](../../../src/worker/index.ts) (line 29) |
| Event requests have no count, byte, depth, or write quota | An authenticated family can submit unbounded batches and grow shared event-log work and storage. Exact platform impact still needs bounded load validation. | [`worker/index.ts`](../../../src/worker/index.ts) (line 216), [`types.ts`](../../../src/events/types.ts) (line 153) |
| Sessions refresh indefinitely and cannot be revoked by logout | A stolen session can remain usable indefinitely if periodically refreshed. There is no logout endpoint or UI action. | [`principal.ts`](../../../src/auth/principal.ts) (lines 20, 42), [`cookies.ts`](../../../src/auth/cookies.ts) |
| Dangerous debug settings fail open | A deployment mistake can print magic-link tokens to observability logs or allow session cookies over HTTP. | [`index.ts`](../../../src/worker/index.ts) (lines 341, 356), [`environment.d.ts`](../../../src/worker/environment.d.ts) |
| `PUBLIC_URL` is specified but not wired into the implementation | The deployment spec defines local/preview/production values, but the Worker environment type and hosted template omit the variable; links currently use the incoming request URL. | [`deployment.md`](../../engineering/deployment.md), [`wrangler.json.template`](../../../deploy/cloudflare/wrangler.json.template), [`environment.d.ts`](../../../src/worker/environment.d.ts), [`index.ts`](../../../src/worker/index.ts) (line 52) |
| Baseline response headers and sensitive-response cache policy are absent | Clickjacking, referrer leakage, MIME confusion, browser policy, and accidental caching remain dependent on unverified edge configuration. | [`index.ts`](../../../src/worker/index.ts) (line 24), [`wrangler.json.template`](../../../deploy/cloudflare/wrangler.json.template) |
| Login timing and operational-table cleanup are not verified | Known and unknown identities take different database paths; expired magic links, sessions, and rate-limit rows require the scheduled cleanup described by the deployment spec. | [`service.ts`](../../../src/auth/service.ts) (line 21), [`deployment.md`](../../engineering/deployment.md) (scheduled-worker section) |
| Production identity and edge defense are not yet release-configured | The organiser allowlist is a source placeholder, Cloudflare Access is only recommended, and the preview/production secret and host configuration are not yet represented by the implementation. | [`allowlist.ts`](../../../src/auth/allowlist.ts) (line 3), [`authentication.md`](../../application/authentication.md) (Cloudflare Access section), [`deployment.md`](../../engineering/deployment.md) (secrets section) |
| Development dependency audit has transitive findings | `npm audit --omit=dev` is clean, but the full development graph reports five `undici` findings (four moderate, one high) through Miniflare/Wrangler tooling. The suggested automatic fix is a breaking upgrade and needs deliberate compatibility testing. | [`package.json`](../../../package.json), audit run on 2026-10-03 |

## Recommendation

Treat this issue as a release gate for family access, not as optional launch
polish. Work through the following order.

### 1. Family-login hard gate — before family users can log in

No family login/session or family write route is considered enabled until all
of these are complete:

1. Fix `PersonUpdated` authorization to identify ownership from the existing
   person, not from the submitted family. The fold must reject a family-change
   masquerading as an ordinary person update. A deliberate cross-family move,
   if ever needed, must be a separate organiser-only event with its own rule.
2. Build a two-family authorization matrix covering every family-writable
   kernel and selected-module event. Test same-family success, other-family
   rejection, missing/deleted target rejection, forged family IDs, and stale
   heads. Include both direct API behavior and the derived post-append world.
3. Test family read projections for the same two families: a family must see
   only its permitted projection, and changing request parameters or opaque
   IDs must not expose another family's people, labels, notes, assignments, or
   operational data.
4. Ensure the UI cannot enable or advertise family editing while this gate is
   open. Keep the gate linked from M10 acceptance and the launch checklist.

### 2. Complete the browser access surface

1. Make `/organiser` redirect unauthenticated visitors to `/login` with a
   validated internal return path. Never treat an arbitrary query parameter as
   a redirect URL. Keep API responses machine-readable `401`/concealment
   responses rather than redirecting API calls.
2. Add a login action to the public shell, including the top-right desktop
   affordance and an accessible equivalent on narrow screens.
3. After a successful magic-link request, keep the client action disabled for a
   short in-memory cooldown and show an explicit message such as “Magic link
   sent; please check your inbox.” The client cooldown is only UX protection;
   server-side address/IP limits remain authoritative. Add keyboard, screen
   reader, error, reload, and cooldown-expiry coverage.
4. Add a session-revocation endpoint that deletes the hashed session and clears
   the cookie. Add logout to organiser and family navigation and return to the
   public shell. Expired/invalid sessions should consistently clear stale
   cookies where the response is already an authentication boundary.

### 3. Enforce the authentication boundary

1. Add trusted-origin checks to every cookie-authenticated mutating endpoint.
   Define the behavior for missing `Origin` explicitly so the importer cannot
   accidentally become a CSRF bypass; prefer an explicit origin or separate
   non-browser credential for scripted writes.
2. Keep the current hashed, single-use, 15-minute magic-link design and
   uniform response. Measure known/unknown timing in preview and remove the
   observable database-path difference where it is material, especially before
   enabling provider email delivery.
3. Keep the current cookie flags, add an absolute session lifetime alongside
   the idle/sliding lifetime, and consider the `__Host-` cookie name on the
   hosted canonical origin.
4. Add application or edge security headers: CSP, HSTS after HTTPS coverage is
   confirmed, `X-Content-Type-Options`, `Referrer-Policy`,
   `Permissions-Policy`, frame protection, and `Cache-Control: no-store` for
   login, session, magic-link, and sensitive API responses.
5. Make dangerous debug settings fail closed outside an explicitly local
   environment. Never print tokens in preview or production logs; verify that
   Worker observability contains no token, cookie, email body, or event payload.

### 4. Bound abuse and operational state

1. Apply cheap edge/IP and request-rate checks before reading and deriving the
   full event log on `/api/login`.
2. Add request-byte, event-count, string-length, JSON-depth, and per-principal
   or per-family write limits to `/api/events`. Validate the limits against D1
   and Worker CPU/storage behavior rather than relying only on browser limits.
3. Make rate-limit updates safe under concurrent requests, return an explicit
   retry indication where useful, and ensure the trusted proxy supplies the
   client IP used for the IP bucket.
4. Add the scheduled cleanup handler for expired magic links, sessions, and
   rate-limit rows. Document retention, emergency session invalidation, and
   the effect of rotating `SESSION_PEPPER`.
5. Replace the source placeholder organiser allowlist with deployment-managed
   configuration and verify that Cloudflare Access, if enabled, is defense in
   depth rather than the application's only authorization check.
6. Keep the production dependency audit clean and update the development
   Miniflare/Wrangler toolchain deliberately to remove or accept the current
   transitive `undici` findings. Do not apply an unreviewed breaking
   `npm audit fix --force`; run the Worker test and deployment-safety suites
   after any tooling upgrade.

### 5. Make URL and environment configuration explicit

`PUBLIC_URL` is already present in the deployment specification, but not in the
current Worker implementation. Wire it through `Env` and the generated
Wrangler configurations, then construct every user-facing magic link from one
validated canonical-origin helper.

| Environment | Required value | Rules |
| --- | --- | --- |
| Local dev | `http://127.0.0.1:5173` (or the actual loopback preview origin) | HTTP allowed only for loopback; console delivery remains explicitly local debug behavior. |
| Cloudflare dev-preview | The preview Worker/custom preview origin | Set as the preview environment's `PUBLIC_URL`; use seeded/anonymised data and a controlled test mailbox/domain. |
| Production | The one HTTPS custom domain | Require HTTPS and an allowlisted host; do not fall back to the request Host header. |

The implementation should fail closed when a hosted environment has no valid
`PUBLIC_URL`. `PUBLIC_URL` and `EMAIL_FROM` remain deployment facts and must not
enter build or compatibility identities. The deployment template should make
the values visible, while account-specific names, database IDs, and secrets
remain external to the repository.

### 6. Launch verification

Before family access or real invitation delivery is announced, run and retain
evidence for:

- authorization and privacy tests for the complete two-family matrix;
- login, cooldown, redirect, logout, expired-session, and invalid-link browser
  flows in local and preview environments;
- Origin/CSRF, cookie, header, cache, host, and open-redirect checks;
- bounded request/load tests for login and event append;
- dependency, lockfile, secret, and production-bundle scans;
- production and development dependency audits, with the current development
  `undici` findings either removed through a tested toolchain update or
  explicitly bounded and accepted;
- email deliverability and token-redaction checks using test mailboxes;
- preview anonymisation, D1 backup/restore, migration, cleanup-cron, and
  emergency session-revocation rehearsal;
- the repository documentation, test, build, and deployment safety gates.

The final M10/M14/M15 launch review should record each check's environment,
revision, result, and owner. A passing local test alone does not prove hosted
Cloudflare configuration.

## Acceptance criteria

- Issue 041 is explicitly a blocking prerequisite for M10 family login and
  family writes.
- A family principal cannot update, move, label, withdraw, or otherwise affect
  another family's entities through any current or selected module event.
- Family read projections have two-family privacy fixtures and pass them.
- `/organiser`, `/login`, public navigation, cooldown, and logout behavior are
  coherent and tested.
- Hosted magic links use validated `PUBLIC_URL` values for preview and
  production; local development remains usable without weakening hosted
  security.
- Origin checks, session lifetime/revocation, headers, request limits, cleanup,
  debug-mode fail-closed behavior, and observability redaction are verified.
- The launch evidence identifies the exact deployed revision and environment;
  no unresolved item in this issue is silently treated as complete.

## Open questions

1. What absolute maximum session lifetime should accompany the existing sliding
   lifetime? Recommendation: 30 days for families and 7 days for organisers,
   with shorter idle limits where practical.
2. Should non-browser import tooling send an explicit trusted `Origin`, or
   should it receive a separate scoped credential so missing `Origin` can be
   rejected for cookie-authenticated browser mutations? Recommendation: keep
   browser cookie writes origin-bound and use a separate explicit mechanism for
   automation.
3. What is the canonical preview hostname: the `workers.dev` name in the
   deployment spec or a custom preview domain? Set exactly one as preview
   `PUBLIC_URL` and test it end to end.

## Related files

- [application/authentication.md](../../application/authentication.md)
- [application/family-view.md](../../application/family-view.md)
- [engineering/deployment.md](../../engineering/deployment.md)
- [roadmap.md](../../roadmap.md)
- [UI-01 login screen](../../ui/screens/login.md)
- [UI-02 invalid login link](../../ui/screens/login-link-invalid.md)
