# Readeck variables

These are the nine desired Railway graph variables. Preserve native generated-secret expressions with `preserveExisting: true`; deterministic evaluator output is not a secure credential generator. Never paste resolved credentials into reports or stored-graph snapshots.

| Service | Variable | Default/reference | Purpose |
| --- | --- | --- | --- |
| Readeck | `PORT` | `8000` | Public HTTP guard listener; only this port receives a domain. |
| Readeck | `READECK_SECRET_KEY` | `${{secret(64, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")}}` | Stable generated instance key, minimum 48 characters; retain separately for original tokens and full export/import. |
| Readeck | `READECK_OWNER_USERNAME` | `owner` | Initial administrator username; keep stable to avoid creating another administrator. |
| Readeck | `READECK_OWNER_PASSWORD` | `${{secret(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")}}` | Private generated initial password, minimum 16 characters; existing passwords are not reset and tokens are not revoked by changing it. |
| Readeck | `READECK_OWNER_EMAIL` | **operator required; blank in graph** | Required owner mailbox; SMTP/password-reset delivery needs separate configuration. |
| Readeck | `READECK_SERVER_BASE_URL` | `https://${{Readeck.RAILWAY_PUBLIC_DOMAIN}}` | Canonical HTTPS origin for links, cookies and overwritten forwarded origin. |
| Readeck | `READECK_ALLOWED_HOSTS` | `${{Readeck.RAILWAY_PUBLIC_DOMAIN}},${{Readeck.RAILWAY_PRIVATE_DOMAIN}},healthcheck.railway.app` | Approved comma-separated hostnames, no ports; must include canonical and healthcheck hosts. |
| Readeck | `READECK_WORKER_NUMBER` | `2` | In-process extraction workers, not a separate shared-volume service. |
| Readeck | `READECK_PUBLIC_SHARE_TTL` | `1` | Opt-in public bearer share lifetime in hours; sharing deliberately grants access without account login. |

## Runtime-owned settings

The wrapper forces `READECK_SERVER_HOST=127.0.0.1`, `READECK_SERVER_PORT=8001` and `READECK_DATA_DIRECTORY=/readeck/data`. They are not customization knobs. The host guard binds public `PORT=8000`; the crawler proxy binds `127.0.0.1:8002`, sets `HTTP_PROXY` and `HTTPS_PROXY` to that loopback address and clears `NO_PROXY`. Do not override these controls or weaken upstream crawler deny lists.

## Source selection

- `TEMPLATE_REPOSITORY`: distribution contract `tech-progress/readeck-reading-desk`; forks select their own accessible GitHub source.
- `TEMPLATE_BRANCH`: `release-v1` for Railway, with immutable `v1.0.1` at the exact revision; `main` is the maintenance branch. Slash-containing branches are rejected.
- `TEMPLATE_ROOT_DIR`: `/` for the standalone distribution.

These are authoring inputs, not app service variables or source-access proof. Maintainers must align IaC and the queried stored graph with the contract and verify actual GitHub App access as described in [PUBLISHING.md](PUBLISHING.md).

## Local verification and recovery inputs

- `LOCAL_PORT`: Compose loopback port, default 18318; isolated tests accept 18300–18349.
- `COMPOSE_PROJECT_NAME`: isolated project name with this recipe's required prefix; controls the exact local cleanup/restore target.
- `COMPOSE_ENV_FILE`: private environment file for export/restore, default this directory's `.env`.
- `CONFIRM_RESTORE`: must match the exact isolated restore project name; authorizes destructive `-clear` import there.
- `BASE_URL`: smoke target; defaults to the loopback Compose URL.
- `READECK_TOKEN`: privately supplied scoped bearer token for optional archival smoke; not a graph setting.
- `SMOKE_ARTICLE_URL`: operator-controlled public article URL for optional archival smoke.
- `SMOKE_APPROVE_MUTATIONS=yes`: explicit acknowledgment for optional authenticated smoke writes.
- `WEB_SOURCE_URL`: actual HTTPS public article URL for the real-fetch regression; distinct from the supplied-resource fixture.
- `VERIFY_OFFLINE=1`: skip locked dependency installation only when dependencies are already installed.
- `PUBLIC_DISTRIBUTION=1`: structural-verifier mode for a sanitized standalone copy that excludes internal journals.

Local credentials must be freshly generated and stored privately. The same instance key is required for recovery; startup/bootstrap password changes do not rotate existing account credentials. None of these inputs establishes Railway or marketplace qualification.
