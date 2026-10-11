#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/cloudflare-deploy-test.XXXXXX")"

cleanup() {
  rm -rf "$TEST_ROOT"
}

trap cleanup EXIT

REPO_COPY="$TEST_ROOT/repo"
FAKE_BIN="$TEST_ROOT/bin"
FAKE_HOME="$TEST_ROOT/home"
WRANGLER_CAPTURE="$TEST_ROOT/wrangler-config.json"
WRANGLER_LOG="$TEST_ROOT/wrangler.log"
WRANGLER_PATH_RECORD="$TEST_ROOT/wrangler-config-path"

cp -R "$ROOT_DIR/." "$REPO_COPY"
rm -rf "$REPO_COPY/node_modules" "$REPO_COPY/.deploy" "$REPO_COPY/dist"
mkdir -p "$FAKE_BIN" "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit"

cat > "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json" <<'EOF'
{
  "client_slug": "deployment-target",
  "account_id": "0123456789abcdef0123456789abcdef",
  "account_name": "Test Account",
  "worker_name": "dghk-familienfreizeit",
  "database_name": "dghk-familienfreizeit",
  "database_id": "01234567-89ab-cdef-0123-456789abcdef"
}
EOF

printf '%s\n' 'test-token' \
  > "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/api-token"
chmod 600 \
  "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json" \
  "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/api-token"

cat > "$FAKE_BIN/pnpm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

[[ "${1:-}" == run && "${2:-}" == build ]]
mkdir -p dist/dghk_familienfreizeit dist/dghk_performance dist/client/assets
printf '%s\n' 'export default { tail() {} }' > dist/dghk_performance/index.js
printf '%s\n' 'export default { fetch() { return new Response("ok") } }' \
  > dist/dghk_familienfreizeit/index.js
printf '%s\n' '<!doctype html><html><body>test</body></html>' \
  > dist/client/index.html
EOF

cat > "$FAKE_BIN/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

output=""
url=""
while (($#)); do
  case "$1" in
    -o)
      output="$2"
      shift 2
      ;;
    -w|-H)
      shift 2
      ;;
    -q|-sS)
      shift
      ;;
    *)
      url="$1"
      shift
      ;;
  esac
done

[[ -n "$output" && -n "$url" ]]

if [[ "${FAKE_CURL_MODE:-ok}" == mismatch && "$url" == */accounts/* ]]; then
  printf '%s\n' '{"success":true,"result":{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","name":"Wrong Account"}}' > "$output"
  printf '200'
elif [[ "$url" == */accounts/*/d1/database/* ]]; then
  printf '%s\n' '{"success":true,"result":{"id":"01234567-89ab-cdef-0123-456789abcdef","name":"dghk-familienfreizeit"}}' > "$output"
  printf '200'
elif [[ "$url" == */accounts/*/workers/scripts/* ]]; then
  printf '%s\n' '{"success":false}' > "$output"
  printf '404'
elif [[ "$url" == */accounts/* ]]; then
  printf '%s\n' '{"success":true,"result":{"id":"0123456789abcdef0123456789abcdef","name":"Test Account"}}' > "$output"
  printf '200'
else
  exit 1
fi
EOF

cat > "$FAKE_BIN/wrangler" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

config=""
args=("$@")

for ((i = 0; i < ${#args[@]}; i++)); do
  if [[ "${args[i]}" == "--config" ]]; then
    config="${args[i + 1]}"
  fi
done

[[ -n "$config" ]]
[[ -f "$config" ]]

if [[ "$(jq -r '.main' "$config")" == 'performance/index.js' ]]; then
  cp "$config" "${WRANGLER_CAPTURE:?}.performance"
elif [[ ! -f "${WRANGLER_CAPTURE:?}" ]]; then
  cp "$config" "$WRANGLER_CAPTURE"
else
  cmp "$config" "$WRANGLER_CAPTURE"
fi

printf '%s\n' "$*" >> "${WRANGLER_LOG:?}"
printf '%s\n' "$config" > "${WRANGLER_PATH_RECORD:?}"
EOF

chmod 755 "$FAKE_BIN/pnpm" "$FAKE_BIN/curl" "$FAKE_BIN/wrangler"

run_deploy() {
  HOME="$FAKE_HOME" \
    PATH="$FAKE_BIN:$PATH" \
    WRANGLER_CAPTURE="$WRANGLER_CAPTURE" \
    WRANGLER_LOG="$WRANGLER_LOG" \
    WRANGLER_PATH_RECORD="$WRANGLER_PATH_RECORD" \
    "$REPO_COPY/deploy-cloudflare.sh"
}

assert_contains() {
  local needle="$1"
  local file="$2"

  grep -F -- "$needle" "$file" >/dev/null
}

before_template="$TEST_ROOT/template.before"
cp "$REPO_COPY/deploy/cloudflare/wrangler.json.template" "$before_template"

run_deploy

assert_contains 'd1 migrations apply dghk-familienfreizeit --remote --config' "$WRANGLER_LOG"
assert_contains 'deploy --config' "$WRANGLER_LOG"
jq -e '
  .name == "dghk-familienfreizeit" and
  .account_id == "0123456789abcdef0123456789abcdef" and
  .d1_databases[0].database_name == "dghk-familienfreizeit" and
  .d1_databases[0].database_id == "01234567-89ab-cdef-0123-456789abcdef" and
  .main == "worker/index.js" and
  .vars.DGHK_PERFORMANCE == "on" and
  .tail_consumers[0].service == "dghk-familienfreizeit-performance" and
  .analytics_engine_datasets[0].binding == "PERFORMANCE" and
  .observability.traces.head_sampling_rate == 0.05 and
  .assets.directory == "site"
' "$WRANGLER_CAPTURE" >/dev/null
jq -e '.name == "dghk-familienfreizeit-performance" and .account_id == "0123456789abcdef0123456789abcdef" and .main == "performance/index.js" and .analytics_engine_datasets[0].dataset == "dghk_performance"' "$WRANGLER_CAPTURE.performance" >/dev/null
cmp "$before_template" "$REPO_COPY/deploy/cloudflare/wrangler.json.template"
[[ -f "$WRANGLER_PATH_RECORD" ]]
[[ ! -e "$(cat "$WRANGLER_PATH_RECORD")" ]]

rm "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json"
if run_deploy >/dev/null 2>&1; then
  echo "deployment unexpectedly accepted a missing target configuration" >&2
  exit 1
fi

: > "$WRANGLER_LOG"
cat > "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json" <<'EOF'
{
  "client_slug": "deployment-target",
  "account_id": "0123456789abcdef0123456789abcdef",
  "account_name": "Test Account",
  "worker_name": "dghk-familienfreizeit",
  "database_name": "dghk-familienfreizeit",
  "database_id": "01234567-89ab-cdef-0123-456789abcdef"
}
EOF
chmod 600 "$FAKE_HOME/.config/dghk-familienfreizeit/cloudflare/dghk-familienfreizeit/target.json"

if FAKE_CURL_MODE=mismatch run_deploy >/dev/null 2>&1; then
  echo "deployment unexpectedly accepted a mismatched account" >&2
  exit 1
fi

[[ ! -s "$WRANGLER_LOG" ]]
echo "cloudflare deployment config tests passed"
