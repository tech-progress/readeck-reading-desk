import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const read = filename => readFileSync(new URL(filename, root), 'utf8');
const releaseDocuments = ['README.md', 'PUBLISHING.md', 'SUPPORT.md', 'UPGRADE.md', 'MARKETPLACE.md'];
const publicDocuments = [...releaseDocuments, 'VARIABLES.md', 'CHANGELOG.md'];
const publicLinkTargets = new Set([...publicDocuments, 'LICENSE']);
const sourceRepository = 'tech-progress/readeck-reading-desk';
const staleStatus = [
  /\b(?:has|have) (?:never |not (?:yet )?)been (?:deployed|released|published|tested live|live[- ]qualified)\b/i,
  /\b(?:is|remains) (?:unpublished|unreleased|never[- ]deployed)\b/i,
  /\b(?:is|remains) not yet (?:released|published|deployed)\b/i,
  /\bunpublished (?:implementation )?candidate\b/i,
  /\bno (?:existing )?(?:public )?(?:standalone(?: repository| source| distribution)?|draft|deploy code|source|release) (?:exists|has been|yet)\b/i,
  /\b(?:tag|release|standalone repository) (?:does not|doesn't) exist yet\b/i,
  /\b(?:marketplace publication|live qualification) (?:is|remains) pending\b/i,
];

export function loadDocumentation() {
  return {
    version: read('VERSION').trim(),
    upstreamVersion: read('Dockerfile').match(/^FROM codeberg\.org\/readeck\/readeck:([\d.]+)@sha256:/m)?.[1],
    metadata: JSON.parse(read('marketplace-metadata.json')),
    defaults: JSON.parse(read('template-defaults.json')).Readeck,
    documents: Object.fromEntries(publicDocuments.map(filename => [filename, read(filename)])),
  };
}

export function verifyDocumentation({ version, upstreamVersion, metadata, defaults, documents }) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'VERSION: SemVer required');
  assert.ok(upstreamVersion, 'Dockerfile: pinned Readeck version required');
  for (const filename of releaseDocuments) {
    const text = documents[filename];
    const releases = [...text.matchAll(/Template release \*\*v([\d.]+)\*\*/g)];
    assert.equal(releases.length, 1, `${filename}: one release declaration required`);
    assert.equal(releases[0][1], version, `${filename}: release must match VERSION`);
    assert.ok(text.includes('This release must be qualified independently.'), `${filename}: independent release qualification required`);
    assert.match(text, /[Aa] source release does not prove marketplace publication/, `${filename}: source release is not marketplace proof`);
  }
  assert.match(documents['CHANGELOG.md'], new RegExp(`^## ${version.replaceAll('.', '\\.')} — \\d{4}-\\d{2}-\\d{2}$`, 'm'), 'CHANGELOG.md: current version entry required');

  for (const filename of ['README.md', 'PUBLISHING.md', 'UPGRADE.md', 'MARKETPLACE.md']) {
    const text = documents[filename];
    assert.ok(text.includes(`Readeck ${upstreamVersion}`), `${filename}: upstream pin must match Dockerfile`);
    for (const coordinate of [sourceRepository, '`main`', '`release-v1`', 'root `/`', '`v' + version + '`']) {
      assert.ok(text.includes(coordinate), `${filename}: standalone source contract required (${coordinate})`);
    }
  }
  const variables = documents['VARIABLES.md'];
  assert.ok(variables.includes('`v' + version + '`'), 'VARIABLES.md: immutable release must match VERSION');
  for (const [key, value] of Object.entries(defaults)) {
    const row = variables.split('\n').find(line => line.startsWith('| Readeck | `' + key + '` |'));
    assert.ok(row, `VARIABLES.md: required graph variable ${key}`);
    if (value) assert.ok(row.includes('`' + value + '`'), `VARIABLES.md: exact default/reference for ${key}`);
    else assert.match(row, /operator required; blank in graph/, `VARIABLES.md: required operator input for ${key}`);
    assert.ok(documents['README.md'].includes('`' + key + '`') || documents['README.md'].includes('`' + key + '='), `README.md: graph variable ${key}`);
  }
  assert.ok(variables.includes('preserveExisting: true'), 'VARIABLES.md: preserved native secret generators required');

  for (const filename of ['README.md', 'MARKETPLACE.md']) {
    for (const origin of metadata.origins) {
      assert.ok(documents[filename].includes(origin.url), `${filename}: upstream product link required`);
    }
  }
  assert.ok(metadata.description.length >= 45 && metadata.description.length <= 75, 'marketplace description: 45–75 characters required');
  assert.ok(documents['MARKETPLACE.md'].includes(metadata.description), 'MARKETPLACE.md: registered description required');
  assert.deepEqual(documents['MARKETPLACE.md'].match(/^#{1,3} .+$/gm), [
    `# Deploy and Host ${metadata.name} on Railway`,
    `## About Hosting ${metadata.name}`,
    `## Why Deploy ${metadata.name}`,
    '## Common Use Cases',
    `## Dependencies for ${metadata.name}`,
    '### Deployment Dependencies',
  ], 'MARKETPLACE.md: six exact marketplace headings required');

  const readme = documents['README.md'];
  assert.match(readme, /127\.0\.0\.1:8001/, 'README.md: loopback backend boundary required');
  assert.match(readme, /127\.0\.0\.1:8002/, 'README.md: loopback crawler boundary required');
  assert.ok(readme.includes('checks every DNS answer and pins dialing'), 'README.md: bounded crawler DNS/dialing defense required');
  assert.ok(readme.includes('overwrites forwarded origin'), 'README.md: canonical origin guard required');
  assert.ok(readme.includes('Login/static pages') && readme.includes('reachable publicly'), 'README.md: public surface disclosure required');
  assert.ok(readme.includes('Public share links intentionally permit bearer access'), 'README.md: bearer-share exception required');
  assert.ok(readme.includes('unchanged') && readme.includes('AGPL-3.0-only') && readme.includes('MIT'), 'README.md: own MIT and unchanged upstream AGPL boundary required');
  assert.ok(readme.includes('/usr/share/readeck/corresponding-source.tar.gz'), 'README.md: corresponding-source location required');

  for (const filename of releaseDocuments) {
    const text = documents[filename];
    assert.match(text, /historical[\s\S]*local|historical local/i, `${filename}: historical evidence must be local`);
    assert.match(text, /supplied-resource[\s\S]*NASA/, `${filename}: fixture and real public-web evidence must remain distinct`);
  }
  assert.ok(readme.includes('The fixture is not public-web extraction evidence.'), 'README.md: fixture is not real-fetch proof');

  const publishing = documents['PUBLISHING.md'];
  assert.ok(publishing.includes(`${metadata.description.length}-character description`), 'PUBLISHING.md: description length must match metadata');
  assert.ok(publishing.includes('queried stored graph') && publishing.includes('templateDeployV2'), 'PUBLISHING.md: queried stored-graph deployment gate required');
  assert.ok(publishing.includes('exact revision') && publishing.includes('zero crashed replicas'), 'PUBLISHING.md: exact revision/current replica proof required');
  for (const command of ['node scripts/verify-docs.mjs', 'node --test tests/docs.test.mjs', 'scripts/sync-template-marketplace.sh readeck-reading-desk', 'scripts/audit-template-marketplace.sh']) {
    assert.ok(publishing.includes(command), `PUBLISHING.md: required verification step ${command}`);
  }
  assert.ok(publishing.includes("Standard deletion plus verified zero compute and disclosed retention satisfies the owner's cleanup policy."), 'PUBLISHING.md: accepted cleanup policy required');
  assert.ok(publishing.includes('zero running/transitional instances') && publishing.includes('zero queued work'), 'PUBLISHING.md: zero-compute verification required');
  assert.ok(publishing.includes('Physical storage deletion and billing-zero proof are not publication gates under the accepted policy.'), 'PUBLISHING.md: physical-erasure/billing boundary required');
  assert.doesNotMatch(publishing, /(?:wait (?:at least )?48 hours|keep .*unpublished).*?(?:before publication|until .*delet|while .*storage)/i, 'PUBLISHING.md: superseded storage waiting gate');

  for (const [filename, text] of Object.entries(documents)) {
    for (const claim of staleStatus) assert.doesNotMatch(text, claim, `${filename}: stale absolute qualification status`);
    assert.doesNotMatch(text, /FINDINGS\.md|LICENSE_REVIEW\.md|\/tmp\/|\.verification\b|worker3-validation/i, `${filename}: private evidence references are not distributed`);
    assert.doesNotMatch(text, /skyeagle\/railway-templates|root `\/readeck-reading-desk`/, `${filename}: stale authoring-source contract`);
    assert.doesNotMatch(text, /\blistmonk\b|PostgreSQL major upgrades|document PDFs|subscriber lists/i, `${filename}: unrelated product instructions`);
    for (const link of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = link[1].split('#')[0];
      if (!target || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      assert.ok(publicLinkTargets.has(target), `${filename}: link must target distributed public files`);
      assert.ok(existsSync(new URL(target, root)), `${filename}: missing distributed link target`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  verifyDocumentation(loadDocumentation());
  console.log('PASS: release-neutral docs, standalone contract, local evidence boundaries, runtime variables, permissions, marketplace headings, cleanup policy and public links. Live qualification is separate.');
}
