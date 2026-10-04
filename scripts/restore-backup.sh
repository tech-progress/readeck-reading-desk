#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="${COMPOSE_PROJECT_NAME:?Set your isolated readeck-reading-desk-* restore project}"
[[ "$project" == readeck-reading-desk-* ]] || { echo 'Refusing a project outside this recipe' >&2; exit 1; }
[[ "${CONFIRM_RESTORE:-}" == "$project" ]] || { echo 'Set CONFIRM_RESTORE to the exact project name; -clear replaces all accounts and archives' >&2; exit 1; }
backup="$(realpath "${1:?Usage: restore-backup.sh PRIVATE_EXPORT_ZIP}")"
unzip -t "$backup" >/dev/null
compose() { docker compose -p "$project" --env-file "${COMPOSE_ENV_FILE:-$root/.env}" -f "$root/compose.yaml" "$@"; }
compose stop app --timeout 15
log="$(mktemp)"
trap 'rm -f "$log"' EXIT
printf 'y\n' | compose run --rm --no-deps -T --volume "$backup:/restore.zip:ro" app import -config /readeck/config.toml -clear /restore.zip | tee "$log"
grep -q 'import done!' "$log" || { echo 'Upstream import did not report completion; the app remains stopped' >&2; exit 1; }
echo 'Import finished with the app stopped. Start explicitly, verify account/annotation/image/EPUB/token behavior, then record the drill.'
