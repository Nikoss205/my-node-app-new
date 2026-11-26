'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const EventEmitter = require('node:events');
const { EventBus } = require('../src/EventBus');
const { createServer } = require('../src/server');


// ------------------------------------------------------------ приоритеты
test('EventBus наследуется от EventEmitter', () => {
  assert.ok(new EventBus() instanceof EventEmitter);
});

test('слушатели вызываются по убыванию приоритета', () => {
  const bus = new EventBus();
  const order = [];
  bus.on('e', () => order.push('low'), -5);
  bus.on('e', () => order.push('default'));
  bus.on('e', () => order.push('high'), 10);
  bus.on('e', () => order.push('mid'), 5);
  bus.emit('e');
  assert.deepStrictEqual(order, ['high', 'mid', 'default', 'low']);
});

test('одинаковый приоритет — порядок добавления', () => {
  const bus = new EventBus();
  const order = [];
  bus.on('e', () => order.push('a'), 3);
  bus.on('e', () => order.push('b'), 3);
  bus.on('e', () => order.push('c'), 3);
  bus.emit('e');
  assert.deepStrictEqual(order, ['a', 'b', 'c']);
});

test('приоритет должен быть числом, слушатель — функцией', () => {
  const bus = new EventBus();
  assert.throws(() => bus.on('e', () => {}, 'high'), TypeError);
  assert.throws(() => bus.on('e', 'не функция'), TypeError);
});

test('аргументы передаются слушателям, emit возвращает true/false', () => {
  const bus = new EventBus();
  let received;
  bus.on('e', (...args) => { received = args; });
  assert.strictEqual(bus.emit('e', 1, 'two'), true);
  assert.deepStrictEqual(received, [1, 'two']);
  assert.strictEqual(bus.emit('нет-слушателей'), false);
});

// ------------------------------------------------------------ once
test('once вызывается ровно один раз и удаляется', () => {
  const bus = new EventBus();
  let calls = 0;
  bus.once('tick', () => { calls += 1; });
  bus.emit('tick');
  bus.emit('tick');
  bus.emit('tick');
  assert.strictEqual(calls, 1);
  assert.strictEqual(bus.listenerCount('tick'), 0);
});

test('once учитывает приоритет', () => {
  const bus = new EventBus();
  const order = [];
  bus.on('e', () => order.push('on'));
  bus.once('e', () => order.push('once'), 10);
  bus.emit('e');
  assert.deepStrictEqual(order, ['once', 'on']);
});

test('once не срабатывает дважды при вложенном emit', () => {
  const bus = new EventBus();
  let calls = 0;
  bus.once('e', () => { calls += 1; bus.emit('e'); });
  bus.emit('e');
  assert.strictEqual(calls, 1);
});

// ------------------------------------------------------------ off / listeners
test('off удаляет слушателя по исходной функции (в том числе once)', () => {
  const bus = new EventBus();
  const a = () => {};
  const b = () => {};
  bus.on('e', a);
  bus.once('e', b);
  assert.strictEqual(bus.listenerCount('e'), 2);
  bus.off('e', b);
  bus.off('e', a);
  assert.strictEqual(bus.listenerCount('e'), 0);
});

test('listeners() возвращает исходные функции, а не обёртки', () => {
  const bus = new EventBus();
  const a = () => {};
  bus.on('e', a, 5);
  assert.deepStrictEqual(bus.listeners('e'), [a]);
});

test('newListener и removeListener получают исходную функцию', () => {
  const bus = new EventBus();
  const seen = [];
  // removeListener подписываем первым: иначе newListener сообщит и о самой этой подписке
  bus.on('removeListener', (event, fn) => seen.push(['removed', event, fn]));
  bus.on('newListener', (event, fn) => seen.push(['new', event, fn]));
  const a = () => {};
  bus.on('x', a);
  bus.off('x', a);
  assert.deepStrictEqual(seen, [['new', 'x', a], ['removed', 'x', a]]);
});

// ------------------------------------------------------------ wildcard
test('onAny получает имя события и аргументы при любом событии', () => {
  const bus = new EventBus();
  const seen = [];
  bus.onAny((event, ...args) => seen.push([event, args]));
  bus.emit('greet', 'Иван');
  bus.emit('info', 'ББМО-01-23', 2);
  assert.deepStrictEqual(seen, [['greet', ['Иван']], ['info', ['ББМО-01-23', 2]]]);
});

test('offAny отключает wildcard-слушателя; emit без слушателей, но с wildcard — true', () => {
  const bus = new EventBus();
  let calls = 0;
  const fn = () => { calls += 1; };
  bus.onAny(fn);
  assert.strictEqual(bus.emit('any'), true);
  bus.offAny(fn);
  assert.strictEqual(bus.emit('any'), false);
  assert.strictEqual(calls, 1);
});

// ------------------------------------------------------------ ошибки
test('ошибка слушателя изолирована: остальные вызываются, ошибка уходит в событие error', () => {
  const bus = new EventBus();
  const log = [];
  bus.on('error', (err, event) => log.push(`error:${event}:${err.message}`));
  bus.on('test', () => { throw new Error('boom'); }, 10);
  bus.on('test', () => log.push('second'));
  bus.emit('test');
  assert.deepStrictEqual(log, ['error:test:boom', 'second']);
  assert.strictEqual(bus.getMetrics().errors.test, 1);
});

test('слушатель error с высоким приоритетом вызывается раньше остальных слушателей error', () => {
  const bus = new EventBus();
  const order = [];
  bus.on('error', () => order.push('low'), 0);
  bus.on('error', () => order.push('high'), 100);
  bus.on('x', () => { throw new Error('e'); });
  bus.emit('x');
  assert.deepStrictEqual(order, ['high', 'low']);
});

test('ошибка async-слушателя (отклонённый промис) тоже попадает в error', async () => {
  const bus = new EventBus();
  const messages = [];
  bus.on('error', (err, event) => messages.push(`${event}:${err.message}`));
  bus.on('job', async () => { throw new Error('async boom'); });
  bus.emit('job');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual(messages, ['job:async boom']);
});

test('без слушателей error ошибка слушателя пишется в stderr и не роняет процесс', () => {
  const bus = new EventBus();
  const original = console.error;
  const lines = [];
  console.error = (line) => lines.push(line);
  try {
    bus.on('x', () => { throw new Error('тихо'); });
    assert.doesNotThrow(() => bus.emit('x'));
  } finally {
    console.error = original;
  }
  assert.match(lines[0], /\[ERROR\] \[ББМО-01-23\] Ошибка в слушателе "x": тихо/);
});

test('emit("error") без слушателей выбрасывает исключение, как у EventEmitter', () => {
  const bus = new EventBus();
  assert.throws(() => bus.emit('error', new Error('необработано')), /необработано/);
});

test('ошибка внутри слушателя error не вызывает рекурсию', () => {
  const bus = new EventBus();
  const original = console.error;
  console.error = () => {};
  try {
    bus.on('error', () => { throw new Error('сломан сам обработчик'); });
    bus.on('x', () => { throw new Error('исходная'); });
    assert.doesNotThrow(() => bus.emit('x'));
  } finally {
    console.error = original;
  }
});

// ------------------------------------------------------------ метрики
test('метрики: счётчики, общее число, время последнего вызова, число слушателей', () => {
  const bus = new EventBus();
  bus.on('greet', () => {});
  bus.emit('greet');
  bus.emit('greet');
  bus.emit('info');
  const m = bus.getMetrics();
  assert.strictEqual(m.group, 'ББМО-01-23');
  assert.deepStrictEqual(m.events, { greet: 2, info: 1 });
  assert.strictEqual(m.total, 3);
  assert.deepStrictEqual(m.listeners, { greet: 1 });
  assert.ok(!Number.isNaN(Date.parse(m.lastCall.greet)));
  assert.ok(!Number.isNaN(Date.parse(m.lastEventAt)));
});

test('resetMetrics обнуляет счётчики', () => {
  const bus = new EventBus();
  bus.emit('a');
  bus.resetMetrics();
  assert.deepStrictEqual(bus.getMetrics().events, {});
  assert.strictEqual(bus.getMetrics().total, 0);
});

// ------------------------------------------------------------ HTTP
function get(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject).end();
  });
}

test('HTTP: каждый запрос эмитит request, GET /metrics возвращает метрики', async () => {
  const bus = new EventBus();
  const server = createServer(bus);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await get(port, '/');
    await get(port, '/emit/greet?arg=x');
    const res = await get(port, '/metrics');
    assert.strictEqual(res.status, 200);
    const metrics = JSON.parse(res.body);
    assert.strictEqual(metrics.group, 'ББМО-01-23');
    assert.strictEqual(metrics.events.request, 3);
    assert.strictEqual(metrics.events.greet, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('HTTP: служебные события нельзя эмитить, неизвестный путь — 404, не GET — 405', async () => {
  const bus = new EventBus();
  const server = createServer(bus);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    assert.strictEqual((await get(port, '/emit/error')).status, 400);
    assert.strictEqual((await get(port, '/nope')).status, 404);
    assert.strictEqual((await get(port, '/metrics', 'POST')).status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
