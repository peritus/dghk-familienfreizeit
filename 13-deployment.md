# 12 — Deployment

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
    "PUBLIC_URL": "https://dghk-familienfreizeit.example.de",
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
      "vars": { "PUBLIC_URL": "https://dghk-familienfreizeit-preview.workers.dev" }
    }
  }
}
```

`run_worker_first` matters. The single-page-application fallback answers
navigation requests with `index.html` *before* the Worker runs, which is what the
React router needs for `/admin/board` and every other client route. It would also
swallow the magic-link redemption — a top-level navigation to `/auth/:token` — and
any API call made by navigation. Listing `/api/*` and `/auth/*` sends those to the
Worker first; everything else is the application.

The Cloudflare Vite plugin reads this file, builds the Worker and the application
together, and writes the deployable configuration into the build output, so
`wrangler deploy` runs after `vite build`.

## Development-only text event source

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

`EVENT_DATE`, `PREFERENCE_DEADLINE`, and the event-facing name belong in the
occasion profile ([occasion profiles](16-event-profiles.md)) because they are solver
or UI inputs. `PUBLIC_URL` and `EMAIL_FROM` remain deployment facts and must not
enter `config_hash`.

### The application bundles

The build produces an entry chunk for login and the attendee view, and a lazy admin
chunk. The admin chunk carries `src/derive/**`, `src/solver/**`, and the active
profile alongside the admin screens, because the admin application derives locally
([frontend](12-frontend.md) §3). The derivation core is dependency-free TypeScript
and minifies accordingly.

Two rules keep that honest:

- **A size budget per chunk, checked in CI.** The build fails if the portal entry
  or the admin chunk exceeds its budget, and if the portal entry ever contains
  solver code. The budget exists so that growth is a decision rather than a drift;
  raise it deliberately when there is a reason.
- **The profile hash travels with the log.** The admin log response carries the
  Worker's `config_hash`, and the admin application refuses to derive if its own
  bundled profile hashes differently. A deploy that updates the Worker while a browser holds yesterday's
  bundle then produces a reload prompt rather than a plan computed against the
  wrong vocabulary.

---

## 2. Migrations

Hand-written SQL, applied by Wrangler. The schema is the `event` table and the
operational tables in [data model](02-data-model.md); nothing else is stored, so
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
the recovery path is a restore, covered in §6.

**Never edit a migration after applying it anywhere.** Add a new one.

**Domain model changes are not migrations.** A new label key, entity kind, or
constraint operator changes the fold and the profile, not the database. If old
events stop parsing, write a one-off script that reads the log and appends
corrective events through the ordinary append. Never edit event rows.

---

## Weight tuning

There is no weight-editing screen, and this is deliberate. The offline
workflow, from [occasion profiles](16-event-profiles.md) §4:

```bash
wrangler d1 execute dghk-familienfreizeit --remote --json \
  --command "SELECT * FROM event ORDER BY seq" > events.json
npm run tune
```

Export the event log, run `npm run tune`, read the trade-off table, edit the
active occasion profile, and deploy.

---

## 3. Secrets

```bash
wrangler secret put RESEND_API_KEY
wrangler secret put SESSION_PEPPER      # optional, see below
```

That is the complete list. `SESSION_PEPPER` is optional: mixing a server-side
secret into the session and magic-link hashes means a database-only leak yields
nothing usable even offline. It costs one string concatenation. Take it.

Rotating it invalidates every session and every outstanding magic link, which is
also a useful emergency lever.

Local development uses `.dev.vars`, git-ignored:

```
RESEND_API_KEY=re_dev_...
SESSION_PEPPER=local-only-not-secret
```

---

## 4. Email

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
  return { sent: true, providerId: id }
}
```

**The graceful no-op is the important part.** With no API key, the magic link is
logged to the console and local development works without ever sending mail.
Copy the link out of `wrangler dev` output and paste it. This is the difference
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

## 5. Scheduled worker

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

No scheduled solving, no scheduled emails. Every solve is triggered by an admin
who is about to look at the result, and every email is triggered by an admin who
decided to send it. Automatic background sends are how people receive four room
changes in a week and stop reading.

---

## 6. Backups and recovery

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
every publication.

**The event log is the real backup.** Every read model, every plan, every
assignment is derived from `event`. If everything else is lost but the event
table survives, only sessions are gone, and families log in again. Weekly:

```bash
wrangler d1 execute dghk-familienfreizeit --remote --json \
  --command "SELECT * FROM event ORDER BY seq" > events-$(date +%F).json
```

That file is small, human-readable, and outlives the application.

---

## 7. CI

```yaml
name: ci
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test                    # includes shuffle-invariance + constraint corpus
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npx wrangler d1 migrations apply dghk-familienfreizeit --remote
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

Migrations run before deploy so the new code never meets an old schema. Since
migrations are forward-only and additive, the old code meeting a new schema is
harmless for the few seconds it takes.

---

## 8. Environments

| | Local | Preview | Production |
|---|---|---|---|
| Database | Miniflare SQLite | `dghk-familienfreizeit-preview` | `dghk-familienfreizeit` |
| Email | console log | Resend test domain | Resend, real domain |
| Auth | magic link in console | real, seeded admins | real |
| Data | generated fixtures | anonymised copy | real |

**Never copy production data into preview un-anonymised.** Real names and email
addresses of 150 people including children do not belong in a test environment.
The anonymiser is twenty lines: replace names from a word list, rewrite emails to
`family-N@example.invalid`, keep structure and dates. Run it as part of the copy,
never as a separate step someone might skip.

---

## 9. Pre-event runbook

The week before, in order:

1. **Freeze the schema.** No migrations after this point without a very good
   reason.
2. **Verify access to the reports.** Confirm that the current published plan and
   the shared attendee reports are visible in the browser, and that the admin
   reports show the expected data cut. Reports are not downloadable; print any
   paper copies needed for the event from their browser print views.
2a. **Run `npm run tune`** against the exported log and confirm the deployed
    weights are the ones you settled on.
2b. **Confirm preflight is clean**, or that every error-severity finding has
    been acknowledged.
3. **Print the required reports.** Use the report print styles for room lists per
   building, workshop lists per slot, the master sheet, and any confidential
   operational sheets. The hostel's wifi will be bad and someone will need paper.
4. **Verify one magic link end to end** against a real address on the actual
   production domain.
5. **Check the published plan is the one you think it is** — the latest
   `PlanPublished.output_hash` matches the plan shown by the dashboard.
6. **Nominate a laptop.** One machine, known to be logged in as an admin, known
   to have the export. Do not rely on being able to log in from a phone in a
   building with thick walls.

During the event, the application is read-only in practice. Changes happen on
paper and get entered afterwards, if at all. Do not plan to re-solve on site;
plan to have printed the right thing.

---

## 10. Cost

| | |
|---|---|
| Workers | Workers Paid, about $5 a month — the CPU allowance per request ([decisions](17-decisions.md) D1) |
| D1 | Included in the Workers Paid allowance; the database is a few megabytes |
| Resend | Free tier: ~200 emails covers invitations, reminders and changes |
| Domain | Whatever you already pay |

About five dollars a month. The Paid plan is chosen for CPU time, not traffic: every
portal and dashboard request derives the plan ([decisions](17-decisions.md) D1). It
also makes Cloudflare Email Sending to arbitrary recipients available, should that
replace Resend.
