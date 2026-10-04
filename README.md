# Readeck reading desk

Template release **v1.0.1** aligns standalone source defaults, supports ID-keyed draft graphs, retains the original MIT notice in the image and adds release-document checks; Readeck 0.23.4 and the runtime pins remain unchanged. This release must be qualified independently. A source release does not prove marketplace publication. Use the exact-source and stored-graph gates in [PUBLISHING.md](PUBLISHING.md) before treating a release as Railway-qualified.

Run a private article archive with annotations and EPUB export on one Readeck service and one exclusive 5,000 MB `/readeck` volume. SQLite and saved resources live in `/readeck/data`, with configuration at `/readeck/config.toml`. Use one replica; two extraction workers run in-process. There is no separate database, worker service or Docker socket.

## Main upstream products

- [Readeck](https://readeck.org/)
- [Readeck source](https://codeberg.org/readeck/readeck)
- [Readeck documentation](https://readeck.org/en/docs)

## Source and Railway setup

The standalone distribution contract is [tech-progress/readeck-reading-desk](https://github.com/tech-progress/readeck-reading-desk): maintenance on `main`, Railway source on the slash-free `release-v1` channel, root `/`, and immutable `v1.0.1` identifying the exact release revision. Maintainers must freeze and compare sanitized source, verify access through Railway's GitHub App, and align `.railway/railway.ts` and the queried stored template with those coordinates. A repository link or tag is not evidence of source access, build success or publication. Fork maintainers must set their own accessible repository, release branch and source root.

1. Retain the native preserved generated-secret expressions for `READECK_SECRET_KEY` (64 characters) and `READECK_OWNER_PASSWORD` (32 characters). Supply the required `READECK_OWNER_EMAIL`. Keep `READECK_OWNER_USERNAME=owner` stable: changing it can create another administrator. Initialization uses the supported private user CLI before opening public HTTP and never resets an existing owner. Rotate passwords in Readeck or through its supported private CLI; changing the bootstrap variable does not rotate an existing password or revoke tokens.
2. Set `READECK_SERVER_BASE_URL` to the canonical HTTPS domain. `READECK_ALLOWED_HOSTS` must include that hostname, the Railway private hostname and `healthcheck.railway.app`, without ports. Only the app HTTP guard's `PORT=8000` receives a public domain. Never expose backend port 8001, crawler port 8002 or a public TCP proxy.
3. Attach the dedicated `/readeck` volume, keep one replica and preserve the instance key outside the volume. `READECK_WORKER_NUMBER=2` controls in-process extraction; interrupted jobs in the default in-memory queue are not promised to resume. `READECK_PUBLIC_SHARE_TTL=1` is an opt-in public bearer share-link lifetime in hours, not an account permission check. Avoid shares for confidential material.
4. Monitor storage and measured CPU/memory headroom. Saved articles/resources have no automatic byte cap or archive-expiry policy. A finite volume is not a backup; retain encrypted off-platform exports and rehearse recovery before adoption. SMTP and password-reset delivery require separate configuration.

All nine graph variables and their exact defaults/references are in [VARIABLES.md](VARIABLES.md). Blank owner email is an intentional required operator input, not a usable default. For local use only, copy `.env.example`, generate fresh secrets (for example, `openssl rand -hex 32`), set private values and restrict file permissions. Startup requires a key of at least 48 characters and password of at least 16. Never commit local environment files, tokens, exports or archive contents.

## Default permissions and exposure

Treat upstream request-URL logs as sensitive: optional share/recovery capability URLs can appear in them. Client-supplied forwarded IPs are not verified audit attribution or an authorization boundary.

The wrapper creates the initial administrator before HTTP exposure. Private bookmark API requests require authentication; an ordinary user must not read another owner's bookmarks, images or EPUB. Login/static pages and the allowed-host `/healthz` endpoint are reachable publicly. `/healthz` signals initialized backend readiness and does not prove archive, permission or recovery behavior. Public share links intentionally permit bearer access when created.

The co-located Node HTTP guard enforces allowed Host values and overwrites forwarded origin with the canonical URL because the inspected upstream `allowed_hosts` field is parsed without serving-path enforcement. Readeck listens only on `127.0.0.1:8001`. Its outbound HTTP/HTTPS crawler is routed through a separate loopback `127.0.0.1:8002` SSRF proxy with `NO_PROXY` cleared. The proxy checks every DNS answer and pins dialing to a validated public address; it rejects private, loopback, metadata/link-local, CGNAT, mixed public/private and mapped/translation IPv6 targets and nonstandard crawler ports. Keep upstream deny lists intact. This bounded defense does not establish hostile-tenant isolation or universal extraction safety; archive only trusted public content.

## Local verification and historical evidence

```bash
bun install --frozen-lockfile
node scripts/verify-docs.mjs
node --test tests/docs.test.mjs
./scripts/verify.sh
node scripts/test-crawler.mjs
# In a separately authorized isolated local environment:
./scripts/local-test.sh
# Enable actual HTTPS URL fetching as well as the supplied-resource fixture:
WEB_SOURCE_URL=https://www.nasa.gov/image-article/webb-sheds-light-on-an-exploded-star/ ./scripts/local-test.sh
```

Railway builds the `Dockerfile` and starts its `/bin/sh /opt/template/runtime.sh` entrypoint; do not override it. Local Compose builds the same Dockerfile and binds app HTTP only to loopback (default 18318). The isolated test script builds, starts, exercises and removes its own uniquely named projects; it does not send mail.

Historical local validation on October 2, 2026 recorded two distinct paths. A supplied-resource controlled fixture uploaded HTML and a generated 256×256 PNG without fetching a publisher: owner login/token creation, note/highlight, image-bearing EPUB, anonymous/ordinary-user denial, restart and populated clean-volume export/import with the original token passed. Separately, actual HTTPS fetching of the NASA article above, extracted text and EPUB with a retained remote image passed before and after restart and clean-volume export/import. The fixture is not public-web extraction evidence. Local SSRF address and HTTP/CONNECT denial regressions also passed; owned local test containers, networks and volumes were removed.

Those historical results describe local tests, not Railway deployment or this release's frozen source. They do not establish browser-visible source-unavailable rendering, optional shares/mail, arbitrary publisher fidelity, a live workload soak or customer-data recovery. Repeat the relevant checks on the exact queried stored Railway graph under [PUBLISHING.md](PUBLISHING.md).

`scripts/smoke.sh` checks readiness, anonymous denial and host filtering. `scripts/archive-smoke.sh` optionally writes a controlled public bookmark with an operator-provided scoped `READECK_TOKEN` and `SMOKE_APPROVE_MUTATIONS=yes`; it leaves the bookmark for visual checks and does not certify all image/highlight/recovery behavior.

## Persistence and recovery

Keep the same `READECK_SECRET_KEY` separately and use the supported full export:

```bash
COMPOSE_PROJECT_NAME=readeck-reading-desk-your-instance ./scripts/export-backup.sh /private/path/readeck.zip
```

The script runs `readeck export -config /readeck/config.toml`, validates the ZIP, copies it privately and removes its temporary volume copy. A stopped snapshot of all `/readeck` with the same secret is an alternative; do not copy a live SQLite database without a consistent backup mechanism.

Initialize a separate clean restore volume/config with the same secret, then acknowledge replacement of that exact isolated project:

```bash
COMPOSE_PROJECT_NAME=readeck-reading-desk-restore CONFIRM_RESTORE=readeck-reading-desk-restore \
  ./scripts/restore-backup.sh /private/path/readeck.zip
```

The import runs with no published ports and leaves the app stopped. Supported `-clear` replaces users/data and preserves imported IDs; without it, users may be skipped and tokens/IDs may change. Check owners, original tokens, annotations, saved images, EPUB and unrelated-user denial after explicitly starting the isolated app. Follow [UPGRADE.md](UPGRADE.md) before migration or rollback.

## License and support

Original recipe, host guard and crawler proxy code is owner-approved MIT; see [LICENSE](LICENSE). Readeck remains **AGPL-3.0-only** and its binary is unchanged. The Dockerfile includes the hash-verified complete tagged upstream corresponding source at `/usr/share/readeck/corresponding-source.tar.gz`. Preserve upstream license/REUSE notices and corresponding-source/network-use obligations when distributing or hosting; MIT does not relicense upstream components or marks.

Review covers the selected source and default permission/exposure contract. It is not universal assembled-image security or legal certification and does not require a zero-finding scanner policy. See [SUPPORT.md](SUPPORT.md), [PUBLISHING.md](PUBLISHING.md) and [MARKETPLACE.md](MARKETPLACE.md). Sanitized distributions exclude private findings, evidence journals, credentials and runtime state.
