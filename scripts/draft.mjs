import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
process.on('uncaughtException', () => {
  console.error('Draft operation failed: source, variable, networking or volume invariant mismatch. No secret values are printed.');
  process.exit(1);
});
const root = fileURLToPath(new URL('../', import.meta.url));
const [mode, input, output] = process.argv.slice(2);
if (!['restore', 'audit'].includes(mode) || !input || (mode === 'restore' && !output)) {
  throw new Error('Usage: draft.mjs restore SNAPSHOT OUTPUT | audit SNAPSHOT');
}
const load = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const defaults = load('template-defaults.json');
const descriptions = load('template-descriptions.json');
const volumes = load('template-volumes.json');
const networking = load('template-networking.json');
const graph = JSON.parse(execFileSync(resolve(root, 'node_modules/.bin/railway-iac-ts'), ['.railway/railway.ts'], { cwd: root, encoding: 'utf8' }));
assert.equal(graph.ok, true, 'Desired graph must compile');
const desired = Object.fromEntries(graph.graph.resources.filter(resource => resource.type === 'service').map(resource => [resource.name, resource]));
const snapshot = JSON.parse(readFileSync(input, 'utf8'));
const config = snapshot.data?.template?.serializedConfig ?? snapshot.serializedConfig ?? snapshot;
assert.ok(config.services && typeof config.services === 'object', 'Expected serializedConfig services');
const services = Object.values(config.services);
assert.deepEqual(services.map(service => service.name).sort(), Object.keys(desired).sort(), 'Exact service set required');
const volumeIds = new Set();
for (const actual of services) {
  for (const [identifier, mount] of Object.entries(actual.volumeMounts ?? {})) {
    const volumeId = mount.volumeId ?? identifier;
    assert.ok(!volumeIds.has(volumeId), 'Cross-service shared volumes are forbidden');
    volumeIds.add(volumeId);
  }
}
for (const actual of services) {
  const target = desired[actual.name];
  const { type, ...source } = target.source;
  const targetVariables = Object.fromEntries(Object.entries(defaults[actual.name]).map(([key, defaultValue]) => [key, {
    defaultValue, description: descriptions[actual.name][key], isOptional: defaultValue === '' && !/FILE_CONTENTS|SMTP_HOST|SMTP_USERNAME|SMTP_PASSWORD|FROM_ADDRESS|FROM_EMAIL|OWNER_EMAIL/.test(key),
  }]));
  const expectedDomains = networking[actual.name] ? { '<hasDomain>': { port: networking[actual.name].publicPort } } : {};
  const expectedVolume = volumes[actual.name];
  const mounts = Object.values(actual.volumeMounts ?? {});
  assert.equal(mounts.length, expectedVolume ? 1 : 0, 'Draft must already contain the exact intended dedicated volumes');
  if (mode === 'restore') {
    actual.source = source;
    if (target.build) actual.build = target.build; else delete actual.build;
    actual.deploy = { ...target.deploy, startCommand: target.deploy?.startCommand ?? null, numReplicas: 1 };
    actual.deploy.restartPolicyType = 'ON_FAILURE';
    actual.deploy.restartPolicyMaxRetries = 3;
    actual.variables = targetVariables;
    actual.networking = { serviceDomains: expectedDomains, tcpProxies: {} };
    for (const mount of mounts) Object.assign(mount, expectedVolume);
  } else {
    assert.deepEqual(actual.source, source, 'Source type/repo/branch/root or immutable image mismatch');
    assert.deepEqual(actual.build, target.build, 'Build settings mismatch');
    assert.equal(actual.deploy?.startCommand ?? null, target.deploy?.startCommand ?? null, 'Start command mismatch');
    assert.equal(actual.deploy?.healthcheckPath ?? null, target.deploy?.healthcheckPath ?? null, 'Healthcheck mismatch');
    assert.equal(actual.deploy?.healthcheckTimeout ?? null, target.deploy?.healthcheckTimeout ?? null, 'Healthcheck timeout mismatch');
    assert.equal(actual.deploy?.numReplicas, 1, 'Only one replica is supported');
    assert.equal(actual.deploy?.restartPolicyType, 'ON_FAILURE', 'Bounded restart policy required');
    assert.equal(actual.deploy?.restartPolicyMaxRetries, 3, 'Bounded restart retries required');
    assert.equal(actual.deploy?.cronSchedule ?? null, null, 'No unexpected scheduler override');
    assert.deepEqual(actual.networking?.serviceDomains ?? {}, expectedDomains, 'Public port/domain mismatch');
    assert.deepEqual(actual.networking?.tcpProxies ?? {}, {}, 'TCP proxies are forbidden');
    assert.deepEqual(actual.variables, targetVariables, 'Default/generated-secret/reference/description mismatch');
    for (const mount of mounts) {
      assert.equal(mount.mountPath, expectedVolume.mountPath, 'Volume path mismatch');
      assert.equal(mount.sizeMB, expectedVolume.sizeMB, 'Volume size mismatch');
    }
  }
}
if (mode === 'restore') {
  writeFileSync(output, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log('Wrote an offline desired draft; no Railway or GitHub mutation occurred.');
} else console.log('Offline draft source, secrets, private networking, replicas and volumes match.');
