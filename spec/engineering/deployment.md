# Deployment

One Worker, one D1 database, one custom domain. No queues, no KV, no R2, no
Durable Objects.

---

## 1. `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "dghk-familienfreizeit",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],

  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/auth/*"]
  },

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "dghk-familienfreizeit",
      "database_id": "<from wrangler d1 create>",
      "migrations_dir": "migrations"
    }
  ],

  "vars": {
    "EMAIL_FROM": "Configured event <wochenende@example.de>"
  },

  "triggers": {
    "crons": ["0 3 * * *"]
  },

  "observability": { "enabled": true },

  "env": {
    "preview": {
      "name": "dghk-familienfreizeit-preview",
      "d1_databases": [
        { "binding": "DB", "database_name": "dghk-familienfreizeit-preview", "database_id": "…" }
      ],
    }
  }
}
```

Preserve the [implemented API/auth routing and build](../../docs/architecture/overview.md)
when adding hosted bindings, variables, cron and environments. The example above
shows the target hosted configuration; keep both bare `/api` and `/auth` prefixes
and their descendant patterns from the working configuration.
Deploy the configuration emitted by the Vite build.

### Development-only text event source

The normal source is D1. Local development and tests may explicitly select a
filesystem-backed source in the Vite development host:

```text
EVENT_SOURCE=d1
EVENT_SOURCE=text-file
TEXT_EVENT_FILE=./test/fixtures/event-logs/full-event.kdl
```

`EVENT_SOURCE` defaults to `d1`. Selecting `text-file` requires development
configuration and a KDL file; startup fails closed when either is absent. The
source implements the same load, append, validation, and export contract as D1,
so the Worker-facing API and browser-facing `Event[]` do not change. Filesystem
APIs are confined to the development host and must not be imported by the Worker,
browser production bundle, derive code, resolver, or solver.

The development textarea debug view uses this same source and parser. It may
reload and export the configured file and renders the derived world, plan,
diagnostics, and trace for the current valid text. It is not part of production
navigation, deployment, or authentication, and text-file mode must be rejected
by production configuration even if an environment variable is accidentally
present.

The occasion dates, scoped deadline schedule, and occasion-facing name belong in the
occasion profile's `meta` ([occasion profiles](../profiles/contract.md)) because they are solver
or UI inputs. `EMAIL_FROM` remains a deployment fact and must not enter
`build_revision` and `compatibility_revision`. Authentication links use the
origin of the request handled by the Worker, so local, preview, and production
origins require no duplicated public-URL setting.

### Operational feature bindings

Each declared [feature](../architecture/features.md) has one optional Worker
binding, `DGHK_FEATURE_<ID>=on|off`, whose name is derived from the feature id.
Both values are permitted in every environment, including production. The
bindings are allowlisted deliberately like every other Worker binding, and a test
fails when the allowlist or `src/worker/environment.d.ts` differs from the names
derived from the composed profile.

An invalid value, or a binding that names no declared feature, makes the Worker
refuse to serve application routes; the health response and the startup log name
each invalid binding. The health response reports the set bindings as
`feature_overrides` next to `build_revision` and `compatibility_revision`. These
bindings are deployment facts and must not enter either revision
([features](../architecture/features.md) §6).

### The application bundles

The build produces an entry chunk for login and the family view, and a lazy organiser
chunk. The organiser chunk carries `src/derive/**`, `src/solver/**`, and the active
profile alongside the organiser screens, because the organiser application derives locally
([frontend](../ui/frontend.md) §3). The derivation core is dependency-free TypeScript
and minifies accordingly.

Preserve the [implemented transitive bundle checks and size budgets](../../docs/engineering/testing.md)
as domain code is introduced. The remaining requirement is:

- **The build and compatibility identities travel with the log.** The organiser log response
  carries the Worker's `build_revision` and `compatibility_revision`, and the organiser
  application refuses to derive if its own bundle differs in either. The Worker and
  the bundle are built from one monorepo revision and deployed together (D19); the
  build injects that revision's commit id as `build_revision` (D20). A deploy that
  updates the Worker while a browser holds yesterday's bundle then produces a reload
  prompt rather than a plan computed against the wrong vocabulary. The same
  response carries the Worker's `feature_overrides`; the organiser application
  derives its feature view from them and refuses to derive when they differ from
  the overrides it already holds, so a changed binding produces the same prompt.

---

## 2. Migrations

Hand-written SQL, applied by Wrangler. The schema is the `event` table and the
operational tables in [data model](../architecture/data-model.md); nothing else is stored, so
there is no ORM and no schema generator.

```bash
npx wrangler d1 migrations create dghk-familienfreizeit <name>   # migrations/NNNN_<name>.sql
npx wrangler d1 migrations apply dghk-familienfreizeit --local
npx wrangler d1 migrations apply dghk-familienfreizeit --remote
```

### Rules

**Always `--local` first.** The local database is Miniflare's SQLite in
`.wrangler/state`. Apply, run the test suite, then go remote.

**Migrations are forward-only.** No down migrations. Rolling back a schema change
on a live event database is not a thing anyone will do correctly under pressure;
the recovery path is a restore, covered in §7.

**Never edit a migration after applying it anywhere.** Add a new one.

**Domain model changes are not migrations.** A new label key, entity kind, or
constraint operator changes the fold and the profile, not the database. If old
events stop parsing, write a one-off script that reads the log and appends
corrective events through the ordinary append. Never edit event rows.

---

## 3. Weight review

There is no weight-editing screen, and this is deliberate. Weights are occasion
profile code (D12), so changes are reviewed offline against an exported event log:

```bash
wrangler d1 execute dghk-familienfreizeit --remote --json \
  --command "SELECT * FROM event ORDER BY seq" > events.json
```

Read the exported event log and the resulting assignment evidence, edit the active
occasion profile when a deliberate weight change is approved, and deploy. The
repository does not provide an automated weight-sweep command.

---

## 4. Secrets

```bash
wrangler secret put RESEND_API_KEY
wrangler secret put SESSION_PEPPER      # optional, see below
```

That is the complete list. `SESSION_PEPPER` is optional, but mixing a server-side
secret into the session and magic-link hashes means a database-only leak does not
provide usable session or magic-link hashes offline.

Rotating it invalidates every session and every outstanding magic link, which is
also a useful emergency lever.

Local development uses `.dev.vars`, git-ignored:

```
RESEND_API_KEY=re_dev_...
SESSION_PEPPER=local-only-not-secret
```

---

## 5. Email

Resend over `fetch`. No SDK — Workers have `fetch`, and the API is one endpoint.

```ts
export async function sendEmail(env: Env, msg: Message): Promise<Sent> {
  if (!env.RESEND_API_KEY) {
    console.log('[email] no key; would send:', msg.to, msg.subject)
    console.log('[email] body:', msg.text)
    return { sent: false, reason: 'not-configured' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  })

  if (!res.ok) return { sent: false, reason: `resend-${res.status}` }
  const { id } = await res.json<{ id: string }>()
  return { sent: true, provider_id: id }
}
```

**The graceful no-op is the important part.** With no API key, the magic link is
logged to the console and local development works without ever sending mail.
Copy the link out of the `vite` dev server output and paste it. This is the difference
between a pleasant local loop and one where every login costs a real email.

Every send writes to `email_log`. When someone says they never received their
assignment, you need to know whether you sent it.

### The Cloudflare alternative

Cloudflare's own Email Sending entered public beta in April 2026 — `env.EMAIL.send()`
from a Worker with no API key and no third party. Sending to arbitrary recipients
requires the Workers Paid plan and a conservative per-account daily quota, and
sends to addresses verified in Email Routing do not count against it.

For 55 families and a handful of change emails, either works. Resend is the
default here because its free tier is predictable and the quota story is
simpler. Keep the send behind the single `sendEmail()` function so swapping is a
one-file change.

### Deliverability

- SPF, DKIM and DMARC on the sending domain. Resend walks through this.
- Send from a subdomain (`wochenende.example.de`) so a deliverability problem
  cannot damage the parent domain's reputation.
- Send the invitation batch in chunks with a short delay, not 55 at once.
- Test against a Gmail address, a GMX address and an Outlook address before the
  real batch. German recipients skew heavily to GMX and web.de, which are
  stricter than Gmail and are the ones that will silently bin you.

---

## 6. Scheduled worker

One cron, daily at 03:00, doing exactly one thing:

```ts
export default {
  fetch: app.fetch,
  async scheduled(_c: ScheduledController, env: Env) {
    const now = nowIso()
    await env.DB.batch([
      env.DB.prepare('DELETE FROM magic_link WHERE expires_at < ?1').bind(now),
      env.DB.prepare('DELETE FROM session    WHERE expires_at < ?1').bind(now),
      env.DB.prepare('DELETE FROM rate_limit WHERE expires_at < ?1').bind(now),
    ])
  },
}
```

No scheduled solving, no scheduled emails. Every solve is triggered by an organiser
who is about to look at the result, and every email is triggered by an organiser who
decided to send it. Automatic background sends are how people receive four room
changes in a week and stop reading.

---

## 7. Backups and recovery

Three layers, in increasing order of how much you will regret needing them.

**D1 Time Travel.** Point-in-time restore within the retention window, built in.
Covers the "I applied the wrong migration" case.

```bash
wrangler d1 time-travel restore dghk-familienfreizeit --timestamp=2026-09-14T09:00:00Z
```

**Weekly export to a file you control.**

```bash
wrangler d1 export dghk-familienfreizeit --remote --output=backup-$(date +%F).sql
```

Put it somewhere that is not Cloudflare. Run it before every migration and before
every communication.

**The event log is the real backup.** Every read model, every plan, every
assignment is derived from `event`. If everything else is lost but the event
table survives, only sessions are gone, and families log in again. Weekly:

```bash
wrangler d1 execute dghk-familienfreizeit --remote --json \
  --command "SELECT * FROM event ORDER BY seq" > events-$(date +%F).json
```

That file is small, human-readable, and outlives the application.

---

## 8. CI and deployment

Extend the [implemented CI target](../../docs/engineering/testing.md) with
shuffle-invariance and the constraint corpus as those features are implemented.
Hosted deployment remains outstanding. After verification succeeds on `main`,
the deployment job must install the lockfile, build, apply remote D1 migrations,
and deploy the emitted Worker configuration using `CLOUDFLARE_API_TOKEN` from CI
secrets. Local CI and dev-preview definitions alone do not authorize or configure
a hosted deployment.


Migrations run before deploy so the new code never meets an old schema. Since
migrations are forward-only and additive, the old code meeting a new schema is
harmless for the few seconds it takes.

---

## 9. Environments

| | Local | Preview | Production |
|---|---|---|---|
| Database | Miniflare SQLite | `dghk-familienfreizeit-preview` | `dghk-familienfreizeit` |
| Email | console log | Resend test domain | Resend, real domain |
| Auth | magic link in console | real, seeded organisers | real |
| Data | generated fixtures | anonymised copy | real |

**Never copy production data into preview un-anonymised.** Real names and email
addresses of 150 people including children do not belong in a test environment.
The anonymiser is twenty lines: replace names from a word list, rewrite emails to
`family-N@example.invalid`, keep structure and dates. Run it as part of the copy,
never as a separate step someone might skip.

---

## Release impact of deployment

Changing `build_revision` or `compatibility_revision` affects reproducibility of communicated scopes.
Before deploying, review that impact under [release control](../application/release-control.md)
§4 and arrange organiser review of affected scopes. Do not present a replay under
new code as a verified historical result. Restore the matching deployment or review
and communicate current content explicitly. Ordinary solver hashes remain useful
for regression; they cannot recover an old result.

## 10. Pre-event runbook

The week before, in order:

1. **Freeze the schema.** No migrations after this point without a very good
   reason.
2. **Verify access to the reports.** Confirm that the communicated arrangements and
   the shared family reports are visible in the browser, and that the organiser
   reports show the expected data cut. Reports are not downloadable; print any
   paper copies needed for the occasion from their browser print views.
3. **Review the deployed assignment parameters** against the approved profile
   configuration and confirm that the deployed weights are the ones settled on.
4. **Confirm required scopes are ready**, including the absence of blocking solver
   findings and release consistency failures.
5. **Print the required reports.** Use the report print styles for room lists per
   building, workshop lists per slot, the master sheet, and any confidential
   operational sheets. The hostel's wifi will be bad and someone will need paper.
6. **Verify one magic link end to end** against a real address on the actual
   production domain.
7. **Review release status** — every required scope is communicated at the intended
   basis, `build_revision`, and `compatibility_revision` match the deployment. Use the report and detailed
   preview defined in [release control](../application/release-control.md); communication events
   do not carry a solver or content hash.
8. **Nominate a laptop.** One machine, known to be logged in as an organiser, known
   to have the export. Do not rely on being able to log in from a phone in a
   building with thick walls.

During the occasion, the application is read-only in practice. Changes happen on
paper and get entered afterwards, if at all. Do not plan to re-solve on site;
plan to have printed the right thing.

---

## 11. Cost

| | |
|---|---|
| Workers | Workers Paid, about $5 a month — the CPU allowance per request ([decisions](../../decisions.md) D1) |
| D1 | Included in the Workers Paid allowance; the database is a few megabytes |
| Resend | Free tier: ~200 emails covers invitations, reminders and changes |
| Domain | Whatever you already pay |

About five dollars a month. The Paid plan is chosen for CPU time, not traffic: every
family view and dashboard request derives the plan ([decisions](../../decisions.md) D1). It
also makes Cloudflare Email Sending to arbitrary recipients available, should that
replace Resend.
