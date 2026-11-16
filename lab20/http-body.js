const http = require('node:http');

const PORT = Number(process.env.PORT || 3002);
const MAX_BODY = 1_000_000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  try {
    const raw = await readBody(req);
    if (url.pathname === '/echo') {
      const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (type === 'application/json') {
        let parsed;
        try { parsed = JSON.parse(raw || '{}'); }
        catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
        const result = { received: parsed, student: 'Шикель Никита', group: 'ББМО-01-23' };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(result, null, 2));
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`Received body:\n${raw}\n`);
    }

    if (url.pathname === '/form') {
      const params = new URLSearchParams(raw);
      const result = Object.fromEntries(params.entries());
      result.student = 'Шикель Никита';
      result.group = 'ББМО-01-23';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result, null, 2));
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found\n');
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(error.statusCode || 500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
});

server.listen(PORT, () => console.log(`Task 3: http://localhost:${PORT}`));
