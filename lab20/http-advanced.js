
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');

const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;
const startTime = Date.now();

const publicDir = path.join(__dirname, 'public');
const certsDir = path.join(__dirname, 'certs');

// Автоматически создаем папку public и тестовые файлы, если их нет
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const indexHtmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  fs.writeFileSync(indexHtmlPath, '<!DOCTYPE html><html><head><meta charset="utf-8"><title>ЛР 20</title></head><body><h1>Статика работает!</h1><p>Студент: Шикель Никита, Группа: ББМО-01-23</p></body></html>');
}
const styleCssPath = path.join(publicDir, 'style.css');
if (!fs.existsSync(styleCssPath)) {
  fs.writeFileSync(styleCssPath, 'body { font-family: Arial, sans-serif; color: #333; }');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const metrics = {
  group: 'ББМО-01-23',
  total: 0,
  byMethod: {},
  byStatus: {}
};

const middlewares = [];

function use(fn) {
  middlewares.push(fn);
}

// Middleware 1: Сбор метрик и логирование
use((req, res, next) => {
  metrics.total++;
  metrics.byMethod[req.method] = (metrics.byMethod[req.method] || 0) + 1;

  res.on('finish', () => {
    const code = String(res.statusCode);
    metrics.byStatus[code] = (metrics.byStatus[code] || 0) + 1;
    const timestamp = new Date().toISOString();
    console.log('[' + timestamp + '] [ББМО-01-23] ' + req.method + ' ' + req.url + ' ' + res.statusCode);
  });

  next();
});

// Middleware 2: Заголовок X-Middleware-Active для демонстрации работы middleware
use((req, res, next) => {
  res.setHeader('X-Middleware', 'active');
  next();
});

function handleRequest(req, res) {
  let index = 0;

  function next(err) {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('500 Internal Server Error: ' + err.message);
    }

    if (index < middlewares.length) {
      const mw = middlewares[index++];
      try {
        mw(req, res, next);
      } catch (e) {
        next(e);
      }
    } else {
      routeHandler(req, res);
    }
  }

  next();
}

function routeHandler(req, res) {
  const rawUrl = req.url.split('?')[0];

  // Главная страница (удобно для проверки HTTPS)
  if (req.method === 'GET' && rawUrl === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('--- HTTPS работает! ---\nСтудент: Шикель Никита\nГруппа: ББМО-01-23');
  }

  // Эндпоинт метрик
  if (req.method === 'GET' && rawUrl === '/metrics') {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const data = {
      group: metrics.group,
      total: metrics.total,
      byMethod: metrics.byMethod,
      byStatus: metrics.byStatus,
      uptime: uptime
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(data, null, 2));
  }

  // Эндпоинт стриминга (генерирует поток данных ~5 МБ)
  if (req.method === 'GET' && rawUrl === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="big-file.zip"'
    });
    let chunksSent = 0;
    const totalChunks = 80;
    const chunkData = Buffer.alloc(65536, 'A');

    const stream = new Readable({
      read() {
        if (chunksSent < totalChunks) {
          chunksSent++;
          this.push(chunkData);
        } else {
          this.push(null);
        }
      }
    });
    return stream.pipe(res);
  }
// Отдача статики с защитой от Path Traversal и кэшированием
  if (req.method === 'GET' && rawUrl.startsWith('/static/')) {
    const relPath = rawUrl.slice('/static/'.length);

    // Защита от .. (path traversal)
    if (relPath.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }

    const safePath = path.normalize(path.join(publicDir, relPath));
    if (!safePath.startsWith(publicDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found');
      }

      fs.readFile(safePath, (readErr, fileBuffer) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('500 Read Error');
        }

        const etag = '"' + crypto.createHash('md5').update(fileBuffer).digest('hex') + '"';
        const lastModified = stats.mtime.toUTCString();

        res.setHeader('Cache-Control', 'max-age=60');
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', lastModified);

        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304);
          return res.end();
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fileBuffer);
      });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

const httpServer = http.createServer(handleRequest);
httpServer.listen(HTTP_PORT, () => {
  console.log('[INFO] HTTP-сервер запущен на порту ' + HTTP_PORT);
  console.log('[INFO] Группа: ББМО-01-23');
});

let httpsServer = null;
const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  httpsServer = https.createServer(httpsOptions, handleRequest);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log('[INFO] HTTPS-сервер запущен на порту ' + HTTPS_PORT);
  });
} else {
  console.log('[WARN] Файлы certs/key.pem и certs/cert.pem не найдены, HTTPS не запущен');
}

// Корректное завершение (Graceful Shutdown)
function shutdown() {
  console.log('\n[INFO] Получен сигнал завершения. Корректная остановка серверов...');
  httpServer.close(() => {
    console.log('[INFO] HTTP-сервер успешно остановлен.');
    if (httpsServer) {
      httpsServer.close(() => {
        console.log('[INFO] HTTPS-сервер успешно остановлен.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);