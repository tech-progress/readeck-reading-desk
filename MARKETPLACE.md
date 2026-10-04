# Deploy and Host Readeck reading desk on Railway

Private reading archive with annotations, EPUB and backup export

## About Hosting Readeck reading desk

Run [Readeck](https://readeck.org/) 0.23.4 as one pinned service with one exclusive 5,000 MB `/readeck` volume for SQLite, saved resources and configuration. Private owner creation completes before public HTTP. Only the Node host guard's port 8000 is public; backend 8001 and crawler SSRF proxy 8002 stay loopback. Login/static pages and allowed-host readiness are public, while private bookmark API access requires authentication. Opt-in public shares deliberately grant bearer access, with a one-hour default lifetime.

## Why Deploy Readeck reading desk

Keep a personal or trusted small-team reading archive with highlights, notes, saved article resources and EPUB exports. Railway supplies HTTPS ingress and persistent storage; native preserved secret generators supply the instance key and initial owner password. The host guard enforces allowed hosts/canonical origin and the outbound proxy validates all DNS answers and pins public dialing. These defenses do not establish hostile-tenant isolation or universal publisher extraction.

## Common Use Cases

- Save trusted public articles and annotate them privately.
- Export image-bearing EPUBs for offline reading.
- Rehearse full export/import and upgrades before adopting the archive.

## Dependencies for Readeck reading desk

The standalone source contract is [tech-progress/readeck-reading-desk](https://github.com/tech-progress/readeck-reading-desk), maintenance `main`, Railway `release-v1`, root `/` and immutable `v1.0.1`. Template release **v1.0.1** updates documentation and docs verification; Readeck 0.23.4 and pinned runtime are unchanged. This release must be qualified independently. A source release does not prove marketplace publication. Follow [PUBLISHING.md](PUBLISHING.md) for actual source access, exact selected revision, queried stored graph, recovery, headroom, cleanup and live marketplace readback gates.

Main upstream products: [Readeck](https://readeck.org/), [source](https://codeberg.org/readeck/readeck) and [documentation](https://readeck.org/en/docs). Original recipe/guards are MIT; Readeck remains AGPL-3.0-only with corresponding-source/notices/network-use obligations. The unchanged binary's hash-verified tagged source is included in the image. Finite source/default exposure review is not universal image security/legal certification.

### Deployment Dependencies

Use one replica, one exclusive 5,000 MB volume and HTTP port 8000 behind Railway TLS; no external database, worker or SMTP is required for the default archive workflow. Supply owner email and retain the same generated instance key. Keep the initial username stable, canonical HTTPS origin/allowed hosts correct, and generated secrets preserved. Existing owner passwords are not reset on restart. SMTP/password-reset mail and optional share behavior require separate configuration/checks.

Historical local evidence includes a controlled supplied-resource HTML/PNG fixture with annotations, image-bearing EPUB, permission denial and original-token restore; separately, real NASA HTTPS extraction and remote-image EPUB passed across restart and clean-volume export/import. Local results do not establish this release's Railway or marketplace qualification. Saved archives have no automatic expiry or application byte cap: monitor volume growth, retain encrypted off-platform exports and test recovery. HA, arbitrary JavaScript/paywall/DRM bypass, production sizing and hostile-tenant isolation are outside the contract. See [README.md](README.md), [SUPPORT.md](SUPPORT.md) and [UPGRADE.md](UPGRADE.md).
