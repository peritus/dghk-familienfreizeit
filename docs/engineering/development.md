# Development

## Two tasks

[`.vscode/tasks.json`](../../.vscode/tasks.json) defines exactly two tasks, also
discoverable by `station task list`:

| Task | What it does |
|---|---|
| `ci` | Installs the lockfile, checks types and lint, runs tests, builds both runtimes, verifies shipped assets and bundle boundaries |
| `dev-preview` | Installs the lockfile, starts Vite with the local Worker, local D1 and browser hot reload |

Both use `nix shell nixpkgs#nodejs_22`. With Node 22.12+ (22.x) already available,
the equivalent commands are `npm ci && npm run ci` and `npm ci && npm run dev`.
Do not run both tasks concurrently in the same directory: each installs dependencies.
The npm lockfile is committed; Nix supplies Node, not application dependencies.

The [GitHub workflow](../../.github/workflows/ci.yml) runs the same `npm run ci` target
on pushes, pull requests and manual dispatch. It requires no Cloudflare credentials
and does not deploy. Its first GitHub execution is left to the repository owner.
Task definitions are provided without launching either Station task.

## Dev preview

In VS Code, **Tasks: Run Task → dev-preview** defaults to `127.0.0.1:5173`.
An occupied port fails instead of silently choosing another. A Station launch
can allocate a port on the host's Tailscale IP and allow its exact DNS name:

```sh
station task run dev-preview \
  --env "DGHK_PREVIEW_BIND=$(tailscale ip -4)" \
  --env "DGHK_PREVIEW_HOST=$(tailscale status --json | jq -r '.Self.DNSName | rtrimstr(".")')" \
  --port DGHK_PREVIEW_PORT:DGHK_PREVIEW_BIND \
  --expose-url 'http://${DGHK_PREVIEW_HOST}:${DGHK_PREVIEW_PORT}/'
```

Run from the intended Station session, or add `--target <repo>/<slug>`. Confirm
Tailscale is enabled on that host before launching. Do not bind to `0.0.0.0`,
disable Vite host checks, expose this unauthenticated development server publicly,
or use real family information in it. Station injects the three variables into
the task process; the Vite configuration reads them directly. No machine-specific
hostname or port is committed.

`wrangler.jsonc` uses a local-only placeholder D1 id with `remote: false`. It needs
no account, secrets, cloud database or migration to run M0. `/api/health` checks
the actual local D1 binding, returning `200 {"status":"ok"}` or a sanitized `503`.
Unimplemented API/auth routes return JSON 404, including top-level navigations;
they cannot accidentally return the SPA shell. `/`, `/login`, `/family` and
`/organiser` contain honest foundation placeholders, not authentication or domain
features. The organiser placeholder is public and contains no private data.

Hosted preview/prod deployment requires separate real D1 bindings, environment
configuration and secrets under [deployment](../../spec/engineering/deployment.md). There is no
automatic deployment target in M0.

## Verification

See [testing](testing.md) for the CI checks, bundle budgets, and verification
limits. Run `npm run check:docs` to validate local Markdown links and anchors;
`npm run test:docs` also tests the checker itself. Both are included in CI.

## Implemented scope

M0 delivers build/runtime wiring, a shared German shell, lazy organiser routing,
copied design-system primitives, CI and a runnable preview task definition.
It does not implement authentication, event persistence, migrations, profiles,
solver, release control, email or domain screens. The review findings below are
not silently resolved by the scaffolding; see [the spec review](../../spec/review.md).
