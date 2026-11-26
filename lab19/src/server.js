'use strict';

/**
 * Интеграция с модулем http: каждый запрос эмитит событие "request" в EventBus.
 *   GET /metrics       — метрики шины (JSON)
 *   GET /emit/<имя>    — эмитит событие <имя> (удобно для демонстрации; ?arg=значение)
 *   GET /              — краткая справка
 */
const http = require('node:http');

const RESERVED = new Set(['error', 'newListener', 'removeListener']);

function sendJson(res, status, body) {
  const payload = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function createServer(bus) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      bus.emit('request', { method: req.method, path: url.pathname });

      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Допустим только GET' });

      if (url.pathname === '/metrics') return sendJson(res, 200, bus.getMetrics());

      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`EventBus (группа ${bus.group})\nGET /metrics — метрики\nGET /emit/<событие>?arg=значение — эмитит событие\n`);
      }

      const match = url.pathname.match(/^\/emit\/([\w:.-]+)$/);
      if (match) {
        const name = match[1];
        if (RESERVED.has(name)) return sendJson(res, 400, { error: `Событие "${name}" служебное` });
        const delivered = bus.emit(name, ...(url.searchParams.has('arg') ? [url.searchParams.get('arg')] : []));
        return sendJson(res, 200, { event: name, delivered });
      }

      return sendJson(res, 404, { error: 'Не найдено' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  });
}

module.exports = { createServer };
