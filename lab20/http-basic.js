const http = require('node:http');

const PORT = Number(process.env.PORT || 3000);
const NAME = 'Шикель Никита';
const GROUP = 'ББМО-01-23';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  let status = 200;
  let body;
  if (url.pathname === '/') {
    body = `Лабораторна робота №20\nСтудент: ${NAME}\nГрупа: ${GROUP}\n`;
  } else if (url.pathname === '/about') {
    body = `HTTP Basic server\n${NAME} — ${GROUP}\n`;
  } else {
    status = 404;
    body = '404 Not Found\n';
  }

  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(req.method === 'HEAD' ? undefined : body);
});

server.listen(PORT, () => console.log(`Task 1: http://localhost:${PORT}`));
