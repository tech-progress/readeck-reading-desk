#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
port="${LOCAL_PORT:-18318}"
[[ "$port" =~ ^183[0-4][0-9]$ ]] || { echo 'Use loopback ports 18300–18349 only' >&2; exit 1; }
project="readeck-reading-desk-local-$$"
export COMPOSE_PROJECT_NAME="$project" LOCAL_PORT="$port"
temporary="$(mktemp -d)"
umask 077
compose() { timeout 600 docker compose --project-name "$project" --env-file "$temporary/environment" -f "$root/compose.yaml" "$@"; }
restore_project="$project-restore"
restore_compose() { timeout 600 docker compose --project-name "$restore_project" --env-file "$temporary/environment" -f "$root/compose.yaml" "$@"; }
cleanup() {
  compose down --volumes --remove-orphans --rmi local --timeout 15 >/dev/null 2>&1 || true
  restore_compose down --volumes --remove-orphans --rmi local --timeout 15 >/dev/null 2>&1 || true
  rm -rf "$temporary"
}
trap cleanup EXIT
secret="$(openssl rand -hex 32)"
cat > "$temporary/environment" <<ENV
POSTGRES_PASSWORD=$secret
LOCAL_PORT=$port
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXT_PRIVATE_ENCRYPTION_KEY=$(openssl rand -hex 32)
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=$(openssl rand -hex 32)
NEXT_PUBLIC_WEBAPP_URL=http://localhost:$port
NEXT_PRIVATE_SMTP_HOST=smtp.example.invalid
NEXT_PRIVATE_SMTP_USERNAME=local-smoke
NEXT_PRIVATE_SMTP_PASSWORD=$(openssl rand -hex 24)
NEXT_PRIVATE_SMTP_FROM_ADDRESS=owner@example.invalid
LISTMONK_ADMIN_USER=owner
LISTMONK_ADMIN_PASSWORD=$(openssl rand -hex 24)
LISTMONK_PUBLIC_URL=http://localhost:$port
LISTMONK_FROM_EMAIL=owner@example.invalid
READECK_SECRET_KEY=$(openssl rand -hex 32)
READECK_OWNER_USERNAME=owner
READECK_OWNER_PASSWORD=$(openssl rand -hex 24)
READECK_OWNER_EMAIL=owner@example.invalid
READECK_SERVER_BASE_URL=http://localhost:$port
ENV

compose build --pull=false
if compose run --rm --no-deps -T -e READECK_OWNER_PASSWORD= app > "$temporary/unsafe-bootstrap.log" 2>&1; then
  echo 'Unclaimed owner setup unexpectedly allowed startup' >&2; exit 1
fi
grep -q 'READECK_OWNER_PASSWORD' "$temporary/unsafe-bootstrap.log"
echo 'PASS: absent private owner password refuses startup before initialization or HTTP.'
if compose run --rm --no-deps -T -e "READECK_SERVER_BASE_URL=http://localhost:$port/archive/" app > "$temporary/unsafe-prefix.log" 2>&1; then
  echo 'Unsupported prefixed hosting unexpectedly allowed startup' >&2; exit 1
fi
grep -q 'Canonical base URL must be a root HTTP(S) origin' "$temporary/unsafe-prefix.log"
echo 'PASS: prefixed canonical origins fail before public listening.'
compose up -d --wait --wait-timeout 150
BASE_URL="http://localhost:$port" ./scripts/smoke.sh
compose exec -T app readeck user -config /readeck/config.toml -user owner -dry-run -json | jq -e '.exists==true' >/dev/null
compose exec -T app sh -c 'test -s /readeck/data/db.sqlite3 || find /readeck/data -type f'
compose exec -T app readeck user -config /readeck/config.toml -user unrelated -group user -password env:READECK_OWNER_PASSWORD >/dev/null
node "$root/scripts/fixture-smoke.mjs" create "$temporary/environment" "$temporary/fixture-state.json"
if [[ -n "${WEB_SOURCE_URL:-}" ]]; then node "$root/scripts/web-smoke.mjs" create "$temporary/environment" "$temporary/web-state.json"; fi
compose restart app --timeout 15
BASE_URL="http://localhost:$port" ./scripts/smoke.sh
node "$root/scripts/fixture-smoke.mjs" check "$temporary/environment" "$temporary/fixture-state.json"
if [[ -n "${WEB_SOURCE_URL:-}" ]]; then node "$root/scripts/web-smoke.mjs" check "$temporary/environment" "$temporary/web-state.json"; fi
COMPOSE_ENV_FILE="$temporary/environment" COMPOSE_PROJECT_NAME="$project" ./scripts/export-backup.sh "$temporary/export.zip"
compose stop app --timeout 15
restore_compose build --pull=false
restore_compose up -d --wait --wait-timeout 150
COMPOSE_ENV_FILE="$temporary/environment" COMPOSE_PROJECT_NAME="$restore_project" CONFIRM_RESTORE="$restore_project" ./scripts/restore-backup.sh "$temporary/export.zip"
restore_compose start app
BASE_URL="http://localhost:$port" ./scripts/smoke.sh
node "$root/scripts/fixture-smoke.mjs" check "$temporary/environment" "$temporary/fixture-state.json"
if [[ -n "${WEB_SOURCE_URL:-}" ]]; then node "$root/scripts/web-smoke.mjs" check "$temporary/environment" "$temporary/web-state.json"; fi
echo 'PASS: full supported export/import into a fresh isolated volume with the same instance secret.'
echo 'PASS: build, startup, supplied-resource article/image/highlight/EPUB/auth, restart and restore. Railway publication remains a separate gate.'
if [[ -n "${WEB_SOURCE_URL:-}" ]]; then echo 'PASS: actual public-web article/image extraction and restart/clean-volume restore.'; fi
