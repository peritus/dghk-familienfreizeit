# Cloudflare deployment

This repository deploys a Vite-built single-page application, its Cloudflare
Worker API, and one D1 database. The deployment entrypoint performs identity
checks before it invokes Wrangler and uses temporary configuration files.

## External target configuration

Keep the account-specific manifest and token outside the repository:

```sh
mkdir -p ~/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit
chmod 700 ~/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit
```

Create `~/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json`:

```json
{
  "client_slug": "deployment-target",
  "account_id": "YOUR_32_CHARACTER_LOWERCASE_HEX_ACCOUNT_ID",
  "account_name": "YOUR_ACCOUNT_DISPLAY_NAME",
  "worker_name": "dghk-familienfreizeit",
  "database_name": "YOUR_D1_DATABASE_NAME",
  "database_id": "YOUR-D1-DATABASE-UUID"
}
```

Set its permissions:

```sh
chmod 600 ~/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json
```

Write exactly one scoped API token line to
`~/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/api-token`,
then set its permissions:

```sh
chmod 600 ~/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/api-token
```

The token must be able to read the configured account, D1 database, and Worker,
apply remote D1 migrations, and deploy the Worker. Never put it in source
control, shell history, logs, or documentation.

The D1 database must already exist. Resource creation is deliberately separate
from deployment; record the returned database ID in `target.json` before
deploying. A missing Worker is allowed by the preflight and can be created by
the deployment.

## Deploy

Install the lockfile dependencies inside the Nix development environment:

```sh
nix develop -c pnpm install --frozen-lockfile
```

Run the deployment only through the project entrypoint:

```sh
make deploy-cloudflare
```

The script builds the application, stages the emitted Worker, browser assets,
and migrations under ignored `.deploy/` storage, and renders a temporary
Wrangler configuration with the external target values. It then verifies the
account and D1 identities through the Cloudflare API, permits either an existing
or not-yet-created Worker, applies remote migrations, and deploys.

Wrangler receives an isolated temporary `HOME` and `XDG_CONFIG_HOME`, so local
OAuth profiles and unrelated configuration cannot be selected accidentally.
Generated configuration, staged assets, and API responses are removed when the
script exits.

## Checks

Run the deployment safety test without contacting Cloudflare:

```sh
nix develop -c bash test/deploy-cloudflare-config.test.sh
```

The test uses fake API and Wrangler executables to verify target identity
checking, generated configuration, explicit `--config` usage, cleanup, and the
fail-closed behavior for missing or mismatched targets.
