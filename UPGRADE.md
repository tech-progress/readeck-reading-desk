# Readeck upgrades and recovery

Template release **v1.0.2** adds native-permission checks for saved images and resources, root-only canonical URL enforcement, notice retention and documentation verification; Readeck 0.23.4 and runtime pins remain unchanged. This release must be qualified independently. A source release does not prove marketplace publication. The standalone contract is `tech-progress/readeck-reading-desk`, maintenance `main`, Railway `release-v1`, root `/`, immutable `v1.0.2`; qualify the actual selected revision under [PUBLISHING.md](PUBLISHING.md).

## Upgrade procedure

1. Pause mutation/outbound work, retain the same `READECK_SECRET_KEY` separately and take an encrypted coherent off-platform export or stopped-volume snapshot of all `/readeck`.
2. Restore into an isolated private instance using the old digest. Validate owners, original tokens, annotations, images, EPUB and unrelated-user/anonymous denial before making changes.
3. Review [upstream releases](https://codeberg.org/readeck/readeck/releases), AGPL notices/corresponding source and migration requirements before changing any digest. Floating `latest` is unsupported. Update deployment-contract VERSION/CHANGELOG and locks when needed; freeze a new immutable source tag and compare sanitized standalone source. Never move an existing tag.
4. Upgrade the isolated copy. Readeck performs its own SQLite schema migrations; guarded initialization does not reset an existing owner. Keep one replica and the full dedicated volume. Preserve native generated-secret expressions and their existing values.
5. Repeat controlled-fixture and actual public-web extraction, article/image, note/highlight, EPUB and permission tests. Restart, then export/import into another checked clean volume with the same key and verify the original token. Qualify Railway's exact selected revision and queried stored graph separately; evaluate measured capacity and workload headroom before traffic.
6. Roll back by restoring pre-upgrade SQLite/files/configuration and the same key together under the old pinned app. Reversing an image does not reverse schema migrations. Remove disposable resources with standard deletion, verified zero compute and disclosed retention as documented in [PUBLISHING.md](PUBLISHING.md).

## Backup and restore contract

```bash
COMPOSE_PROJECT_NAME=readeck-reading-desk-your-instance ./scripts/export-backup.sh /private/path/readeck.zip
```

The script invokes `readeck export -config /readeck/config.toml`, validates the ZIP, copies it privately and removes the temporary volume copy. Keep encrypted exports off-platform and the same instance secret outside the volume. A stopped snapshot of all `/readeck` is another coherent option; never copy live SQLite without a consistent backup mechanism.

Initialize an isolated clean restore volume/config with the same key, then explicitly acknowledge replacement of that project:

```bash
COMPOSE_PROJECT_NAME=readeck-reading-desk-restore CONFIRM_RESTORE=readeck-reading-desk-restore \
  ./scripts/restore-backup.sh /private/path/readeck.zip
```

The app remains stopped, and the one-off import publishes no ports. `-clear` replaces all users/data while preserving imported IDs. Without it, users can be skipped and tokens/IDs can change. The script requires exact-project acknowledgment and explicit upstream import completion; exit zero alone is insufficient. Explicitly start the isolated app and check restored owner access, original bearer token, note/highlight, saved images, EPUB and unrelated-user denial before use.

Historical October 2, 2026 local recovery passed the supplied-resource controlled HTML/PNG fixture and, separately, actual NASA HTTPS extraction with a retained remote-image EPUB before/after restart and clean-volume export/import. The original fixture token and annotations survived; ordinary-user/anonymous denial was checked. These local results do not establish customer-data recovery or Railway volume semantics. Retain release-specific recovery evidence privately; a successful backup command is not proof of restored application behavior.
