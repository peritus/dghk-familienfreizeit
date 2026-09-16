# 10 — Authentication

Magic link, no passwords, invite-only. One login per family. Admin access is a
code-level allowlist of verified email addresses, exposed through a separate
admin URL and UI.

Roughly 120 lines of Web Crypto. That is a deliberate choice over a library, and
it is only defensible if the rules in §3 are followed exactly.

---

## 1. Why hand-rolled here

Better Auth is a good library. It is also built for a problem this application
does not have: passwords, OAuth providers, account linking, organisations,
two-factor, passkeys, SCIM. Installing it means taking on all of that surface,
plus a per-request instantiation pattern on Workers because the D1 binding only
exists inside the request handler.

What remains after removing everything unused is one flow: prove control of an
email address, get a session. That flow is well understood, is about 120 lines,
and — importantly — is fully readable in one sitting by whoever maintains this
after the event.

**There is also a security argument.** Better Auth versions below 1.6.22 carry a
pre-account-hijacking vulnerability on magic-link sign-in: an attacker registers
with the victim's address and a password, the account stays unverified, and when
the real owner signs in via magic link the account is verified *without* removing
the attacker's password. The precondition is open email/password registration —
which this application does not have, because there is no registration at all.
The relevant lesson is not "the library is bad" but that **the vulnerability
class lives in the interaction between registration and passwordless sign-in**,
and removing registration removes the class.

If you do use the library instead: pin `>= 1.6.22`, disable email/password
entirely, and keep registration closed.

---

## 2. The flow

```
┌── request ──────────────────────────────────────────────────┐
│ POST /api/login { email }                                   │
│   rate-limit check                                          │
│   resolve email: admin allowlist, or family in derive(log)  │
│   if found:                                                 │
│     token = base64url(crypto.getRandomValues(32 bytes))     │
│     INSERT magic_link (sha256(token), email, now+15min)     │
│     send email containing https://…/auth/{token}            │
│   ALWAYS return the same 200 response                       │
└─────────────────────────────────────────────────────────────┘

┌── redeem ───────────────────────────────────────────────────┐
│ GET /auth/:token                                            │
│   DELETE FROM magic_link                                    │
│     WHERE token_hash = sha256(:token)                       │
│       AND expires_at > now                                  │
│     RETURNING email                                         │
│   if no row → 302 to the "link expired or used" screen      │
│   session = base64url(32 random bytes)                      │
│   INSERT session (sha256(session), email, now+30d)          │
│   Set-Cookie; 302 to /                                      │
└─────────────────────────────────────────────────────────────┘
```

### The single-use guarantee

```sql
DELETE FROM magic_link
 WHERE token_hash = ?1 AND expires_at > ?2
 RETURNING email;
```

One statement. Atomic in SQLite. Returns a row exactly once, ever.

This matters specifically because **D1 has no interactive transactions**. A
read-then-delete in two statements is a genuine race: two concurrent requests
with the same token both read it, both create a session. Email clients that
pre-fetch links make this less theoretical than it sounds. `DELETE … RETURNING`
closes it.

### No secret comparison in application code

Tokens are stored hashed and **looked up by hash**. There is never a moment where
application code compares two secrets, so there is no timing side channel to
mitigate — the database index does the comparison, and an attacker learns nothing
from response timing that they could not learn from the response itself.

This is why `magic_link.token_hash` is the primary key rather than a secondary
column: the lookup *is* the verification.

---

## 3. Non-negotiable rules

Admin authorization is checked against the verified login email and allowlist on
every admin request. The special URL is routing, not a credential; knowing it
never grants access.

Follow all of these or use the library instead. Each has a failure mode that is
not obvious from reading the happy path.

**1 — Tokens are single-use, by deletion, in one statement.**
Marking `used_at` and checking it later is two statements and therefore racy.

**2 — Tokens live 15 minutes.**
Long enough for a slow mail server, short enough that a forwarded email or a
mailbox breach later is not a standing key.

**3 — 32 bytes from `crypto.getRandomValues`.**
Not `Math.random`, not a UUID, not a timestamp with a suffix. 256 bits of
entropy makes guessing irrelevant, which is what lets the rest of the design be
simple.

**4 — `POST /api/login` responds identically whether or not the address exists.**
Same status, same body, same timing envelope. This is an invite-only application
for a private event; whether an address is on the guest list is not public
information.

**5 — Rate-limit by address and by IP.**
Five requests per address per hour, twenty per IP per hour. Without this the
login endpoint is a free spam relay pointed at anyone whose address is on the
list.

**6 — The session cookie is `HttpOnly; Secure; SameSite=Lax; Path=/`.**
`Lax` rather than `Strict` because the magic link is a top-level cross-site
navigation from an email client, and `Strict` would drop the cookie on arrival.

**7 — Sessions are stored hashed too.**
A read-only database leak should not yield usable sessions.

**8 — Sessions name an address, and the address is resolved per request.**
A session stores the verified email, never a family id. After
`FamilyEmailChanged` the old address resolves to no family, so its sessions stop
granting access on the next request. There is no session cleanup to forget.

**9 — Nothing about authentication enters the event log.**
No tokens, no hashes, no session ids, not even `LoginSucceeded`. The event log is
domain decisions; these are operational secrets with a deletion policy.

**10 — Admin status is checked per request from the allowlist.**
Not from the cookie, a JWT claim, or a family label. Changing the allowlist
requires a deploy for now, and the lookup uses the verified session identity.

---

## 4. Sessions

```ts
async function currentPrincipal(c: Context): Promise<Principal | null> {
  const raw = getCookie(c, 'sid')
  if (!raw) return null

  const row = await c.env.DB.prepare(
    `SELECT email FROM session WHERE token_hash = ?1 AND expires_at > ?2`
  ).bind(await sha256(raw), nowIso()).first<{ email: string }>()
  if (!row) return null

  if (isAllowlistedAdmin(row.email)) return { kind: 'admin', email: row.email }
  const family = familyByEmail(await worldAtHead(c.env.DB), row.email)
  return family ? { kind: 'family', email: row.email, family } : null
}
```

Two middlewares, used as API route guards:

```ts
const requireFamily = async (c, next) => { … }   // 401; the application shows the login screen
const requireAdmin  = async (c, next) => { … }   // 404, not 403
```

**Admin API routes return 404, not 403.** A logged-in non-admin family probing
`/api/admin` should not learn that the routes exist. There is no legitimate reason a
family would land there, so there is no usability cost to the lie.

The admin application's code is a static asset, like any frontend bundle, and
anyone can download it. It contains no data. Everything it shows arrives through
`/api/admin/*`, which checks the allowlist on every request.

Sessions last 30 days for families — long enough to cover a six-week run-up with
one login — and 7 days for admins, refreshed on use. Admins log in weekly anyway;
families should not have to log in twice.

---

## 5. Threat model

Honest about what this defends against and what it does not.

| Threat | Handled how |
|---|---|
| Token guessing | 256 bits of entropy; not feasible |
| Token replay | Single-use deletion |
| Stale token from an old email | 15-minute expiry |
| Database read leak | Tokens and sessions stored hashed |
| Session theft via XSS | `HttpOnly`; plus no user-generated HTML is ever rendered unescaped |
| CSRF | `SameSite=Lax` plus origin checking on every mutating request |
| Address enumeration | Uniform response on `/api/login` |
| Login-endpoint abuse as a spam relay | Rate limits on address and IP |
| Timing attacks on token comparison | No comparison exists; lookup is by hash |
| Admin privilege escalation | Allowlist checked against the verified address per request |
| **Shared mailbox access** | **Not handled — see below** |
| **Forwarded magic link within 15 minutes** | **Not handled — see below** |

The last two are accepted risks, and the reasoning should be recorded rather than
assumed:

**One email per family means the email is the credential.** Anyone with access to
the family mailbox is the family. That is the actual requirement — households
share mailboxes and both parents should be able to log in. Attempting per-person
authentication would be worse: it would create five logins per family for a form
they fill in together once.

**What could someone do with stolen access?** See where one family sleeps, change
that family's preferences, and see the names of people sharing their room. No
payment data, no addresses, no phone numbers, no documents. The consequence of
compromise is low, which is what justifies the simplicity everywhere else.

**Admins are the higher-value target**, which is why admin sessions are shorter
and why Cloudflare Access in front of `/admin` is recommended during the build
(§6). Compromising an admin means access to the full attendee list.

---

## 6. Cloudflare Access as defence in depth

During development and the early run-up, put Cloudflare Access in front of
`/admin/*` in addition to the application's own check. Free for small teams, adds
a second independent factor, and costs no application code.

Remove it before handing the tool to a non-technical organiser if the extra login
becomes friction — but only then, and only once the application's own admin path
has been exercised properly.

The application check must work correctly with or without Access present. Access
is a second lock on the same door, never the only lock.

---

## 7. What is deliberately absent

- **Password reset.** No passwords.
- **Email verification.** Redeeming a magic link *is* verification.
- **Account deletion self-service.** 55 families, one weekend. Email the
  organisers.
- **Remember-me.** The session is already 30 days.
- **Multi-session management.** Nobody will ask which devices are signed in.
- **Login audit trail visible to families.** Would need explaining, would raise
  more questions than it answers, and nothing valuable is behind the login.
