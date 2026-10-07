#!/usr/bin/env bash
set -euo pipefail

APP_SLUG="dghk-familienfreizeit"

log() {
  printf 'deploy-cloudflare: %s\n' "$*" >&2
}

die() {
  log "ERROR: $1"
  exit 1
}

if (($# != 0)); then
  die "this command accepts no arguments"
fi

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TARGET_DIR="$HOME/.config/$APP_SLUG/cloudflare/$APP_SLUG"
TARGET_CONFIG="$TARGET_DIR/target.json"
TOKEN_FILE="$TARGET_DIR/api-token"
TEMPLATE="$ROOT_DIR/deploy/cloudflare/wrangler.json.template"
API_BASE="https://api.cloudflare.com/client/v4"

file_mode() {
  local mode

  if mode="$(stat -c '%a' "$1" 2>/dev/null)"; then
    printf '%s\n' "$mode"
  else
    stat -f '%Lp' "$1"
  fi
}

require_file() {
  local label="$1"
  local path="$2"

  [[ -f "$path" ]] || die "missing required file: $path"
  log "$label: regular file found"
}

require_mode_600() {
  local label="$1"
  local path="$2"
  local actual_mode

  actual_mode="$(file_mode "$path")" || die "could not read file mode: $path"
  [[ "$actual_mode" == 600 ]] || die "$label must have mode 600: $path"
  log "$label: mode 600"
}

require_command() {
  local command_name="$1"

  command -v "$command_name" >/dev/null 2>&1 ||
    die "required command is not available: $command_name"
}

require_file "target config" "$TARGET_CONFIG"
require_file "API token" "$TOKEN_FILE"
require_file "Wrangler template" "$TEMPLATE"
require_mode_600 "target config" "$TARGET_CONFIG"
require_mode_600 "API token" "$TOKEN_FILE"

for command_name in curl jq npm wrangler; do
  require_command "$command_name"
done

if ! jq -e '
  type == "object" and
  (keys_unsorted | sort) ==
    ["account_id", "account_name", "client_slug",
     "database_id", "database_name", "worker_name"] and
  (.client_slug | type == "string" and
    test("^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")) and
  (.account_id | type == "string" and
    test("^[a-f0-9]{32}$")) and
  (.account_name | type == "string" and length > 0) and
  (.worker_name | type == "string" and
    test("^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$")) and
  (.database_name | type == "string" and length > 0) and
  (.database_id | type == "string" and
    test("^[0-9a-fA-F-]{36}$"))
' "$TARGET_CONFIG" >/dev/null 2>&1; then
  die "invalid target configuration: $TARGET_CONFIG"
fi

if ! jq -e '
  (.main | type == "string") and
  (.assets.directory | type == "string") and
  (.d1_databases | type == "array" and length == 1)
' "$TEMPLATE" >/dev/null 2>&1; then
  die "invalid Wrangler template: $TEMPLATE"
fi

ACCOUNT_ID="$(jq -er '.account_id' "$TARGET_CONFIG")"
ACCOUNT_NAME="$(jq -er '.account_name' "$TARGET_CONFIG")"
WORKER_NAME="$(jq -er '.worker_name' "$TARGET_CONFIG")"
DATABASE_NAME="$(jq -er '.database_name' "$TARGET_CONFIG")"
DATABASE_ID="$(jq -er '.database_id' "$TARGET_CONFIG")"

API_TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"

[[ -n "$API_TOKEN" ]] || die "API token file is empty"
[[ "$API_TOKEN" != *[[:space:]]* ]] ||
  die "API token must contain one whitespace-free line"

DEPLOY_ROOT="$ROOT_DIR/.deploy"
mkdir -p "$DEPLOY_ROOT"
DEPLOY_DIR="$(mktemp -d "$DEPLOY_ROOT/cloudflare.XXXXXX")"
SITE_DIR="$DEPLOY_DIR/site"
WORKER_DIR="$DEPLOY_DIR/worker"
MIGRATIONS_DIR="$DEPLOY_DIR/migrations"
RENDERED_CONFIG="$DEPLOY_DIR/wrangler.json"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cloudflare-deploy.XXXXXX")"

cleanup() {
  rm -rf "$DEPLOY_DIR" "$TMP_DIR"
}

trap cleanup EXIT

log "building application"
cd "$ROOT_DIR"
pnpm run build >/dev/null

mkdir -p "$SITE_DIR" "$WORKER_DIR" "$MIGRATIONS_DIR"
cp -R "$ROOT_DIR/dist/client/." "$SITE_DIR/" ||
  die "could not stage built client assets"
install -m 0644 "$ROOT_DIR/dist/dghk_familienfreizeit/index.js" \
  "$WORKER_DIR/index.js" || die "could not stage built Worker"
cp -R "$ROOT_DIR/migrations/." "$MIGRATIONS_DIR/" ||
  die "could not stage D1 migrations"

jq \
  --arg account_id "$ACCOUNT_ID" \
  --arg worker_name "$WORKER_NAME" \
  --arg database_name "$DATABASE_NAME" \
  --arg database_id "$DATABASE_ID" \
  '
    .account_id = $account_id
    | .name = $worker_name
    | .d1_databases[0].database_name = $database_name
    | .d1_databases[0].database_id = $database_id
  ' "$TEMPLATE" > "$RENDERED_CONFIG"

chmod 600 "$RENDERED_CONFIG"

api_get() {
  local url="$1"
  local body="$2"
  local status

  status="$(
    curl -q -sS \
      -o "$body" \
      -w '%{http_code}' \
      -H "Authorization: Bearer $API_TOKEN" \
      -H 'Content-Type: application/json' \
      "$url"
  )" || die "Cloudflare API request failed: $url"

  printf '%s' "$status"
}

ACCOUNT_BODY="$TMP_DIR/account.json"
ACCOUNT_STATUS="$(api_get "$API_BASE/accounts/$ACCOUNT_ID" "$ACCOUNT_BODY")"

[[ "$ACCOUNT_STATUS" == 200 ]] ||
  die "configured account is not accessible; HTTP $ACCOUNT_STATUS"

jq -e \
  --arg account_id "$ACCOUNT_ID" \
  --arg account_name "$ACCOUNT_NAME" \
  '
    .success == true and
    .result.id == $account_id and
    .result.name == $account_name
  ' "$ACCOUNT_BODY" >/dev/null ||
  die "Cloudflare account identity does not match target configuration"

D1_BODY="$TMP_DIR/d1.json"
D1_STATUS="$(
  api_get \
    "$API_BASE/accounts/$ACCOUNT_ID/d1/database/$DATABASE_ID" \
    "$D1_BODY"
)"

[[ "$D1_STATUS" == 200 ]] ||
  die "configured D1 database is not accessible; HTTP $D1_STATUS"

jq -e \
  --arg database_id "$DATABASE_ID" \
  --arg database_name "$DATABASE_NAME" \
  '
    .success == true and
    (.result.id // .result.uuid) == $database_id and
    .result.name == $database_name
  ' "$D1_BODY" >/dev/null ||
  die "D1 identity does not match target configuration"

WORKER_BODY="$TMP_DIR/worker.json"
WORKER_STATUS="$(
  api_get \
    "$API_BASE/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
    "$WORKER_BODY"
)"

case "$WORKER_STATUS" in
  200|404)
    ;;
  401|403)
    die "API token is not authorized to access the Worker"
    ;;
  *)
    die "unexpected Worker preflight status: HTTP $WORKER_STATUS"
    ;;
esac

export HOME="$TMP_DIR/home"
export XDG_CONFIG_HOME="$TMP_DIR/xdg"
export CLOUDFLARE_API_TOKEN="$API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"
export CI=1

mkdir -p "$HOME" "$XDG_CONFIG_HOME"

cd "$DEPLOY_DIR"

if ! wrangler d1 migrations apply \
  "$DATABASE_NAME" \
  --remote \
  --config "$RENDERED_CONFIG"; then
  die "D1 migration failed"
fi

if ! wrangler deploy --config "$RENDERED_CONFIG"; then
  die "Worker deployment failed"
fi

log "deployment complete"
