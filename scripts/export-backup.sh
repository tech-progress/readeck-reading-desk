#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project="${COMPOSE_PROJECT_NAME:?Set your own readeck-reading-desk-* Compose project}"
[[ "$project" == readeck-reading-desk-* ]] || { echo 'Refusing a project outside this recipe' >&2; exit 1; }
destination="${1:?Usage: export-backup.sh NEW_PRIVATE_BACKUP_FILE}"
[[ ! -e "$destination" ]] || { echo 'Refusing to overwrite a backup' >&2; exit 1; }
umask 077
container_path="/readeck/template-export-$(date +%s)-$$.zip"
compose() { docker compose -p "$project" --env-file "${COMPOSE_ENV_FILE:-$root/.env}" -f "$root/compose.yaml" "$@"; }
trap 'compose exec -T app rm -f "$container_path" >/dev/null 2>&1 || true' EXIT
compose exec -T app readeck export -config /readeck/config.toml "$container_path"
compose cp "app:$container_path" "$destination"
chmod 600 "$destination"
unzip -t "$destination" >/dev/null
echo 'Export ZIP validated structurally. Retain the same instance secret separately; a real restore drill is still required.'
