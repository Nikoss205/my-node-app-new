'use strict';

/**
 * Проверка логики на «подставной» системе (mock-объект вместо модуля os).
 * Запуск: npm test  (встроенный раннер node:test, зависимостей нет)
 */
const test = require('node:test');
const assert = require('node:assert');
const { formatUptime, maskMac, formatTimestamp, formatGB } = require('../lib/format');
const c = require('../lib/collectors');

/** Подставной os: переопределяйте нужные поля. */
const fakeOs = (over = {}) => ({
  platform: () => 'linux',
  type: () => 'Linux',
  arch: () => 'x64',
  release: () => '6.1.0',
  hostname: () => 'host',
  uptime: () => 12312,
  cpus: () => [
    { model: ' Test CPU ', speed: 1800, times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 } },
    { model: ' Test CPU ', speed: 2200, times: { user: 200, nice: 0, sys: 50, idle: 750, irq: 0 } },
  ],
  totalmem: () => 16 * 1024 ** 3,
  freemem: () => 4 * 1024 ** 3,
  loadavg: () => [0.5234, 0.4, 0.31],
  networkInterfaces: () => ({}),
  userInfo: () => ({ uid: 1000, gid: 1000, username: 'student', homedir: '/home/student', shell: '/bin/bash' }),
  homedir: () => '/home/student',
  ...over,
});

// ---------------------------------------------------------------- format
test('formatUptime: часы, минуты, секунды', () => {
  assert.strictEqual(formatUptime(3 * 3600 + 25 * 60 + 12), '3 ч 25 мин 12 сек');
});
test('formatUptime: дни добавляются при необходимости', () => {
  assert.strictEqual(formatUptime(2 * 86400 + 3600), '2 д 1 ч 0 мин 0 сек');
});
test('maskMac маскирует последние три октета и приводит к верхнему регистру', () => {
  assert.strictEqual(maskMac('aa:bb:cc:11:22:33'), 'AA:BB:CC:**:**:**');
});
test('maskMac: некорректный адрес скрывается целиком', () => {
  assert.strictEqual(maskMac(''), '**:**:**:**:**:**');
});
test('formatGB даёт два знака после запятой', () => {
  assert.strictEqual(formatGB(16 * 1024 ** 3), '16.00');
});
test('formatTimestamp: формат YYYY-MM-DD HH:MM:SS', () => {
  assert.strictEqual(formatTimestamp(new Date(2026, 0, 5, 7, 8, 9)), '2026-01-05 07:08:09');
});

// ---------------------------------------------------------------- задание 1
test('describePlatform: все ветки', () => {
  assert.strictEqual(c.describePlatform('win32'), 'Вы работаете в Windows');
  assert.strictEqual(c.describePlatform('linux'), 'Вы работаете в Linux');
  assert.strictEqual(c.describePlatform('darwin'), 'Вы работаете в macOS');
  assert.strictEqual(c.describePlatform('freebsd'), 'Неизвестная платформа');
});
test('getSystemInfo берёт данные из os', () => {
  const info = c.getSystemInfo(fakeOs());
  assert.deepStrictEqual([info.platform, info.type, info.arch, info.hostname], ['linux', 'Linux', 'x64', 'host']);
});

// ---------------------------------------------------------------- задание 2
test('getCpuInfo: ядра, модель (без пробелов), средняя частота', () => {
  const cpu = c.getCpuInfo(fakeOs());
  assert.strictEqual(cpu.cores, 2);
  assert.strictEqual(cpu.model, 'Test CPU');
  assert.strictEqual(cpu.avgSpeedMHz, 2000);
});
test('getCpuInfo: частота 0 (виртуалка / Apple Silicon) не ломает расчёт', () => {
  const cpu = c.getCpuInfo(fakeOs({ cpus: () => [{ model: 'VM', speed: 0, times: {} }] }));
  assert.strictEqual(cpu.avgSpeedMHz, 0);
});
test('getMemoryInfo: проценты свободной и занятой памяти', () => {
  const m = c.getMemoryInfo(fakeOs());
  assert.strictEqual(m.usedPercent, 75);
  assert.strictEqual(m.freePercent, 25);
});
test('isLowMemory: порог 20% срабатывает при свободных 10%', () => {
  const low = c.getMemoryInfo(fakeOs({ freemem: () => 1.6 * 1024 ** 3 }));
  assert.strictEqual(c.isLowMemory(low, 20), true);
  assert.strictEqual(c.isLowMemory(c.getMemoryInfo(fakeOs()), 20), false);
});
test('getLoadAverage: Linux — значения, Windows — недоступно', () => {
  assert.deepStrictEqual(c.getLoadAverage(fakeOs()), { available: true, values: [0.52, 0.4, 0.31] });
  assert.strictEqual(c.getLoadAverage(fakeOs({ platform: () => 'win32', loadavg: () => [0, 0, 0] })).available, false);
});

// ---------------------------------------------------------------- задание 3
const nets = {
  lo: [{ address: '127.0.0.1', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true }],
  vEthernet: [{ address: 'fe80::1', family: 'IPv6', mac: '11:22:33:44:55:66', internal: false }],
  Ethernet: [
    { address: '192.168.1.105', family: 'IPv4', mac: 'aa:bb:cc:dd:ee:ff', internal: false },
    { address: 'fe80::abcd', family: 'IPv6', mac: 'aa:bb:cc:dd:ee:ff', internal: false },
  ],
};
test('getNetworkInfo: основной интерфейс — первый внешний IPv4, MAC маскируется', () => {
  const n = c.getNetworkInfo(fakeOs({ networkInterfaces: () => nets }));
  assert.strictEqual(n.total, 3);
  assert.deepStrictEqual(n.primary, { name: 'Ethernet', address: '192.168.1.105' });
  const eth = n.interfaces.find((i) => i.name === 'Ethernet');
  assert.strictEqual(eth.mac, 'AA:BB:CC:**:**:**');
  assert.deepStrictEqual(eth.ipv6, ['fe80::abcd']);
});
test('getNetworkInfo: нет внешнего IPv4 — primary = null', () => {
  const n = c.getNetworkInfo(fakeOs({ networkInterfaces: () => ({ lo: nets.lo }) }));
  assert.strictEqual(n.primary, null);
});
test('normalizeFamily понимает числа (Node 18.0–18.3) и строки', () => {
  assert.strictEqual(c.normalizeFamily(4), 'IPv4');
  assert.strictEqual(c.normalizeFamily(6), 'IPv6');
  assert.strictEqual(c.normalizeFamily('IPv4'), 'IPv4');
});
test('getUserInfo: обычный пользователь не root', () => {
  const u = c.getUserInfo(fakeOs());
  assert.strictEqual(u.isRoot, false);
  assert.strictEqual(u.isUnix, true);
});
test('getUserInfo: uid 0 — root', () => {
  const u = c.getUserInfo(fakeOs({ userInfo: () => ({ uid: 0, gid: 0, username: 'root', homedir: '/root', shell: '/bin/sh' }) }));
  assert.strictEqual(u.isRoot, true);
});
test('getUserInfo: Windows (uid -1, shell null) — проверка root неприменима', () => {
  const u = c.getUserInfo(fakeOs({ userInfo: () => ({ uid: -1, gid: -1, username: 'Student', homedir: 'C:\\Users\\Student', shell: null }) }));
  assert.strictEqual(u.isUnix, false);
  assert.strictEqual(u.isRoot, false);
  assert.strictEqual(u.shell, null);
});
test('getUserInfo: userInfo() бросает ошибку — используется запасной вариант', () => {
  const u = c.getUserInfo(fakeOs({ userInfo: () => { throw new Error('no passwd entry'); } }), { USER: 'ci' });
  assert.strictEqual(u.username, 'ci');
});

// ---------------------------------------------------------------- задание 4
test('cpuTotals: busy = user+nice+sys+irq, total = busy+idle', () => {
  assert.deepStrictEqual(c.cpuTotals(fakeOs().cpus()), { busy: 400, idle: 1600, total: 2000 });
});
test('cpuLoadBetween: загрузка = busy_diff / total_diff * 100', () => {
  const r = c.cpuLoadBetween({ busy: 400, idle: 1600, total: 2000 }, { busy: 700, idle: 1900, total: 2600 });
  assert.deepStrictEqual([r.busyDiff, r.totalDiff, r.load], [300, 600, 50]);
});
test('cpuLoadBetween: нулевая разница не даёт деления на ноль', () => {
  const t = { busy: 1, idle: 1, total: 2 };
  assert.strictEqual(c.cpuLoadBetween(t, t).load, 0);
});
test('evaluate: пороги CPU и памяти', () => {
  assert.strictEqual(c.evaluate({ cpuLoad: 12.5, freeMemPercent: 50 }).level, 'ok');
  assert.strictEqual(c.evaluate({ cpuLoad: 78.9, freeMemPercent: 50 }).level, 'warn');
  assert.strictEqual(c.evaluate({ cpuLoad: 92.4, freeMemPercent: 50 }).level, 'crit');
  const mem = c.evaluate({ cpuLoad: 5, freeMemPercent: 8 });
  assert.strictEqual(mem.level, 'warn');
  assert.match(mem.messages[0], /Мало свободной памяти: 8\.0%/);
});
test('evaluate: границы строгие (ровно 50% и 80% — ещё не аномалия)', () => {
  assert.strictEqual(c.evaluate({ cpuLoad: 50, freeMemPercent: 50 }).level, 'ok');
  assert.strictEqual(c.evaluate({ cpuLoad: 80, freeMemPercent: 50 }).level, 'warn');
});
test('collectSnapshot: метка времени, группа и данные всех заданий', () => {
  const s = c.collectSnapshot(fakeOs({ networkInterfaces: () => nets }), new Date('2026-01-01T00:00:00Z'));
  assert.strictEqual(s.timestamp, '2026-01-01T00:00:00.000Z');
  assert.strictEqual(s.group, 'ББМО-01-23');
  for (const key of ['system', 'cpu', 'memory', 'loadAverage', 'network', 'user']) assert.ok(key in s, key);
  assert.strictEqual(s.memory.totalGB, 16);
});
