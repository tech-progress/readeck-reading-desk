export function rootOrigin(value) {
  const origin = new URL(value);
  if (!['http:', 'https:'].includes(origin.protocol) || ![origin.origin, origin.origin + '/'].includes(value) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error('Canonical base URL must be a root HTTP(S) origin');
  }
  return origin;
}

export function mediaBookmark(path) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid request path');
  const rawPath = path.split(/[?#]/)[0];
  const pathname = decodeURIComponent(rawPath);
  if (!pathname.startsWith('/bm')) return null;
  if (pathname !== rawPath) throw new Error('Encoded saved-media path');
  const match = pathname.match(/^\/bm\/([a-zA-Z0-9]{2})\/([a-zA-Z0-9]+)\/(img|_resources)\/[^/%]+$/);
  if (!match || match[1] !== match[2].slice(0, 2)) throw new Error('Invalid saved-media path');
  return match[2];
}

export async function authorizeMedia(bookmark, headers, nativeFetch = fetch) {
  const response = await nativeFetch(`http://127.0.0.1:8001/api/bookmarks/${bookmark}`, {
    headers: { host: headers.host, cookie: headers.cookie ?? '', authorization: headers.authorization ?? '' },
    redirect: 'manual', signal: AbortSignal.timeout(10_000),
  });
  await response.body?.cancel();
  return response.status === 200;
}
