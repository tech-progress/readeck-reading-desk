import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const pngChunk = (type, data) => {
  const contents = Buffer.concat([Buffer.from(type), data]);
  let checksum = 0xffffffff;
  for (const byte of contents) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit += 1) checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE((checksum ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, contents, crc]);
};
const imageHeader = Buffer.alloc(13);
imageHeader.writeUInt32BE(256, 0);
imageHeader.writeUInt32BE(256, 4);
imageHeader[8] = 8;
imageHeader[9] = 2;
const imagePixels = Buffer.alloc(256 * (1 + 256 * 3), 128);
for (let row = 0; row < 256; row += 1) imagePixels[row * (1 + 256 * 3)] = 0;
const fixtureImage = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk('IHDR', imageHeader), pngChunk('IDAT', deflateSync(imagePixels)), pngChunk('IEND', Buffer.alloc(0))]);

const [mode, environmentFile, stateFile] = process.argv.slice(2);
assert.ok(['create', 'check'].includes(mode) && environmentFile && stateFile);
const environment = Object.fromEntries(readFileSync(environmentFile, 'utf8').trim().split('\n').map(line => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
const base = new URL(environment.READECK_SERVER_BASE_URL);
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname) && /^183[0-4][0-9]$/.test(base.port), 'Fixture smoke is local-only');
const ownerPassword = environment.READECK_OWNER_PASSWORD;
let cookie = '';
const request = async (path, options = {}) => {
  const response = await fetch(new URL(path, base), { ...options, redirect: 'manual', signal: AbortSignal.timeout(15_000),
    headers: { Cookie: cookie, Origin: base.origin, ...options.headers } });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) cookie = cookies.map(value => value.split(';')[0]).join('; ');
  return response;
};
const login = async (username) => {
  cookie = '';
  await request('/login');
  const response = await request('/login', { method: 'POST',
    body: new URLSearchParams({ username, password: ownerPassword }) });
  assert.equal(response.status, 303, 'Private login must redirect successfully');
  const profile = await request('/api/profile');
  assert.equal(profile.status, 200, 'Authenticated profile must be available');
};
let state;
if (mode === 'create') {
  await login(environment.READECK_OWNER_USERNAME);
  const createdToken = await request('/profile/tokens', { method: 'POST' });
  assert.equal(createdToken.status, 303);
  const tokenPage = await request(createdToken.headers.get('location'));
  const tokenHTML = await tokenPage.text();
  const token = tokenHTML.match(/data-clipboard-target="content"[^>]*value="([^"]+)"/)?.[1];
  assert.ok(token, 'Supported private UI token provisioning must return a token');
  const articleURL = 'https://fixture.example.invalid/article';
  const imageURL = 'https://fixture.example.invalid/photo.png';
  const paragraph = 'This controlled reading archive demonstrates persistent text, annotations and a retained image. '.repeat(15);
  const html = `<!doctype html><html><head><title>Controlled Railway reading fixture</title></head><body><article><h1>Controlled reading fixture</h1><p>${paragraph}</p><img src="${imageURL}" alt="controlled image"><p>${paragraph}</p></article></body></html>`;
  const boundary = 'railway-controlled-fixture-boundary';
  const parts = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="url"\r\n\r\n${articleURL}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resource"; filename="article.html"\r\nContent-Type: text/html\r\nLocation: ${articleURL}\r\n\r\n${html}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resource"; filename="photo.png"\r\nContent-Type: image/png\r\nLocation: ${imageURL}\r\n\r\n`),
    fixtureImage,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  const response = await request('/api/bookmarks', { method: 'POST', body: Buffer.concat(parts),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` } });
  assert.equal(response.status, 202, 'Supplied article/image resource import must be accepted');
  const bookmarkId = response.headers.get('location').split('/').pop();
  state = { bookmarkId, token };
  writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  let archived = false;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const result = await request(`/api/bookmarks/${bookmarkId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (result.status === 200 && (await result.json()).has_article) { archived = true; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(archived, 'Article processing must finish within 45 seconds');
  const note = await request(`/api/bookmarks/${bookmarkId}`, { method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ note: 'Persistent controlled reading note' }) });
  assert.equal(note.status, 200);
  const highlight = await request(`/api/bookmarks/${bookmarkId}/annotations`, { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_selector: 'descendant::p[1]', start_offset: 0, end_selector: 'descendant::p[1]', end_offset: 10, color: 'yellow' }) });
  assert.equal(highlight.status, 201, 'Controlled highlight creation must succeed');
  console.log('PASS: private owner login, supported token creation, supplied article/image archival and note/highlight creation. No external article server was contacted.');
} else state = JSON.parse(readFileSync(stateFile, 'utf8'));

const authorization = { Authorization: `Bearer ${state.token}` };
cookie = '';
const bookmark = await request(`/api/bookmarks/${state.bookmarkId}`, { headers: authorization });
assert.equal(bookmark.status, 200, 'Stable token must read the restored/restarted article');
assert.equal((await bookmark.json()).note, 'Persistent controlled reading note');
const article = await request(`/api/bookmarks/${state.bookmarkId}/article`, { headers: authorization });
assert.equal(article.status, 200);
const articleText = await article.text();
assert.ok(articleText.includes('controlled reading archive'));
const image = new URL(articleText.match(/<img[^>]+src="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&'), base);
assert.equal(image.origin, base.origin);
assert.equal((await request(image.href, { headers: authorization })).status, 200);
cookie = '';
for (const path of [image.href, `/api/bookmarks/${state.bookmarkId}/article`, `/api/bookmarks/${state.bookmarkId}/article.epub`]) {
  assert.ok([401, 403].includes((await request(path)).status), 'Anonymous saved payload access must be denied');
}
const highlights = await request(`/api/bookmarks/${state.bookmarkId}/annotations`, { headers: authorization });
assert.equal(highlights.status, 200);
assert.ok((await highlights.json()).length > 0);
const epub = await request(`/api/bookmarks/${state.bookmarkId}/article.epub`, { headers: authorization });
assert.equal(epub.status, 200);
const epubPath = stateFile + '.epub';
writeFileSync(epubPath, Buffer.from(await epub.arrayBuffer()), { mode: 0o600 });
execFileSync('unzip', ['-t', epubPath], { stdio: 'ignore' });
assert.equal(execFileSync('unzip', ['-p', epubPath, 'mimetype'], { encoding: 'utf8' }).trim(), 'application/epub+zip');
const epubEntries = execFileSync('unzip', ['-Z1', epubPath], { encoding: 'utf8' });
assert.match(epubEntries, /\.(png|jpe?g|webp)/i, 'EPUB must include a retained image');
await login('unrelated');
const unrelated = await request(`/api/bookmarks/${state.bookmarkId}`);
assert.ok([403, 404].includes(unrelated.status), 'A second ordinary account cannot read the owner archive');
for (const path of [image.href, `/api/bookmarks/${state.bookmarkId}/article`, `/api/bookmarks/${state.bookmarkId}/article.epub`]) {
  assert.ok([403, 404].includes((await request(path)).status), 'A positively authenticated ordinary account cannot read saved owner payloads');
}
console.log('PASS: durable article/note/highlight, valid EPUB with image, stable bearer token and unrelated-user denial.');
