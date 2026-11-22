import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const UPSTREAM = 'https://ws.audioscrobbler.com/2.0/';
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_PAGE_SIZE = 1000;

/** Allowed methods (lowercase) with the parameters forwarded for each of them (mirrors backend/script.ts). */
const METHODS = new Map([
  ['user.getrecenttracks', ['user', 'from', 'to', 'limit', 'page']],
  ['user.getinfo', ['user']],
  ['artist.getinfo', ['artist', 'autocorrect']],
]);

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

const HASHED_ASSET_RE = /-[A-Za-z0-9_-]{8,}\.(js|css)$/;

function escapeHtmlAttr(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function validateApiUrl(value) {
  if (/[\u0000-\u001F\u007F\s]/.test(value)) {
    return false;
  }
  if (value.startsWith('/')) {
    return !value.startsWith('//') && !value.includes('\\');
  }
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function parsePort(raw) {
  const port = Number(raw?.trim() || '4200');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Invalid PORT environment variable.');
    process.exit(1);
  }
  return port;
}

const PORT = parsePort(process.env.PORT);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || path.join(__dirname, 'public'));
const API_URL = (process.env.API_URL ?? '').trim();
const LASTFM_KEY = (process.env.LASTFM_KEY ?? '').trim();

if (API_URL && !validateApiUrl(API_URL)) {
  console.error('Invalid API_URL: must be a relative path starting with "/" or an http(s):// URL.');
  process.exit(1);
}

let rootRealPath;
let indexRealPath;
let indexHtmlBuffer;

try {
  rootRealPath = fs.realpathSync(STATIC_DIR);
  indexRealPath = fs.realpathSync(path.join(rootRealPath, 'index.html'));
  if (indexRealPath !== rootRealPath && !indexRealPath.startsWith(rootRealPath + path.sep)) {
    throw new Error('index.html resolves outside static directory');
  }

  let indexHtml = fs.readFileSync(indexRealPath, 'utf8');
  const injectedApiUrl = API_URL || (LASTFM_KEY ? '/2.0/' : '');
  if (injectedApiUrl) {
    const metaTag = `  <meta name="lastfm-api-url" content="${escapeHtmlAttr(injectedApiUrl)}">\n`;
    if (indexHtml.includes('</head>')) {
      indexHtml = indexHtml.replace('</head>', () => `${metaTag}</head>`);
    } else {
      indexHtml = `${metaTag}${indexHtml}`;
    }
  }
  indexHtmlBuffer = Buffer.from(indexHtml, 'utf8');
} catch (err) {
  console.error(`Failed to initialize static directory (${STATIC_DIR}): ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

function isWithinRoot(realPath) {
  return realPath === rootRealPath || realPath.startsWith(rootRealPath + path.sep);
}

function sendJson(req, res, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.byteLength,
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  if (req.method === 'HEAD') {
    res.end();
  } else {
    res.end(body);
  }
}

function sendText(req, res, status, message, extraHeaders = {}) {
  const body = Buffer.from(message, 'utf8');
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.byteLength,
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  if (req.method === 'HEAD') {
    res.end();
  } else {
    res.end(body);
  }
}

function sendIndexHtml(req, res) {
  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': indexHtmlBuffer.byteLength,
    'X-Content-Type-Options': 'nosniff',
  });
  if (req.method === 'HEAD') {
    res.end();
  } else {
    res.end(indexHtmlBuffer);
  }
}

function parseSafePathname(rawUrl) {
  if (!rawUrl) {
    return null;
  }
  const queryIdx = rawUrl.indexOf('?');
  const hashIdx = rawUrl.indexOf('#');
  let cutIdx = rawUrl.length;
  if (queryIdx !== -1 && queryIdx < cutIdx) cutIdx = queryIdx;
  if (hashIdx !== -1 && hashIdx < cutIdx) cutIdx = hashIdx;
  const rawPath = rawUrl.slice(0, cutIdx);

  if (!rawPath.startsWith('/') || rawPath.includes('\0') || rawPath.includes('\\') || /%00|%5c/i.test(rawPath)) {
    return null;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (!decodedPath.startsWith('/') || decodedPath.includes('\0') || decodedPath.includes('\\')) {
    return null;
  }

  if (rawPath.split('/').includes('..') || decodedPath.split('/').includes('..')) {
    return null;
  }

  return decodedPath;
}

async function handleProxy(req, res, pathname) {
  if (req.method !== 'GET') {
    sendJson(req, res, 405, { message: 'Method not allowed' }, { Allow: 'GET' });
    return;
  }

  if (pathname !== '/2.0' && pathname !== '/2.0/') {
    sendJson(req, res, 404, { message: 'Not found' });
    return;
  }

  if (!LASTFM_KEY) {
    sendJson(req, res, 503, { message: 'Proxy is not configured' });
    return;
  }

  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    sendJson(req, res, 400, { message: 'Invalid request URL' });
    return;
  }

  const method = url.searchParams.get('method') ?? '';
  const allowedParams = METHODS.get(method.toLowerCase());
  if (!allowedParams) {
    sendJson(req, res, 400, { message: 'Unsupported method' });
    return;
  }

  const limit = url.searchParams.get('limit');
  if (limit !== null) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_PAGE_SIZE) {
      sendJson(req, res, 400, { message: 'Invalid limit' });
      return;
    }
  }

  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set('method', method);
  for (const name of allowedParams) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      upstream.searchParams.set(name, value);
    }
  }
  upstream.searchParams.set('api_key', LASTFM_KEY);
  upstream.searchParams.set('format', 'json');

  const abortController = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  };
  res.on('close', onClose);

  try {
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.any([abortController.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    });

    res.writeHead(response.status, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });

    if (!response.body) {
      res.end();
      return;
    }

    await pipeline(Readable.fromWeb(response.body), res);
  } catch {
    if (!res.headersSent && !res.destroyed) {
      sendJson(req, res, 502, { message: 'Could not reach last.fm' });
    } else if (!res.destroyed) {
      res.destroy();
    }
  } finally {
    res.off('close', onClose);
  }
}

async function handleStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(req, res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    sendIndexHtml(req, res);
    return;
  }

  const candidatePath = path.resolve(rootRealPath, `.${pathname}`);
  if (!isWithinRoot(candidatePath)) {
    sendText(req, res, 403, 'Forbidden');
    return;
  }

  let realPath;
  let stat;
  try {
    realPath = fs.realpathSync(candidatePath);
    if (!isWithinRoot(realPath)) {
      sendText(req, res, 403, 'Forbidden');
      return;
    }
    stat = fs.statSync(realPath);
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      sendIndexHtml(req, res);
      return;
    }
    sendText(req, res, 500, 'Internal server error');
    return;
  }

  if (!stat.isFile()) {
    sendIndexHtml(req, res);
    return;
  }

  if (realPath === indexRealPath) {
    sendIndexHtml(req, res);
    return;
  }

  const ext = path.extname(realPath).toLowerCase();
  const contentType = MIME_TYPES.get(ext) ?? 'application/octet-stream';
  const relPath = path.relative(rootRealPath, realPath);
  const cacheControl = HASHED_ASSET_RE.test(relPath)
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=3600';

  res.writeHead(200, {
    'Cache-Control': cacheControl,
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  try {
    await pipeline(fs.createReadStream(realPath), res);
  } catch {
    if (!res.headersSent) {
      sendText(req, res, 500, 'Internal server error');
    } else if (!res.destroyed) {
      res.destroy();
    }
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = parseSafePathname(req.url);
    if (pathname === null) {
      sendText(req, res, 400, 'Bad request');
      return;
    }

    if (pathname === '/2.0' || pathname === '/2.0/' || pathname.startsWith('/2.0/')) {
      await handleProxy(req, res, pathname);
      return;
    }

    await handleStatic(req, res, pathname);
  } catch {
    if (!res.headersSent) {
      sendText(req, res, 500, 'Internal server error');
    } else if (!res.destroyed) {
      res.destroy();
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const mode = API_URL && LASTFM_KEY
    ? 'external API_URL + built-in /2.0/ proxy'
    : (API_URL ? 'external API_URL' : (LASTFM_KEY ? 'built-in /2.0/ proxy' : 'default public API'));
  console.log(`Listening on http://0.0.0.0:${PORT} (${mode})`);
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
