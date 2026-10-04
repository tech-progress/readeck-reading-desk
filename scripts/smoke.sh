#!/usr/bin/env bash
set -euo pipefail
base="${BASE_URL:-http://localhost:${LOCAL_PORT:-18318}}"
ready=false
for attempt in {1..45}; do
  if curl --fail --silent --max-time 3 "${base}/" >/dev/null; then ready=true; break; fi
  sleep 2
done
[[ "$ready" == true ]] || { echo 'Readeck readiness timed out' >&2; exit 1; }
status="$(curl --silent --max-time 10 -o /dev/null -w '%{http_code}' "${base}/api/bookmarks")"
[[ "$status" == 401 || "$status" == 403 ]] || { echo 'Anonymous reading archive was not denied' >&2; exit 1; }
status="$(curl --silent --max-time 10 -o /dev/null -w '%{http_code}' -H 'Host: attacker.invalid' "${base}/")"
[[ "$status" == 400 || "$status" == 403 || "$status" == 421 ]] || { echo "Unapproved Host returned ${status}" >&2; exit 1; }
if [[ -n "${READECK_TOKEN:-}" ]]; then
  curl --fail --silent --max-time 10 -H "Authorization: Bearer ${READECK_TOKEN}" "${base}/api/bookmarks" | jq -e 'type=="array"' >/dev/null
  echo 'PASS: authenticated bookmark list.'
fi
echo 'PASS: readiness, anonymous bookmark denial and unapproved Host rejection.'
echo 'NOT TESTED by this basic smoke: controlled article/image extraction, annotations, EPUB, cross-user denial and full export/import.'
