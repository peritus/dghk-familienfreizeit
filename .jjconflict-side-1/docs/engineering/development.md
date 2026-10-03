# Development

## Tasks

[`.vscode/tasks.json`](../../.vscode/tasks.json) defines three tasks, also
discoverable by `station task list`:

| Task | What it does |
|---|---|
| `ci` | Installs the lockfile, checks types and lint, runs tests, builds both runtimes, verifies shipped assets and bundle boundaries |
| `dev-preview` | Installs the lockfile, starts Vite with the local Worker, local D1 and browser hot reload |
| `storybook` | Installs the lockfile, starts the repository-local Storybook workbench; Station can inject its host and port |

Both use the repository's `nix develop` shell. With Node 22.12+ (22.x) already
available, the equivalent commands are `npm ci && npm run ci` and
`npm ci && npm run dev`. The dev script applies unapplied local D1 migrations
before starting Vite.
Do not run both tasks concurrently in the same directory: each installs dependencies.
The npm lockfile is committed; Nix supplies Node and npm, not application dependencies.

For a direct shell, run `nix develop`, then `npm ci`. The flake lock file pins the
Nix package set, and `nix flake check` verifies that the development shell
evaluates on supported systems. To initialize or repair the local database
without starting Vite, run `npm run db:migrate:local`.

### Importing a fixture through the HTTP API

Use `db:import-fixture` to populate a local or remote Worker through the same
authenticated event API used by the organiser application. The importer parses
and validates the complete KDL fixture with the active profile before uploading
anything, then sends the complete fixture in one request to `POST /api/events`.
This lets the Worker validate and append the fixture atomically, including when
an intermediate prefix is not itself a valid world.

For local development, start the preview and request a magic link for the
organiser identity. The local Worker prints the single-use link in its terminal:

```sh
nix develop --command npm run dev
nix develop --command npm run db:import-fixture -- \
  --base-url http://127.0.0.1:5173 \
  --magic-link 'http://127.0.0.1:5173/auth/<single-use-token>' \
  test/fixtures/room-inventory/djh-luebben.kdl \
  test/fixtures/workshop-assignment/prototype-catalogue.kdl \
  test/fixtures/families/49_families.kdl
```

For a Cloudflare preview or another deployed Worker, use its HTTPS URL and a
single-use organiser magic link from the normal authentication flow:

```sh
nix develop --command npm run db:import-fixture -- \
  --base-url https://preview.example.test \
  --magic-link 'https://preview.example.test/auth/<single-use-token>' \
  test/fixtures/room-inventory/djh-luebben.kdl \
  test/fixtures/workshop-assignment/prototype-catalogue.kdl \
  test/fixtures/families/49_families.kdl
```

An existing `sid` session cookie can be supplied instead with
`--session-cookie`. The importer sends only each fixture event's type, subject,
and payload; the Worker assigns the authenticated actor, current timestamp, and
contiguous sequence number. Pass fixture files in dependency order; the example
loads the DJH room inventory, workshop catalogue, and 49-family dataset as one
stream. The generator can create another synthetic family count with
`nix develop --command node scripts/generate-family-fixture.mjs --count 12`.
Food preferences in the active profile use person-scoped `diet` and `food-note`
traits through the generic family-preferences label/control system. Synthetic
fixtures may include those labels directly; they must not copy prototype data.
It refuses to use a non-empty log by default. If a
previous request failed, use `--resume` with the same fixture and credential;
the importer checks that the server log is an exact fixture prefix and uploads
only the remaining suffix in one request. It refuses mismatched logs. The event
API is append-only, so the importer never resets or deletes a remote log.

To run the full browser route suite locally, use
`nix develop --command npm run test:browser`. It starts the local Vite/Worker
preview on port 5173, waits for `/api/health`, and runs the Chromium tests in
parallel. Use `npm run test:browser:headed` for interactive debugging. Do not
run this command concurrently with `dev-preview` in the same directory unless
the existing server is the intended target.

To work on the local component and screen contract, use
`nix develop --command npm run storybook`. It starts Storybook on its local
default (`127.0.0.1:6006`), does not open a browser automatically, and reads only repository files. `npm run test:storybook` checks the coverage index
and visual baselines; `npm run test:storybook:update` records an intentional
visual change after review. No account, hosted service, or MCP server is needed.

The [GitHub workflow](../../.github/workflows/ci.yml) runs the same `npm run ci` target
on pushes, pull requests and manual dispatch. It requires no Cloudflare credentials
and does not deploy. Its first GitHub execution is left to the repository owner.
Task definitions are provided without launching either Station task.

## Dev preview

In VS Code, **Tasks: Run Task → dev-preview** defaults to `127.0.0.1:5173`.
**Tasks: Run Task → storybook** starts the local visual workbench at
`127.0.0.1:6006` by default; it is also discoverable by `station task list` and
uses the same Nix-backed process definition. When Station variables are absent,
the task falls back to that loopback host and port.
An occupied port fails instead of silently choosing another. A Station launch
can allocate a port on the host's Tailscale IP and allow its exact DNS name:

```sh
station task run dev-preview \
  --env "DGHK_PREVIEW_BIND=$(tailscale ip -4)" \
  --env "DGHK_PREVIEW_HOST=$(tailscale status --json | jq -r '.Self.DNSName | rtrimstr(".")')" \
  --port DGHK_PREVIEW_PORT:DGHK_PREVIEW_BIND \
  --expose-url 'http://${DGHK_PREVIEW_HOST}:${DGHK_PREVIEW_PORT}/'
```

For a Tailscale Storybook session, use the hostname for Storybook's host
allowlist and the Tailscale IP only for Station's bind allocation:

```sh
station task run storybook \
  --env "DGHK_STORYBOOK_BIND=$(tailscale ip -4)" \
  --env "DGHK_STORYBOOK_HOSTNAME=$(tailscale status --json | jq -r '.Self.DNSName | rtrimstr(\".\")')" \
  --port DGHK_STORYBOOK_PORT:DGHK_STORYBOOK_BIND \
  --expose-url 'http://${DGHK_STORYBOOK_HOSTNAME}:${DGHK_STORYBOOK_PORT}/'
```

Run from the intended Station session, or add `--target <repo>/<slug>`. Confirm
Tailscale is enabled on that host before launching. Do not bind to `0.0.0.0`,
disable Vite host checks, expose this unauthenticated development server publicly,
or use real family information in it. Station injects the three variables into
the task process; the Vite configuration reads them directly. No machine-specific
hostname or port is committed.

`wrangler.jsonc` uses a local-only placeholder D1 id with `remote: false`. It needs
no account or hosted secrets to run the local foundation and organiser tests.
`npm run dev` applies `migrations/` to that local database before serving the app,
so a new checkout does not fail with `D1_ERROR: no such table: event`.
`/api/health`
checks the actual local D1 binding, returning `200 {"status":"ok"}` or a
sanitized `503`. The Worker provides login, magic-link, principal, and
organiser log/apply boundaries. `/`, `/login`, and `/family` remain public
foundation routes; organiser routes require an organiser session.

To exercise the organiser browser locally, run the preview and open
`http://127.0.0.1:5173/login`. Submit `organiser@example.test`, watch the Worker
terminal for the clearly marked dangerous-debug magic link, and open it in the
browser. Loopback links are printed automatically; no `.dev.vars` setup is
needed. A non-loopback Station preview must also set
`DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST` to the exact exposed hostname; the preview
task supplies that value from `DGHK_PREVIEW_HOST` and removes its temporary
`.dev.vars` file afterward.

The `dev-preview` task supplies the three explicit local-preview bindings from
its process environment. Wrangler explicitly allowlists them as local Worker
bindings; no `.env` file is read, and no other process environment values are
exposed to the Worker.
Because the Station preview uses plain HTTP on the Tailscale network, the task
also supplies `DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES=true`.
That alarming local-only binding removes the `Secure` attribute from the session
cookie solely for this preview; it must never be set for a shared or deployed
environment.

Hosted preview/prod deployment requires separate real D1 bindings, environment
configuration and secrets under [deployment](../../spec/engineering/deployment.md). There is no
automatic deployment target in M0.

## Verification

See [testing](testing.md) for the CI checks, bundle budgets, and verification
limits. Run `npm run check:docs` to validate local Markdown links and anchors;
`npm run test:docs` also tests the checker itself. Both are included in CI.

## Implemented scope

The implemented foundation includes build/runtime wiring, a shared German shell,
lazy organiser routing, the event kernel, local D1 schema, KDL fixtures,
magic-link authentication, request authorization, and the M4 organiser host.
Inventory, room-assignment review, and the shared organiser draft pipeline are
implemented. Generic reports, release control, email delivery, and later domain
screens remain future work. Open findings against this scope are not silently resolved;
see
[the issue catalog](../../spec/issues/README.md).
