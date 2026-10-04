#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
for file in Dockerfile compose.yaml .env.example .railway/railway.ts package.json bun.lock VERSION CHANGELOG.md README.md MARKETPLACE.md PUBLISHING.md SUPPORT.md UPGRADE.md LICENSE_REVIEW.md FINDINGS.md VARIABLES.md template-defaults.json template-descriptions.json template-networking.json template-volumes.json marketplace-metadata.json scripts/restore-template-draft.sh scripts/audit-template.sh scripts/smoke.sh scripts/local-test.sh; do
  if [[ "${PUBLIC_DISTRIBUTION:-0}" == 1 && "$file" == FINDINGS.md ]]; then continue; fi
  test -f "$file" || { echo "Missing $file" >&2; exit 1; }
done
for file in scripts/*.sh; do bash -n "$file"; done
for file in scripts/*.mjs; do node --check "$file"; done
[[ ! -f proxy.mjs ]] || node --check proxy.mjs
[[ ! -f runtime.sh ]] || sh -n runtime.sh
[[ ! -f runtime.mjs ]] || node --check runtime.mjs
[[ "${VERIFY_OFFLINE:-0}" == 1 ]] || bun install --frozen-lockfile --no-progress >/dev/null
node scripts/verify.mjs
node scripts/verify-docs.mjs
node scripts/test-crawler.mjs
node --test tests/*.test.mjs
for heading in '# Deploy and Host' '## About Hosting' '## Why Deploy' '## Common Use Cases' '## Dependencies for' '### Deployment Dependencies'; do
  rg -q "^$heading" MARKETPLACE.md
done
export POSTGRES_PASSWORD=verification-only-generated-placeholder
export NEXTAUTH_SECRET=verification-only-long-auth-secret-000000000000
export NEXT_PRIVATE_ENCRYPTION_KEY=verification-only-long-primary-key-000000000
export NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=verification-only-long-secondary-key-000000
export NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS=verification-placeholder-not-a-certificate
export NEXT_PRIVATE_SMTP_HOST=smtp.invalid NEXT_PRIVATE_SMTP_USERNAME=verification NEXT_PRIVATE_SMTP_PASSWORD=verification NEXT_PRIVATE_SMTP_FROM_ADDRESS=owner@example.invalid
export LISTMONK_ADMIN_PASSWORD=verification-only-owner-password LISTMONK_FROM_EMAIL=owner@example.invalid
export READECK_SECRET_KEY=verification-only-stable-instance-secret-0000000000000000 READECK_OWNER_PASSWORD=verification-only-owner-password READECK_OWNER_EMAIL=owner@example.invalid
docker compose -f compose.yaml config --quiet
if find . \( -path './node_modules' -o -path './.local' \) -prune -o -type f \( -name '*.p12' -o -name '*.key' -o -name '*.dump' \) -print | rg -q .; then
  echo 'Unexpected signing material or database backup in source tree' >&2; exit 1
fi
echo 'PASS: structure, locked IaC, Compose, metadata and script syntax. Build/runtime are separate gates.'
