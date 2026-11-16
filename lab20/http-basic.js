const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log('[' + timestamp + '] ' + req.method + ' ' + req.url);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method === 'GET' && req.url === '/') {
    res.statusCode = 200;
    res.end('<h1>--- Лабораторная работа №20 ---</h1><p>Группа: ББМО-01-23</p><p>Метод: ' + req.method + '</p><p>URL: ' + req.url + '</p>');
  } else if (req.method === 'GET' && req.url === '/about') {
    res.statusCode = 200;
    res.end('<h1>--- О студенте ---</h1><p>Группа: ББМО-01-23</p><p>Студент: Шикель Никита</p>');
  } else {
    res.statusCode = 404;
    res.end('<h1>--- 404 Not Found ---</h1><p>Путь ' + req.url + ' не найден</p>');
  }
});

server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
});