import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const graph = JSON.parse(execFileSync(join(root, 'node_modules/.bin/railway-iac-ts'), ['.railway/railway.ts'], { cwd: root, encoding: 'utf8' }));
const desired = graph.graph.resources.find(resource => resource.type === 'service');

for (const shape of ['array', 'object']) {
  test(`draft ${shape} restoration preserves identifiers and rejects drift`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'readeck-draft-'));
    try {
      const input = join(directory, 'input.json');
      const output = join(directory, 'output.json');
      const service = { name: desired.name, volumeMounts: { 'existing-volume': { mountPath: '/wrong', sizeMB: 1 } } };
      writeFileSync(input, JSON.stringify({ services: shape === 'array' ? [service] : { 'existing-service': service } }));
      execFileSync(process.execPath, ['scripts/draft.mjs', 'restore', input, output], { cwd: root });
      execFileSync(process.execPath, ['scripts/draft.mjs', 'audit', output], { cwd: root });
      const config = JSON.parse(readFileSync(output, 'utf8'));
      if (shape === 'object') assert.deepEqual(Object.keys(config.services), ['existing-service']);
      const restored = Object.values(config.services)[0];
      assert.deepEqual(Object.keys(restored.volumeMounts), ['existing-volume']);
      assert.deepEqual(restored.volumeMounts['existing-volume'], { mountPath: '/readeck', sizeMB: 5000 });
      assert.equal(restored.variables.READECK_OWNER_EMAIL.defaultValue, '');
      assert.equal(restored.variables.READECK_OWNER_EMAIL.isOptional, false);
      assert.match(restored.variables.READECK_SECRET_KEY.defaultValue, /secret\(64/);
      for (const mutate of [
        value => { value.source.branch = 'main'; },
        value => { value.deploy.numReplicas = 2; },
        value => { value.deploy.cronSchedule = '* * * * *'; },
        value => { value.variables.READECK_OWNER_EMAIL.isOptional = true; },
        value => { value.variables.READECK_OWNER_PASSWORD.value = 'resolved-secret'; },
        value => { value.networking.tcpProxies = { exposed: { port: 8001 } }; },
        value => { value.volumeMounts['existing-volume'].mountPath = '/readeck/data'; },
      ]) {
        const changed = structuredClone(config);
        mutate(Object.values(changed.services)[0]);
        writeFileSync(input, JSON.stringify(changed));
        const result = spawnSync(process.execPath, ['scripts/draft.mjs', 'audit', input], { cwd: root, encoding: 'utf8' });
        assert.equal(result.status, 1);
        assert.ok(!result.stderr.includes('resolved-secret'));
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
