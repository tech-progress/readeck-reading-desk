import http from 'node:http';
import net from 'node:net';
import { lookup } from 'node:dns/promises';

const denied = new net.BlockList();
const deniedIpv6 = new net.BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]) {
  denied.addSubnet(address, prefix, 'ipv4');
}
for (const [address, prefix] of [['::', 96], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48],
  ['100::', 64], ['2001::', 32], ['2001:2::', 48], ['2001:10::', 28], ['2001:db8::', 32],
  ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8]]) {
  deniedIpv6.addSubnet(address, prefix, 'ipv6');
}

export async function publicAddress(hostname, resolver = lookup) {
  const addresses = await resolver(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address, family }) =>
    net.isIP(address) !== family || (family === 6 ? deniedIpv6.check(address, 'ipv6') : denied.check(address, 'ipv4')))) {
    throw new Error('Crawler target is not a public address');
  }
  return addresses[0];
}

export function createCrawlerProxy(resolver = lookup) {
  const server = http.createServer(async (request, response) => {
    try {
      const target = new URL(request.url);
      if (target.protocol !== 'http:' || target.username || target.password ||
        (target.port && target.port !== '80')) throw new Error('Unsupported crawler target');
      const destination = await publicAddress(target.hostname, resolver);
      const headers = { ...request.headers, host: target.host };
      delete headers['proxy-authorization'];
      delete headers['proxy-connection'];
      const upstream = http.request(target, {
        method: request.method, headers, agent: false,
        lookup: (_hostname, _options, callback) => callback(null, destination.address, destination.family),
      }, result => {
        response.writeHead(result.statusCode ?? 502, result.headers);
        result.pipe(response);
      });
      upstream.setTimeout(30000, () => upstream.destroy());
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      request.on('aborted', () => upstream.destroy());
      request.pipe(upstream);
    } catch {
      response.writeHead(403).end('Crawler target denied');
    }
  });
  server.on('connect', async (request, client, head) => {
    let upstream;
    try {
      const target = new URL(`https://${request.url}`);
      if (target.username || target.password || target.pathname !== '/' ||
        (target.port && target.port !== '443')) throw new Error('Unsupported crawler tunnel');
      const destination = await publicAddress(target.hostname.replace(/^\[|\]$/g, ''), resolver);
      upstream = net.connect({ host: destination.address, port: 443, family: destination.family }, () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.setTimeout(30000, () => upstream.destroy());
      upstream.on('error', () => client.destroy());
      client.on('error', () => upstream.destroy());
      client.on('close', () => upstream.destroy());
    } catch {
      upstream?.destroy();
      client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    }
  });
  return server;
}
