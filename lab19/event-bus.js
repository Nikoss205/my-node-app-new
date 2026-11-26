#!/usr/bin/env node
'use strict';

/**
 * Задание 5: EventBus — приоритеты, wildcard, once, ошибки, метрики,
 * интеграция с os (мониторинг системы) и http (GET /metrics).
 *
 *   node event-bus.js                 — демонстрация и HTTP-сервер на порту 3000 (Ctrl+C для выхода)
 *   node event-bus.js --port 3001     — другой порт
 *   node event-bus.js --no-server     — только демонстрация, без сервера
 */
const { parseArgs } = require('node:util');
const { EventBus, GROUP } = require('./src/EventBus');
const { startSystemMonitor } = require('./src/system-monitor');
const { createServer } = require('./src/server');
const { times, calls, errorsWord } = require('./src/format');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (msg) => console.log(msg);

let options;
try {
  options = parseArgs({
    options: {
      port: { type: 'string', default: '3000' },
      'no-server': { type: 'boolean', default: false },
    },
  }).values;
} catch (err) {
  console.error('Ошибка: неверные параметры. Использование: node event-bus.js [--port <число>] [--no-server]');
  process.exit(1);
}
const port = Number(options.port);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('Ошибка: --port должен быть целым числом от 0 до 65535');
  process.exit(1);
}

async function main() {
  console.log(`=== EventBus (группа ${GROUP}) ===`);

  // ------------------------------------------------------------- приоритеты
  console.log('--- Приоритеты ---');
  const prio = new EventBus(); // отдельная шина, чтобы не засорять метрики основной
  prio.on('demo', () => log('[priority 0] Низкий приоритет')); //            приоритет по умолчанию — 0
  prio.on('demo', () => log('[priority 5] Средний приоритет'), 5);
  prio.on('demo', () => log('[priority 10] Высокий приоритет'), 10);
  prio.on('demo', () => log('[priority 5] Средний приоритет (добавлен позже, тот же приоритет)'), 5);
  prio.emit('demo'); // 10 -> 5 -> 5 (по порядку добавления) -> 0

  const bus = new EventBus();

  // ------------------------------------------------------------- wildcard
  console.log('--- Wildcard ---');
  const wildcardLogger = (event, ...args) => log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
  bus.onAny(wildcardLogger);
  bus.on('greet', () => {}); // постоянный слушатель (виден в метриках HTTP)
  bus.emit('greet', 'Иван');
  bus.emit('greet', 'Мария');
  bus.emit('info', GROUP); //   слушателей у "info" нет, но wildcard его видит
  bus.offAny(wildcardLogger);

  // ------------------------------------------------------------- once-кэш
  console.log('--- Once-кэш ---');
  let onceCalls = 0;
  bus.on('tick', (n) => log(`[tick] Вызов ${n}`));
  bus.once('tick', () => { onceCalls += 1; }, 10);
  for (let n = 1; n <= 3; n++) bus.emit('tick', n);
  log(`once-слушатель вызван: ${times(onceCalls)}`);
  log(`Слушателей "tick" осталось: ${bus.listenerCount('tick')} (once удалился сам)`);

  // ------------------------------------------------------------- ошибки
  console.log('--- Обработка ошибок ---');
  // Слушатель error с высоким приоритетом (100) вызывается раньше остальных слушателей error
  bus.on('error', (err, event) => log(`[ERROR] [${GROUP}] Ошибка в слушателе "${event}": ${err.message}`), 100);
  bus.on('test', () => { throw new Error('синхронная ошибка в слушателе'); });
  bus.on('test', () => log('[test] Второй слушатель всё равно вызван (ошибка изолирована try/catch)'));
  bus.emit('test');
  bus.on('test2', async () => { throw new Error('асинхронная ошибка в слушателе'); });
  bus.emit('test2');
  await sleep(10); // async-ошибка приходит через отклонённый промис

  // ------------------------------------------------------------- метрики
  console.log('--- Метрики ---');
  const metrics = bus.getMetrics();
  for (const [name, count] of Object.entries(metrics.events)) {
    const errs = metrics.errors[name];
    log(`${name}: ${calls(count)}${errs ? ` (${errorsWord(errs)})` : ''}`);
  }
  log(`Всего событий: ${metrics.total}`);
  log(`Последнее событие: ${metrics.lastEventAt}`);

  if (options['no-server']) {
    // Интеграция с os без сервера: один замер и выход
    console.log('--- Интеграция с os ---');
    bus.on('system:sample', (s) => log(`[system] CPU ${s.cpu}% | RAM ${s.memUsedPercent}% (${s.freeGB} ГБ свободно)`));
    const monitor = startSystemMonitor(bus, { firstSampleMs: 1000 });
    await sleep(1200);
    monitor.stop();
    return;
  }

  // ------------------------------------------------------------- os + http
  console.log('--- Интеграция с os и http ---');
  bus.on('system:sample', (s) => log(`[system] CPU ${s.cpu}% | RAM ${s.memUsedPercent}% (${s.freeGB} ГБ свободно)`));
  bus.on('system:alert', (a) => log(`[system] ⚠ ${a.reason}`));
  bus.on('request', ({ method, path }) => log(`[http] ${method} ${path}`));
  const monitor = startSystemMonitor(bus, { intervalMs: 5000, firstSampleMs: 1000 });

  const server = createServer(bus);
  server.on('error', (err) => {
    console.error(err.code === 'EADDRINUSE' ? `Ошибка: порт ${port} занят. Используйте --port <другой порт>` : `Ошибка сервера: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    const actual = server.address().port;
    log(`HTTP-сервер запущен: http://localhost:${actual}  (GET /metrics, GET /emit/<событие>)`);
    log('Ctrl+C для выхода');
  });

  const shutdown = () => {
    monitor.stop();
    server.close();
    console.log(`\nОстановлено. Всего событий: ${bus.getMetrics().total}`);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
