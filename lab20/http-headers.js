
const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/headers') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    const responseData = {
      headers: req.headers,
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion
    };
    res.end(JSON.stringify(responseData, null, 2));
  } else if (req.method === 'GET' && req.url === '/headers/set') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Powered-By', 'Node.js');
    res.setHeader('X-Group', 'BBMO-01-23');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Temp', 'temporary');
    res.removeHeader('X-Temp');
    res.statusCode = 200;
    res.end('<h1>Кастомные заголовки установлены</h1><p>Группа: ББМО-01-23</p>');
  } else if (req.method === 'GET' && req.url === '/headers/check') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Group', 'BBMO-01-23');
    res.statusCode = 200;
    const checkData = {
      hasContentType: res.hasHeader('Content-Type'),
      hasXGroup: res.hasHeader('X-Group'),
      hasUnknown: res.hasHeader('X-Unknown')
    };
    res.end(JSON.stringify(checkData, null, 2));
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
});