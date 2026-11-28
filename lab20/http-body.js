
const http = require('http');
const querystring = require('querystring');

const PORT = 3000;
const MAX_SIZE = 1024 * 1024; // 1 МБ

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/echo' || req.url === '/form')) {
    let body = '';
    let size = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      size += chunk.length;

      if (size > MAX_SIZE) {
        aborted = true;
        console.log('[LOG] Превышен размер тела: ' + size + ' байт -> 413 Payload Too Large');
        res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('413 Payload Too Large');
        req.destroy();
        return;
      }

      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (aborted) return;
      console.log('[LOG] ' + req.method + ' ' + req.url + ' | Размер тела: ' + size + ' байт');

      const contentType = req.headers['content-type'] || '';

      if (req.url === '/echo') {
        if (contentType.includes('application/json')) {
          try {
            const parsed = JSON.parse(body);
            parsed.group = 'ББМО-01-23';
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(parsed, null, 2));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Invalid JSON');
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
          res.end(body);
        }
      } else if (req.url === '/form') {
        const parsedForm = querystring.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(parsedForm, null, 2));
      }
    });

    req.on('error', (err) => {
      console.error('Ошибка запроса:', err.message);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
});