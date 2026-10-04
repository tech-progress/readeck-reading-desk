import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const load = (file) => JSON.parse(readFileSync(file, 'utf8'));
const defaults = load('template-defaults.json');
const descriptions = load('template-descriptions.json');
const volumes = load('template-volumes.json');
const network = load('template-networking.json');
const metadata = load('marketplace-metadata.json');
assert.match(readFileSync('VERSION', 'utf8').trim(), /^\d+\.\d+\.\d+$/);
assert.ok(readFileSync('CHANGELOG.md', 'utf8').includes('## ' + readFileSync('VERSION', 'utf8').trim()));
for (const line of readFileSync('Dockerfile', 'utf8').split('\n').filter(line => line.startsWith('FROM '))) {
  assert.match(line, /@sha256:[a-f0-9]{64}(?: AS [a-z]+)?$/);
}
assert.ok(metadata.description.length >= 45 && metadata.description.length <= 75);
assert.equal(metadata.templateId, null);
assert.equal(metadata.deployCode, null);
assert.ok(metadata.origins.length >= 2);
assert.equal(load('package.json').devDependencies.railway, '3.6.0');
const graph = JSON.parse(execFileSync('./node_modules/.bin/railway-iac-ts', ['.railway/railway.ts'], { encoding: 'utf8' }));
assert.equal(graph.ok, true);
const services = graph.graph.resources.filter(resource => resource.type === 'service');
assert.deepEqual(services.map(service => service.name).sort(), Object.keys(defaults).sort());
assert.equal(Object.keys(network).length, 1);
for (const [name, settings] of Object.entries(network)) assert.equal(defaults[name].PORT, String(settings.publicPort));
for (const service of services) {
  assert.deepEqual(Object.keys(service.variables).sort(), Object.keys(defaults[service.name]).sort());
  for (const [key, value] of Object.entries(defaults[service.name])) {
    assert.ok(descriptions[service.name][key]);
    assert.ok(readFileSync('VARIABLES.md', 'utf8').includes(key));
    if (!value.includes('secret(')) assert.equal(service.variables[key].value, value);
    else {
      assert.equal(service.variables[key].type, 'raw');
      assert.equal(service.variables[key].value.generator, value.slice(3, -2));
      assert.equal(service.variables[key].value.preserveExisting, true);
    }
  }
  if (service.source.type === 'image') assert.match(service.source.image, /@sha256:[a-f0-9]{64}$/);
  else {
    assert.equal(service.source.repo, process.env.TEMPLATE_REPOSITORY ?? 'tech-progress/readeck-reading-desk');
    assert.equal(service.source.branch, process.env.TEMPLATE_BRANCH ?? 'release-v1');
    assert.equal(service.source.rootDirectory, process.env.TEMPLATE_ROOT_DIR ?? '/');
    assert.equal(service.build.builder, 'DOCKERFILE');
    assert.match(readFileSync('Dockerfile', 'utf8'), /@sha256:[a-f0-9]{64}/);
  }
  assert.equal(Object.keys(service.volumeAttachments ?? {}).length, volumes[service.name] ? 1 : 0);
}
assert.equal(graph.graph.resources.filter(resource => resource.type === 'volume').length, Object.keys(volumes).length);
for (const origin of metadata.origins) {
  assert.ok(typeof origin.name === 'string' && origin.name.length > 0);
  assert.ok(typeof origin.url === 'string' && origin.url.startsWith('https://'));
  assert.ok(readFileSync('README.md', 'utf8').includes(origin.url));
}
console.log('Pinned graph, metadata, variables, locks and volumes verified; this is not a publication gate.');
