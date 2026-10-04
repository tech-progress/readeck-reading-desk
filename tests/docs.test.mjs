import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDocumentation, verifyDocumentation } from '../scripts/verify-docs.mjs';

const documentation = loadDocumentation();
const changedDocument = (filename, transform) => ({
  ...documentation,
  documents: { ...documentation.documents, [filename]: transform(documentation.documents[filename]) },
});
const rejectsChange = (filename, transform, message) => {
  assert.throws(() => verifyDocumentation(changedDocument(filename, transform)), message);
};

test('public release docs preserve source, evidence and qualification boundaries', () => {
  verifyDocumentation(documentation);
});

test('rejects version drift, runtime pin drift and missing source coordinates', () => {
  for (const filename of ['README.md', 'PUBLISHING.md', 'SUPPORT.md', 'UPGRADE.md', 'MARKETPLACE.md']) {
    rejectsChange(filename, text => text.replace(`Template release **v${documentation.version}**`, 'Template release **v0.0.0**'), /release must match VERSION/);
  }
  assert.throws(() => verifyDocumentation({ ...documentation, upstreamVersion: '0.0.0' }), /upstream pin must match Dockerfile/);
  rejectsChange('VARIABLES.md', text => text.replace('`v' + documentation.version + '`', '`v0.0.0`'), /immutable release must match VERSION/);
  for (const coordinate of ['tech-progress/readeck-reading-desk', '`main`', '`release-v1`', 'root `/`']) {
    rejectsChange('README.md', text => text.replaceAll(coordinate, 'unknown'), /standalone source contract required/);
  }
});

test('rejects missing variables, default/reference drift and lost native-secret preservation', () => {
  for (const key of Object.keys(documentation.defaults)) {
    rejectsChange('VARIABLES.md', text => text.split('\n').filter(line => !line.startsWith('| Readeck | `' + key + '` |')).join('\n'), /required graph variable/);
  }
  const alteredDefaults = { ...documentation.defaults, READECK_OWNER_PASSWORD: 'static-not-a-generator' };
  assert.throws(() => verifyDocumentation({ ...documentation, defaults: alteredDefaults }), /exact default\/reference/);
  rejectsChange('VARIABLES.md', text => text.replace('preserveExisting: true', 'preserveExisting: false'), /preserved native secret generators required/);
});

test('requires six exact marketplace headings, product origins and registered description', () => {
  for (const heading of documentation.documents['MARKETPLACE.md'].match(/^#{1,3} .+$/gm)) {
    rejectsChange('MARKETPLACE.md', text => text.replace(heading, `${heading} extra`), /six exact marketplace headings/);
    rejectsChange('MARKETPLACE.md', text => text.replace(`${heading}\n`, ''), /six exact marketplace headings/);
  }
  for (const origin of documentation.metadata.origins) {
    for (const filename of ['README.md', 'MARKETPLACE.md']) {
      rejectsChange(filename, text => text.replaceAll(origin.url, 'https://example.invalid/'), /upstream product link required/);
    }
  }
  rejectsChange('MARKETPLACE.md', text => text.replace(documentation.metadata.description, 'Generic hosting.'), /registered description required/);
});

test('rejects loss of public-surface, guard, crawler, share and license disclosures', () => {
  for (const [phrase, message] of [
    ['127.0.0.1:8001', /loopback backend boundary/],
    ['127.0.0.1:8002', /loopback crawler boundary/],
    ['checks every DNS answer and pins dialing', /bounded crawler DNS\/dialing defense/],
    ['overwrites forwarded origin', /canonical origin guard/],
    ['reachable publicly', /public surface disclosure/],
    ['Public share links intentionally permit bearer access', /bearer-share exception/],
    ['AGPL-3.0-only', /own MIT and unchanged upstream AGPL boundary/],
    ['/usr/share/readeck/corresponding-source.tar.gz', /corresponding-source location/],
  ]) {
    rejectsChange('README.md', text => text.replaceAll(phrase, 'omitted'), message);
  }
});

test('rejects fixture-only evidence and stale absolute release status', () => {
  rejectsChange('README.md', text => text.replace('The fixture is not public-web extraction evidence.', 'The fixture proves real web crawling.'), /fixture is not real-fetch proof/);
  for (const filename of ['README.md', 'PUBLISHING.md', 'SUPPORT.md', 'UPGRADE.md', 'MARKETPLACE.md']) {
    rejectsChange(filename, text => text.replaceAll('NASA', 'supplied resources'), /fixture and real public-web evidence/);
  }
  for (const filename of Object.keys(documentation.documents)) {
    for (const claim of [
      'This release has never been deployed.',
      'This release has not yet been published.',
      'This release remains unpublished.',
      'This release is not yet released.',
      'Unpublished implementation candidate.',
      'No existing public standalone repository exists.',
      'No draft exists yet.',
      'The release does not exist yet.',
      'Marketplace publication remains pending.',
    ]) {
      rejectsChange(filename, text => `${text}\n${claim}\n`, /stale absolute qualification status/);
    }
  }
});

test('requires independent exact-source/stored-graph gates and required docs-test steps', () => {
  for (const filename of ['README.md', 'PUBLISHING.md', 'SUPPORT.md', 'UPGRADE.md', 'MARKETPLACE.md']) {
    rejectsChange(filename, text => text.replace('This release must be qualified independently.', 'Historical tests suffice.'), /independent release qualification/);
    rejectsChange(filename, text => text.replace('source release does not prove marketplace publication', 'source release proves marketplace publication'), /source release is not marketplace proof/);
  }
  rejectsChange('PUBLISHING.md', text => text.replaceAll('queried stored graph', 'source project'), /queried stored-graph deployment gate/);
  rejectsChange('PUBLISHING.md', text => text.replaceAll('node --test tests/docs.test.mjs', 'node --check tests/docs.test.mjs'), /required verification step/);
});

test('keeps accepted cleanup strict about compute and conditional about physical retention', () => {
  rejectsChange('PUBLISHING.md', text => text.replace("Standard deletion plus verified zero compute and disclosed retention satisfies the owner's cleanup policy.", 'Cleanup optional.'), /accepted cleanup policy/);
  rejectsChange('PUBLISHING.md', text => text.replace('zero running/transitional instances', 'some running instances'), /zero-compute verification/);
  rejectsChange('PUBLISHING.md', text => text.replace('Physical storage deletion and billing-zero proof are not publication gates under the accepted policy.', 'Physical erasure is required.'), /physical-erasure\/billing boundary/);
  rejectsChange('PUBLISHING.md', text => `${text}\nWait 48 hours for physical storage deletion before publication.\n`, /superseded storage waiting gate/);
});

test('rejects private evidence, nondistributed links and unrelated product instructions', () => {
  for (const filename of Object.keys(documentation.documents)) {
    for (const privateReference of ['[Private proof](FINDINGS.md)', '[Review](LICENSE_REVIEW.md)', '/tmp/worker3-validation/receipt.log']) {
      rejectsChange(filename, text => `${text}\n${privateReference}\n`, /private evidence references/);
    }
  }
  rejectsChange('README.md', text => `${text}\n[Missing guide](missing-guide.md)\n`, /link must target distributed public files/);
  rejectsChange('README.md', text => `${text}\n[Other guide](../README.md)\n`, /link must target distributed public files/);
  rejectsChange('VARIABLES.md', text => `${text}\nSMOKE_API_USER is a listmonk identity.\n`, /unrelated product instructions/);
});
