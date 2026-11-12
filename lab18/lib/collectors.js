'use strict';

/**
 * Сбор данных через модуль os. Модуль os передаётся параметром (по умолчанию — настоящий),
 * поэтому логику можно проверить на «подставной» системе (Windows, мало памяти, root и т.д.).
 */
const nodeOs = require('node:os');
const { GROUP, bytesToGB, round, maskMac } = require('./format');

// ---------------------------------------------------------------- Задание 1
function getSystemInfo(os = nodeOs) {
  return {
    platform: os.platform(), // идентификатор: win32 | linux | darwin ...
    type: os.type(), //          человекочитаемое имя: Windows_NT | Linux | Darwin
    arch: os.arch(), //          разрядность/архитектура процессора: x64, arm64 ...
    release: os.release(), //    версия ОС
    hostname: os.hostname(), //  имя хоста
    uptimeSec: os.uptime(), //   время работы системы, секунды
  };
}

/** Вывод по платформе. */
function describePlatform(platform) {
  switch (platform) {
    case 'win32':
      return 'Вы работаете в Windows';
    case 'linux':
      return 'Вы работаете в Linux';
    case 'darwin':
      return 'Вы работаете в macOS';
    default:
      return 'Неизвестная платформа';
  }
}

// ---------------------------------------------------------------- Задание 2
function getCpuInfo(os = nodeOs) {
  const cpus = os.cpus();
  const speeds = cpus.map((cpu) => cpu.speed);
  const sum = speeds.reduce((acc, s) => acc + s, 0);
  return {
    cores: cpus.length, //                                  логические ядра
    model: cpus.length ? cpus[0].model.trim() : 'неизвестно',
    speeds, //                                              частота каждого ядра, МГц
    avgSpeedMHz: speeds.length ? Math.round(sum / speeds.length) : 0, // 0 = ОС не сообщает частоту
  };
}

function getMemoryInfo(os = nodeOs) {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalBytes: total,
    freeBytes: free,
    usedBytes: used,
    usedPercent: total ? (used / total) * 100 : 0,
    freePercent: total ? (free / total) * 100 : 0,
  };
}

/** Средняя загрузка за 1, 5 и 15 минут. На Windows os.loadavg() всегда [0, 0, 0] — помечаем как недоступную. */
function getLoadAverage(os = nodeOs) {
  if (os.platform() === 'win32') return { available: false, values: [0, 0, 0] };
  return { available: true, values: os.loadavg().map((v) => round(v, 2)) };
}

/** Предупреждение о нехватке памяти: свободно меньше thresholdPercent процентов. */
function isLowMemory(memory, thresholdPercent = 20) {
  return memory.freePercent < thresholdPercent;
}

// ---------------------------------------------------------------- Задание 3
/** В Node 18.0–18.3 поле family было числом (4/6), позже — строкой ("IPv4"/"IPv6"). */
const normalizeFamily = (family) => (family === 4 || family === 'IPv4' ? 'IPv4' : 'IPv6');

function getNetworkInfo(os = nodeOs) {
  const raw = os.networkInterfaces();
  const interfaces = Object.entries(raw).map(([name, addrs]) => {
    const list = addrs || [];
    return {
      name,
      ipv4: list.filter((a) => normalizeFamily(a.family) === 'IPv4').map((a) => a.address),
      ipv6: list.filter((a) => normalizeFamily(a.family) === 'IPv6').map((a) => a.address),
      mac: maskMac(list[0] ? list[0].mac : ''), // MAC всегда маскируется
      internal: list.some((a) => a.internal),
    };
  });

  // «Основной» интерфейс — первый с внешним (не internal) IPv4-адресом
  const primary = interfaces.find((i) => !i.internal && i.ipv4.length > 0);
  return {
    total: interfaces.length,
    interfaces,
    primary: primary ? { name: primary.name, address: primary.ipv4[0] } : null,
  };
}

function getUserInfo(os = nodeOs, env = process.env) {
  let info;
  try {
    info = os.userInfo();
  } catch {
    // Бывает в контейнерах, если UID не описан в /etc/passwd
    info = { username: env.USER || env.USERNAME || 'неизвестно', uid: -1, gid: -1, homedir: os.homedir(), shell: null };
  }
  const isUnix = info.uid >= 0; // на Windows uid/gid равны -1
  return {
    username: info.username,
    uid: info.uid,
    gid: info.gid,
    homedir: info.homedir,
    shell: info.shell || null,
    isUnix,
    isRoot: isUnix && info.uid === 0,
  };
}

// ---------------------------------------------------------------- Задание 4
/** Суммарные счётчики по всем ядрам: busy = user + nice + sys + irq, total = busy + idle. */
function cpuTotals(cpus) {
  let busy = 0;
  let idle = 0;
  for (const { times } of cpus) {
    busy += times.user + times.nice + times.sys + times.irq;
    idle += times.idle;
  }
  return { busy, idle, total: busy + idle };
}

/** Загрузка CPU между двумя замерами: busy_diff / total_diff * 100. */
function cpuLoadBetween(prev, curr) {
  const busyDiff = curr.busy - prev.busy;
  const totalDiff = curr.total - prev.total;
  const load = totalDiff > 0 ? Math.min(100, Math.max(0, (busyDiff / totalDiff) * 100)) : 0;
  return { busyDiff, totalDiff, load };
}

/**
 * Оценка состояния: CPU > crit — критично, CPU > warn — предупреждение,
 * свободной памяти < memWarn процентов — предупреждение.
 */
function evaluate({ cpuLoad, freeMemPercent }, { cpuWarn = 50, cpuCrit = 80, memWarn = 10 } = {}) {
  const messages = [];
  let level = 'ok';
  if (cpuLoad > cpuCrit) {
    level = 'crit';
    messages.push(`Критическая загрузка CPU ${cpuLoad.toFixed(1)}% (порог ${cpuCrit}%)`);
  } else if (cpuLoad > cpuWarn) {
    level = 'warn';
    messages.push(`Высокая загрузка CPU ${cpuLoad.toFixed(1)}% (порог ${cpuWarn}%)`);
  }
  if (freeMemPercent < memWarn) {
    if (level === 'ok') level = 'warn';
    messages.push(`Мало свободной памяти: ${freeMemPercent.toFixed(1)}% (порог ${memWarn}%)`);
  }
  return { level, messages };
}

/** «Слепок» системы: все данные заданий 1–3 в одном объекте + метка времени и группа. */
function collectSnapshot(os = nodeOs, now = new Date()) {
  const sys = getSystemInfo(os);
  const cpu = getCpuInfo(os);
  const mem = getMemoryInfo(os);
  const load = getLoadAverage(os);
  const net = getNetworkInfo(os);
  const user = getUserInfo(os);
  return {
    timestamp: now.toISOString(),
    group: GROUP,
    system: { ...sys, platformMessage: describePlatform(sys.platform) },
    cpu: { cores: cpu.cores, model: cpu.model, avgSpeedMHz: cpu.avgSpeedMHz },
    memory: {
      totalGB: round(bytesToGB(mem.totalBytes), 2),
      freeGB: round(bytesToGB(mem.freeBytes), 2),
      usedGB: round(bytesToGB(mem.usedBytes), 2),
      usedPercent: round(mem.usedPercent, 1),
    },
    loadAverage: load.available ? load.values : null,
    network: net,
    user: { username: user.username, uid: user.uid, gid: user.gid, homedir: user.homedir, shell: user.shell, isRoot: user.isRoot },
  };
}

module.exports = {
  getSystemInfo, describePlatform,
  getCpuInfo, getMemoryInfo, getLoadAverage, isLowMemory,
  normalizeFamily, getNetworkInfo, getUserInfo,
  cpuTotals, cpuLoadBetween, evaluate, collectSnapshot,
};
