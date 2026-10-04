#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "${root}/scripts/draft.mjs" audit "${1:?Usage: audit-template.sh SANITIZED_SNAPSHOT}"
