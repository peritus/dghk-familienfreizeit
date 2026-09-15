# 11 — Deployment

One Worker, one D1 database, one custom domain. No queues, no KV, no R2, no
Durable Objects.

---

## 1. `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "bettenplan",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],

  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "not_found_handling": "none"
  },

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "bettenplan",
      "database_id": "<from wrangler d1 create>",
      "migrations_dir": "migrations"
    }
  ],

  "vars": {
    "EVENT_NAME": "Familienwochenende 2026",
    "PUBLIC_URL": "https://bettenplan.example.de",
    "EMAIL_FROM": "Familienwochenende <wochenende@example.de>"
  },

  "triggers": {
    "crons": ["0 3 * * *"]
  },

  "observability": { "enabled": true },

  "env": {
    "preview": {
      "name": "bettenplan-preview",
      "d1_databases": [
        { "binding": "DB", "database_name": "bettenplan-preview", "database_id": "…" }
      ],
      "vars": { "PUBLIC_URL": "https://bettenplan-preview.workers.dev" }
    }
  }
}
```

`not_found_handling: "none"` matters. The SPA fallback modes intercept navigation
requests *before* the Worker runs, which would break the magic-link redemption
route — a top-level navigation to `/auth/:token` that never reaches the handler.
This application server-renders every route, so static assets should 404 through
to the Worker and let the router decide.

`EVENT_DATE` and `PREFERENCE_DEADLINE` move to `meta.date` and
`meta.preferenceDeadline` in `event.ts` ([15-event-config](15-event-config.md)
§8) — every age in the solver is computed against `meta.date`, which makes it
a solver input that belongs in `config_hash`. `EVENT_NAME`, `PUBLIC_URL` and
`EMAIL_FROM` **stay** — they are deployment facts, not solver inputs, and must
not enter `config_hash`.

---

## 2. Migrations

Drizzle generates, Wrangler applies.

```bash
npm run db:generate                             # drizzle-kit → migrations/*.sql
npx wrangler d1 migrations apply bettenplan --local
npx wrangler d1 migrations apply bettenplan --remote
```

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId:  process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token:      process.env.CLOUDFLARE_D1_TOKEN!,
  },
})
```

### Rules

**Always `--local` first.** The local database is Miniflare's SQLite in
`.wrangler/state`. Apply, run the test suite, then go remote.

**Migrations are forward-only.** No down migrations. Rolling back a schema change
on a live event database is not a thing anyone will do correctly under pressure;
the recovery path is a restore, covered in §6.

**Drizzle's schema covers projections only.** The `event` table is created by a
hand-written migration and queried with raw SQL. It has one writer and two
readers and does not benefit from an ORM.

**Never edit a generated migration after applying it anywhere.** Add a new one.

**The `tag_assignment` migration** drops the four preference tables it
replaces in the same migration. No data migration is needed if this lands
before real preferences are collected. If it lands after, write a one-off
script that reads the four tables and emits `TagSet` events — do not `INSERT`
into `tag_assignment` directly, because the projection is rebuilt from the log
and a direct insert is undone on the next rebuild.

---

## Weight tuning

There is no weight-editing screen, and this is deliberate. The offline
workflow, from [15-event-config](15-event-config.md) §4:

```bash
wrangler d1 execute bettenplan --remote --json \
  --command "SELECT * FROM event ORDER BY seq" > events.json
npm run tune
```

Export the event log, run `npm run tune`, read the trade-off table, edit
`event.ts`, deploy.

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
wrangler d1 time-travel restore bettenplan --timestamp=2026-09-14T09:00:00Z
```

**Weekly export to a file you control.**

```bash
wrangler d1 export bettenplan --remote --output=backup-$(date +%F).sql
```

Put it somewhere that is not Cloudflare. Run it before every migration and before
every publication.

**The event log is the real backup.** Every projection, every plan, every
assignment is derivable from `event`. If everything else is lost but the event
table survives, the application rebuilds completely. Weekly:

```bash
wrangler d1 execute bettenplan --remote --json \
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
      - run: npm test                    # includes shuffle-invariance + pin corpus
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
      - run: npx wrangler d1 migrations apply bettenplan --remote
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
| Database | Miniflare SQLite | `bettenplan-preview` | `bettenplan` |
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
2. **Export everything.** Event log, full database, and the published plan as a
   PDF.
2a. **Run `npm run tune`** against the exported log and confirm the deployed
    weights are the ones you settled on.
2b. **Confirm preflight is clean**, or that every error-severity finding has
    been acknowledged.
3. **Print the plan.** Room lists per building, workshop lists per slot, a master
   sheet. The hostel's wifi will be bad and someone will need paper.
4. **Verify one magic link end to end** against a real address on the actual
   production domain.
5. **Check the published plan is the one you think it is** — `plan.status =
   'published'`, and its `output_hash` matches what the dashboard shows.
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
| Workers | Free tier covers it several times over |
| D1 | Free tier; the database is a few megabytes |
| Resend | Free tier: ~200 emails covers invitations, reminders and changes |
| Domain | Whatever you already pay |

Realistically zero. The Workers Paid plan becomes relevant only if you switch to
Cloudflare Email Sending for arbitrary recipients.
