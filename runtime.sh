#!/bin/sh
set -eu
umask 077
: "${READECK_SECRET_KEY:?Generate and retain a stable instance secret}"
: "${READECK_OWNER_USERNAME:?Set the initial owner username}"
: "${READECK_OWNER_PASSWORD:?Generate an initial owner password}"
: "${READECK_OWNER_EMAIL:?Set the owner email address}"
: "${READECK_SERVER_BASE_URL:?Set the canonical public URL}"
: "${READECK_ALLOWED_HOSTS:?Set the permitted hostnames}"
[ "${#READECK_SECRET_KEY}" -ge 48 ] || { echo 'Secret must contain at least 48 characters' >&2; exit 1; }
[ "${#READECK_OWNER_PASSWORD}" -ge 16 ] || { echo 'Owner password must contain at least 16 characters' >&2; exit 1; }
export READECK_SERVER_HOST=127.0.0.1 READECK_SERVER_PORT=8001 READECK_SERVER_PREFIX=/ READECK_DATA_DIRECTORY=/readeck/data
mkdir -p /readeck/data
if [ ! -f /readeck/config.toml ]; then
  printf '[main]\ndata_directory = "/readeck/data"\n\n[server]\nhost = "0.0.0.0"\nport = 8000\n' > /readeck/config.toml
fi
if [ "$#" -gt 0 ]; then
  exec readeck "$@"
fi
owner="$(readeck user -config /readeck/config.toml -user "$READECK_OWNER_USERNAME" -dry-run -json)"
if printf '%s' "$owner" | grep -q '"exists":false'; then
  readeck user -config /readeck/config.toml -user "$READECK_OWNER_USERNAME" \
    -email "$READECK_OWNER_EMAIL" -group admin -password env:READECK_OWNER_PASSWORD >/dev/null
fi
unset READECK_OWNER_PASSWORD
exec node /opt/template/proxy.mjs
