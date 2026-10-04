#!/usr/bin/env bash
set -euo pipefail
: "${READECK_TOKEN:?Create a scoped Readeck bearer token privately}"
: "${SMOKE_ARTICLE_URL:?Supply your controlled PUBLIC article containing an image}"
[[ "${SMOKE_APPROVE_MUTATIONS:-}" == yes ]] || { echo 'Set SMOKE_APPROVE_MUTATIONS=yes to create a test bookmark' >&2; exit 1; }
base="${BASE_URL:-http://localhost:${LOCAL_PORT:-18318}}"
temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
payload="$(jq -nc --arg url "$SMOKE_ARTICLE_URL" '{url:$url,labels:["template-smoke"]}')"
curl --fail --silent --max-time 15 -D "$temporary/headers" -o /dev/null \
  -H "Authorization: Bearer $READECK_TOKEN" -H 'Content-Type: application/json' --data "$payload" "$base/api/bookmarks"
location="$(awk 'tolower($1)=="location:" {print $2}' "$temporary/headers" | tr -d '\r')"
bookmark_id="${location##*/}"
[[ "$bookmark_id" =~ ^[A-Za-z0-9]+$ ]] || { echo 'Missing created bookmark id' >&2; exit 1; }
ready=false
for attempt in {1..45}; do
  curl --fail --silent --max-time 5 -H "Authorization: Bearer $READECK_TOKEN" "$base/api/bookmarks/$bookmark_id" > "$temporary/bookmark.json"
  if jq -e '.has_article==true' "$temporary/bookmark.json" >/dev/null; then ready=true; break; fi
  sleep 2
done
[[ "$ready" == true ]] || { echo 'Article extraction did not finish within 90 seconds' >&2; exit 1; }
curl --fail --silent --max-time 15 -H "Authorization: Bearer $READECK_TOKEN" "$base/api/bookmarks/$bookmark_id/article.epub" > "$temporary/article.epub"
unzip -t "$temporary/article.epub" >/dev/null
[[ "$(unzip -p "$temporary/article.epub" mimetype)" == application/epub+zip ]]
echo "PASS: controlled article extraction and valid EPUB container for $bookmark_id. Retained test bookmark for image/annotation/restart checks."
echo 'NOT TESTED: visual image retention, highlights, cross-user denial or restore; inspect and record these separately.'
