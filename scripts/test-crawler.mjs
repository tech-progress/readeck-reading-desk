import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { createCrawlerProxy, publicAddress } from '../crawler-proxy.mjs';

for (const [address, family] of [['127.0.0.1', 4], ['10.0.0.1', 4], ['100.64.0.1', 4],
  ['169.254.169.254', 4], ['192.168.1.1', 4], ['::1', 6], ['fd00::1', 6],
  ['::ffff:127.0.0.1', 6], ['::192.168.1.1', 6], ['64:ff9b::7f00:1', 6],
  ['64:ff9b:1::a00:1', 6], ['fec0::1', 6], ['2002:7f00:1::1', 6], ['2001::1', 6]]) {
  await assert.rejects(publicAddress('untrusted.example', async () => [{ address, family }]));
}
const publicResult = { address: '93.184.215.14', family: 4 };
assert.deepEqual(await publicAddress('public.example', async () => [publicResult]), publicResult);
await assert.rejects(publicAddress('mixed.example', async () => [publicResult, { address: '10.0.0.1', family: 4 }]));
await assert.rejects(publicAddress('rebind.example', async () => [{ address: '100.64.0.1', family: 4 }]));
await assert.rejects(publicAddress('invalid-family.example', async () => [{ address: '::1', family: 4 }]));
const server = createCrawlerProxy();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(18323, '127.0.0.1', resolve);
});
try {
  for (const target of ['http://127.0.0.1/', 'http://169.254.169.254/', 'http://100.64.0.1/', 'http://example.com:8080/']) {
    const status = await new Promise((resolve, reject) => {
      const request = http.request({ host: '127.0.0.1', port: 18323, path: target }, response => {
        response.resume();
        resolve(response.statusCode);
      });
      request.once('error', reject);
      request.end();
    });
    assert.equal(status, 403);
  }
  for (const target of ['127.0.0.1:443', '[::ffff:127.0.0.1]:443', '[fec0::1]:443']) {
    const response = await new Promise((resolve, reject) => {
      const client = net.connect({ host: '127.0.0.1', port: 18323 }, () => client.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
      client.once('error', reject);
      client.once('data', bytes => { client.destroy(); resolve(bytes.toString()); });
    });
    assert.match(response, /^HTTP\/1\.1 403 /);
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
console.log('PASS: public-only DNS, mixed-answer denial, Railway private range, IPv6/mapped/translation denial; validated address returned for pinned dialing');
console.log('PASS: real local proxy HTTP and CONNECT listeners deny private/metadata/CGNAT/mapped/site-local targets and nonstandard ports');
