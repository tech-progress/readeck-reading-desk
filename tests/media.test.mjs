import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { authorizeMedia, mediaBookmark, rootOrigin } from '../media-authorization.mjs';

test('only root canonical origins are accepted and persisted prefixes are overridden', () => {
  assert.equal(rootOrigin('https://archive.example.test').pathname, '/');
  assert.equal(rootOrigin('http://localhost:18319/').pathname, '/');
  for (const value of ['https://archive.example.test/archive/', 'https://archive.example.test/%2e/', 'https://archive.example.test/a/../', 'https://archive.example.test/?prefix=/archive', 'https://archive.example.test/#fragment', 'https://user:password@archive.example.test/', 'ftp://archive.example.test/']) {
    assert.throws(() => rootOrigin(value));
  }
  assert.match(readFileSync(new URL('../runtime.sh', import.meta.url), 'utf8'), /export READECK_SERVER_HOST=127\.0\.0\.1 READECK_SERVER_PORT=8001 READECK_SERVER_PREFIX=\//);
});

test('saved media paths map to exactly the native bookmark identity', () => {
  assert.equal(mediaBookmark('/bm/Ab/Ab1234/_resources/photo.png'), 'Ab1234');
  assert.equal(mediaBookmark('/bm/Ab/Ab1234/img/icon.png?cache=1'), 'Ab1234');
  assert.equal(mediaBookmark('/api/bookmarks'), null);
  for (const path of ['/bm', '/bm/ZZ/Ab1234/img/icon.png', '/bm/Ab/Ab1234/img/%2e%2e', '/bm/Ab/Ab1234/img/inner/photo.png', '/bm/Ab/Ab1234/img/a%2fb.png', '/%62m/Ab/Ab1234/img/icon.png', '//bm/Ab/Ab1234/img/icon.png']) {
    assert.throws(() => mediaBookmark(path));
  }
});

test('only positive native bookmark authorization permits saved media', async () => {
  for (const status of [200, 303, 401, 403, 404, 500]) {
    let cancelled = false;
    const nativeFetch = async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:8001/api/bookmarks/Ab1234');
      assert.equal(options.redirect, 'manual');
      assert.deepEqual(options.headers, { host: 'archive.example.test', cookie: 'session=fixture', authorization: 'Bearer fixture' });
      return { status, body: { cancel: async () => { cancelled = true; } } };
    };
    assert.equal(await authorizeMedia('Ab1234', { host: 'archive.example.test', cookie: 'session=fixture', authorization: 'Bearer fixture' }, nativeFetch), status === 200);
    assert.ok(cancelled);
  }
  await assert.rejects(authorizeMedia('Ab1234', {}, async () => { throw new Error('Native unavailable'); }));
});
