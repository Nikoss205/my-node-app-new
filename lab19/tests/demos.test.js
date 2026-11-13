'use strict';

/** Дымовые тесты: запуск каждого скрипта-демонстрации и проверка ключевых строк вывода. */
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const run = (script, args = []) =>
  spawnSync(process.execPath, [path.join(__dirname, '..', script), ...args], { encoding: 'utf8', timeout: 20000 });

test('events-basic.js: значения, возвращаемые emit()', () => {
  const r = run('events-basic.js');
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /\[greet\] Привет, Иван!/);
  assert.match(r.stdout, /Событие "unknown" без слушателей: false/);
  assert.match(r.stdout, /Событие "greet" со слушателями: true/);
});

test('events-once.js: on — 3 раза, once — 1 раз, счётчики слушателей', () => {
  const r = run('events-once.js');
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /on-слушатель вызван: 3 раза/);
  assert.match(r.stdout, /once-слушатель вызван: 1 раз/);
  assert.match(r.stdout, /Слушателей до удаления: 3/);
  assert.match(r.stdout, /Слушателей после удаления одного: 2/);
  assert.match(r.stdout, /Слушателей после removeAllListeners: 0/);
  assert.match(r.stdout, /1\. Первый слушатель \(группа ББМО-01-23\)/);
});

test('events-class.js: события БД и обработка error', () => {
  const r = run('events-class.js');
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /Результат: 50 записей/);
  assert.match(r.stdout, /Результат: 1 запись добавлена/);
  assert.match(r.stdout, /\[EVENT\] Ошибка: Connection timeout/);
});

test('events-class.js --crash: без слушателя error процесс падает с кодом 1', () => {
  const r = run('events-class.js', ['--crash']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /Error: Connection timeout/);
});

test('events-advanced.js: newListener, removeListener, утечка, async', () => {
  const r = run('events-advanced.js');
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /\[newListener\] Добавлен слушатель "plugin:registered"/);
  assert.match(r.stdout, /\[removeListener\] Удалён слушатель "log"/);
  assert.match(r.stdout, /Слушателей после добавления 1000: 1010/);
  assert.match(r.stdout, /\[BBMO-01-23\] emit вызван \(не ждёт async-слушатель\)/);
  assert.match(r.stderr, /MaxListenersExceededWarning/);
});

test('event-bus.js --no-server: приоритеты, wildcard, once, ошибки, метрики', () => {
  const r = run('event-bus.js', ['--no-server']);
  assert.strictEqual(r.status, 0);
  const out = r.stdout;
  assert.ok(out.indexOf('[priority 10]') < out.indexOf('[priority 5]'));
  assert.ok(out.indexOf('[priority 5]') < out.indexOf('[priority 0]'));
  assert.match(out, /\[onAny\] Событие "greet" с аргументами: \["Иван"\]/);
  assert.match(out, /once-слушатель вызван: 1 раз/);
  assert.match(out, /\[ERROR\] \[ББМО-01-23\] Ошибка в слушателе "test"/);
  assert.match(out, /test: 1 вызов \(1 ошибка\)/);
  assert.match(out, /Всего событий: \d+/);
  assert.match(out, /\[system\] CPU/);
});

test('event-bus.js: неверный порт — код 1', () => {
  assert.strictEqual(run('event-bus.js', ['--port', 'abc']).status, 1);
});
