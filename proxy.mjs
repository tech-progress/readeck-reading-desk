import http from 'node:http';
import { spawn } from 'node:child_process';
import { createCrawlerProxy } from './crawler-proxy.mjs';
import { authorizeMedia, mediaBookmark, rootOrigin } from './media-authorization.mjs';

const origin = rootOrigin(process.env.READECK_SERVER_BASE_URL);
process.env.READECK_SERVER_BASE_URL = origin.origin;
process.env.READECK_SERVER_PREFIX = '/';
const allowedHosts = new Set(process.env.READECK_ALLOWED_HOSTS.split(',').map(host => host.trim().toLowerCase()));
if (!allowedHosts.has(origin.hostname.toLowerCase())) throw new Error('Canonical origin hostname must be allowed');
const crawlerProxy = createCrawlerProxy();
await new Promise((resolve, reject) => {
  crawlerProxy.once('error', reject);
  crawlerProxy.listen(8002, '127.0.0.1', resolve);
});
process.env.HTTP_PROXY = 'http://127.0.0.1:8002';
process.env.HTTPS_PROXY = 'http://127.0.0.1:8002';
process.env.NO_PROXY = '';
const backend = spawn('readeck', ['serve', '-config', '/readeck/config.toml'], { stdio: 'inherit' });
let stopping = false;
let proxy;
const stop = (code) => {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  proxy?.close();
  crawlerProxy.close();
  backend.kill('SIGTERM');
  setTimeout(() => process.exit(code), 10_000).unref();
};
backend.once('error', () => stop(1));
backend.once('exit', (code) => stop(code ?? 1));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => stop(0));
let ready = false;
for (let attempt = 0; attempt < 30 && !stopping; attempt += 1) {
  try {
    const response = await fetch('http://127.0.0.1:8001/', { redirect: 'manual', signal: AbortSignal.timeout(1000) });
    if (response.status < 500) { ready = true; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!ready) stop(1);
else if (!stopping) {
  proxy = http.createServer(async (request, response) => {
    let hostname;
    try {
      const host = request.headers.host;
      if (!host || /[\s/@\\]/.test(host)) throw new Error('Invalid Host');
      hostname = new URL(`http://${host}`).hostname.toLowerCase();
    } catch {
      response.writeHead(400).end('Invalid Host');
      return;
    }
    if (!allowedHosts.has(hostname)) {
      response.writeHead(421).end('Unapproved Host');
      return;
    }
    if (request.url === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain' }).end('ready');
      return;
    }
    let protectedMedia = false;
    try {
      const bookmark = mediaBookmark(request.url);
      if (bookmark) {
        protectedMedia = true;
        if (!await authorizeMedia(bookmark, { ...request.headers, host: origin.host })) {
          response.writeHead(403, { 'Cache-Control': 'private, no-store' }).end('Saved media requires bookmark access');
          return;
        }
      }
    } catch {
      response.writeHead(403, { 'Cache-Control': 'private, no-store' }).end('Saved media access denied');
      return;
    }
    const upstream = http.request({
      hostname: '127.0.0.1', port: 8001, method: request.method, path: request.url,
      headers: { ...request.headers, host: origin.host, 'x-forwarded-host': origin.host,
        'x-forwarded-proto': origin.protocol.slice(0, -1) },
    }, result => {
      response.writeHead(result.statusCode ?? 502, protectedMedia ? { ...result.headers, 'cache-control': 'private, no-store' } : result.headers);
      result.pipe(response);
    });
    upstream.setTimeout(120_000, () => upstream.destroy());
    upstream.once('error', () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.once('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
  proxy.once('error', () => stop(1));
  proxy.listen(Number(process.env.PORT ?? 8000), '0.0.0.0');
}
