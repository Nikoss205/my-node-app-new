const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HTTP_PORT = Number(process.env.PORT || 3004);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const metrics = { requests: 0, startedAt: Date.now(), byStatus: {} };
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function record(res, status) {
  metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
}
function send(res, status, body, headers = {}) {
  record(res, status);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}
function safeStaticPath(pathname) {
  // Decode once and reject traversal segments before resolving against public/.
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return { error: 400 }; }
  const relative = decoded.replace(/^\/static\/?/, '');
  const segments = relative.split(/[\\/]+/);
  if (segments.some(segment => segment === '..')) return { error: 403 };
  const target = path.resolve(PUBLIC_DIR, relative || 'index.html');
  const rel = path.relative(PUBLIC_DIR, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { error: 403 };
  return { target };
}

const handler = (req, res) => {
  metrics.requests += 1;
  const started = process.hrtime.bigint();
  const rawPath = (req.url || '/').split('?')[0];

  // Reject traversal in the raw request target. This works with curl --path-as-is,
  // before URL parsing can normalize dot segments.
  let decodedRaw;
  try { decodedRaw = decodeURIComponent(rawPath); }
  catch { return send(res, 400, '400 Bad Request\n'); }
  if (decodedRaw.split('/').some(segment => segment === '..')) {
    return send(res, 403, '403 Forbidden\n');
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, '405 Method Not Allowed\n', { Allow: 'GET, HEAD' });
  }

  if (url.pathname === '/metrics') {
    const data = {
      ...metrics,
      uptimeSeconds: Math.floor((Date.now() - metrics.startedAt) / 1000),
      memory: process.memoryUsage(),
      lastRequestDurationNs: (process.hrtime.bigint() - started).toString()
    };
    record(res, 200);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data, null, 2));
  }

  if (url.pathname === '/stream') {
    record(res, 200);
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      res.write(`Chunk ${count}: потокова передача даних\n`);
      if (count >= 5) {
        clearInterval(timer);
        res.end('Stream finished\n');
      }
    }, 300);
    res.on('close', () => clearInterval(timer));
    return;
  }

  if (url.pathname === '/static' || url.pathname.startsWith('/static/')) {
    const result = safeStaticPath(url.pathname);
    if (result.error) return send(res, result.error, `${result.error} ${result.error === 403 ? 'Forbidden' : 'Bad Request'}\n`);
    fs.stat(result.target, (statErr, stat) => {
      if (statErr || !stat.isFile()) return send(res, 404, '404 Not Found\n');
      fs.readFile(result.target, (readErr, content) => {
        if (readErr) return send(res, 500, '500 Internal Server Error\n');
        const etag = '"' + crypto.createHash('sha1').update(content).digest('hex') + '"';
        if (req.headers['if-none-match'] === etag) {
          record(res, 304);
          res.writeHead(304, { ETag: etag });
          return res.end();
        }
        record(res, 200);
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(result.target).toLowerCase()] || 'application/octet-stream',
          'Content-Length': content.length,
          ETag: etag,
          'Cache-Control': 'public, max-age=0, must-revalidate'
        });
        res.end(req.method === 'HEAD' ? undefined : content);
      });
    });
    return;
  }

  send(res, 404, '404 Not Found\n');
};

const httpServer = http.createServer(handler);
httpServer.listen(HTTP_PORT, () => console.log(`Task 5 HTTP: http://localhost:${HTTP_PORT}`));

const keyPath = path.join(__dirname, 'certs', 'localhost-key.pem');
const certPath = path.join(__dirname, 'certs', 'localhost-cert.pem');
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const httpsServer = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  }, handler);
  httpsServer.listen(HTTPS_PORT, () => console.log(`Task 5 HTTPS: https://localhost:${HTTPS_PORT}`));
} else {
  console.log('HTTPS disabled: create certs/localhost-key.pem and certs/localhost-cert.pem (see README).');
}
