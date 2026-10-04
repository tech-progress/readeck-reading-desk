import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [mode, environmentFile, stateFile] = process.argv.slice(2);
assert.ok(['create', 'check'].includes(mode) && environmentFile && stateFile);
const environment = Object.fromEntries(readFileSync(environmentFile, 'utf8').trim().split('\n').map(line => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
const base = new URL(environment.READECK_SERVER_BASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname) && /^183[0-4][0-9]$/.test(base.port));
let cookie = '';
const request = async (path, options = {}) => {
  const response = await fetch(new URL(path, base), { ...options, redirect: 'manual', signal: AbortSignal.timeout(30_000),
    headers: { Cookie: cookie, Origin: base.origin, ...options.headers } });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) cookie = cookies.map(value => value.split(';')[0]).join('; ');
  return response;
};
let state;
if (mode === 'create') {
  const source = new URL(process.env.WEB_SOURCE_URL);
  assert.equal(source.protocol, 'https:');
  await request('/login');
  assert.equal((await request('/login', { method: 'POST', body: new URLSearchParams({ username: environment.READECK_OWNER_USERNAME, password: environment.READECK_OWNER_PASSWORD }) })).status, 303);
  const createdToken = await request('/profile/tokens', { method: 'POST' });
  assert.equal(createdToken.status, 303);
  const token = (await (await request(createdToken.headers.get('location'))).text()).match(/data-clipboard-target="content"[^>]*value="([^"]+)"/)?.[1];
  assert.ok(token);
  const response = await request('/api/bookmarks', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: source.href }) });
  assert.equal(response.status, 202);
  state = { token, bookmarkId: response.headers.get('location').split('/').pop(), source: source.href };
  writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const bookmark = await (await request(`/api/bookmarks/${state.bookmarkId}`, { headers: { Authorization: `Bearer ${token}` } })).json();
    if (bookmark.state === 0 && bookmark.has_article) break;
    if (bookmark.state === 1) throw new Error(`Actual public extraction failed: ${JSON.stringify(bookmark.errors)}`);
    assert.ok(attempt < 89, 'Actual public extraction must complete within 90 seconds');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
} else state = JSON.parse(readFileSync(stateFile, 'utf8'));
const authorization = { Authorization: `Bearer ${state.token}` };
const article = await request(`/api/bookmarks/${state.bookmarkId}/article`, { headers: authorization });
assert.equal(article.status, 200);
assert.ok((await article.text()).replace(/<[^>]*>/g, '').trim().length > 200);
const epub = await request(`/api/bookmarks/${state.bookmarkId}/article.epub`, { headers: authorization });
assert.equal(epub.status, 200);
const archive = stateFile + '.epub';
writeFileSync(archive, Buffer.from(await epub.arrayBuffer()), { mode: 0o600 });
execFileSync('unzip', ['-t', archive], { stdio: 'ignore' });
assert.match(execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }), /\.(png|jpe?g|webp)/i);
console.log('PASS: actual HTTPS public article fetching, extracted text and valid EPUB with retained remote image');
