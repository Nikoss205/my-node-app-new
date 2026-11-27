const http = require('node:http');

const PORT = Number(process.env.PORT || 3001);
const GROUP_HEADER = 'BBMO-01-23'; // HTTP header values must be valid ASCII/Latin-1.

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  if (url.pathname === '/headers') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Student': 'Shikel-Nikita',
      'X-Group': GROUP_HEADER,
      'Cache-Control': 'no-store'
    });
    return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({
      message: 'Response headers demo',
      student: 'Шикель Никита',
      group: 'ББМО-01-23',
      headerGroup: GROUP_HEADER
    }, null, 2));
  }

  if (url.pathname === '/headers/set') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Custom-Header': 'Lab20',
      'X-Group': GROUP_HEADER
    });
    return res.end(req.method === 'HEAD' ? undefined : 'Custom response headers are set.\n');
  }

  if (url.pathname === '/headers/check') {
    const result = {
      host: req.headers.host || null,
      userAgent: req.headers['user-agent'] || null,
      accept: req.headers.accept || null,
      studentHeader: req.headers['x-student'] || null,
      groupHeader: req.headers['x-group'] || null
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(result, null, 2));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(req.method === 'HEAD' ? undefined : '404 Not Found\n');
});

server.listen(PORT, () => console.log(`Task 2: http://localhost:${PORT}`));
