# Readeck reading desk support

Template release **v1.0.1** updates documentation and docs verification for the bounded Readeck reading desk. This release must be qualified independently. A source release does not prove marketplace publication; use [PUBLISHING.md](PUBLISHING.md) for exact-source, stored-graph, recovery, capacity and cleanup gates.

## Included contract

One pinned Readeck service, one exclusive SQLite/resource volume, private initial-owner creation before public HTTP, a Host/canonical-origin guard and a loopback crawler SSRF proxy. Native generated instance/owner secrets are preserved. Existing owner passwords are not reset on restart. Operators own token revocation, key escrow and backups.

Login/static pages and allowed-host readiness are public. Private bookmark API access requires authentication; ordinary accounts must not read another owner's article/image/EPUB. Opt-in share links deliberately grant bearer access with a one-hour default lifetime. Neither a share link nor readiness proves account isolation. No public backend/crawler port, TCP database proxy, shared worker volume or Docker socket belongs to this recipe.

## Evidence and limits

October 2, 2026 historical evidence is local. The supplied-resource controlled HTML/PNG fixture passed owner login/token, note/highlight/image-bearing EPUB, anonymous/ordinary-user denial, restart and populated clean-volume export/import with the original token. Separately, actual NASA HTTPS fetching, extracted text and a remote-image EPUB passed across restart and clean-volume restore. Local DNS/address and HTTP/CONNECT SSRF denial checks passed. These results do not qualify a frozen Railway-selected source or live storage/recovery/load.

This is a personal/small trusted-team archive. HA, hostile-tenant isolation, production sizing, universal publisher extraction, JavaScript/paywall/DRM bypass and arbitrary private crawling are outside the contract. Archive only content you may save; no copyright clearance is supplied. Optional share-link and SMTP/password-reset delivery require separate checks. Saved archives have no automatic expiry or application byte cap; monitor volume growth and maintain encrypted off-platform exports. Interrupted in-memory extraction work is not guaranteed to resume.

Selected source/default permission and exposure review does not imply universal assembled-image security/legal certification or a zero-finding scanner policy. Original recipe code is MIT; upstream Readeck remains AGPL-3.0-only with source/notices/network-use obligations. See [README.md](README.md) and [LICENSE](LICENSE).

## Incident and recovery handling

Pause public access and outbound jobs before inspecting private state. Preserve the same instance secret, use a coherent full export or stopped-volume snapshot, and rehearse isolated recovery under [UPGRADE.md](UPGRADE.md). The bootstrap environment password cannot recover or rotate an existing account by restart; use supported account/CLI procedures. SMTP delivery is separately configured.

Public reports should contain only sanitized versions, status and counts. Never attach `.env` files, cookies, credentials, tokens, private source receipts, exported ZIPs, SQLite files or saved articles/images. Report upstream application issues to [Readeck source](https://codeberg.org/readeck/readeck); this recipe does not provide managed backups or incident response.
