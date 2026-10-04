#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "${root}/scripts/draft.mjs" restore "${1:?Usage: restore-template-draft.sh SANITIZED_SNAPSHOT NEW_OUTPUT}" "${2:?Output must not already exist}"
