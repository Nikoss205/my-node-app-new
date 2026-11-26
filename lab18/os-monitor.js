#!/usr/bin/env node
'use strict';

/**
 * Задание 4: мониторинг системы в реальном времени.
 *
 * 1. Первичный сбор данных (слепок) -> один объект с меткой времени и группой.
 * 2. Расчёт загрузки CPU по двум замерам os.cpus(): busy_diff / total_diff * 100.
 * 3. Обновление каждые 2 секунды одной строкой (\r). Выход по Ctrl+C.
 * 4. Пороги: CPU > 80% — критично, CPU > 50% — предупреждение, память < 10% свободно — предупреждение.
 * 5. Аномалии записываются в monitor.log.
 */
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { Worker } = require('node:worker_threads');
const { GROUP, formatGB, formatTimestamp } = require('./lib/format');
const { collectSnapshot, getMemoryInfo, cpuTotals, cpuLoadBetween, evaluate } = require('./lib/collectors');

const HELP = `Использование: node os-monitor.js [параметры]

  --interval <сек>     период обновления (по умолчанию 2)
  --cpu-warn <%>       порог предупреждения по CPU (по умолчанию 50)
  --cpu-crit <%>       порог критичной загрузки CPU (по умолчанию 80)
  --mem-warn <%>       предупреждать, если свободной памяти меньше % (по умолчанию 10)
  --log <файл>         файл журнала аномалий (по умолчанию monitor.log)
  --stress             создать нагрузку на все ядра (для демонстрации предупреждений)
  --snapshot-only      только вывести слепок системы и выйти
  -h, --help           эта справка`;

// ------------------------------------------------------------ параметры
/** Понятное сообщение для ошибок разбора аргументов (parseArgs выдаёт английский текст). */
function argError(err) {
  if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') return 'неизвестный параметр командной строки';
  if (err.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') return 'у параметра отсутствует значение';
  return err.message;
}

let opts;
try {
  const { values } = parseArgs({
    options: {
      interval: { type: 'string', default: '2' },
      'cpu-warn': { type: 'string', default: '50' },
      'cpu-crit': { type: 'string', default: '80' },
      'mem-warn': { type: 'string', default: '10' },
      log: { type: 'string', default: 'monitor.log' },
      stress: { type: 'boolean', default: false },
      'snapshot-only': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  const num = (name, min, max) => {
    const v = Number(values[name]);
    if (!Number.isFinite(v) || v < min || v > max) throw new Error(`параметр --${name} должен быть числом от ${min} до ${max}`);
    return v;
  };
  opts = {
    intervalMs: num('interval', 0.1, 3600) * 1000,
    cpuWarn: num('cpu-warn', 0, 100),
    cpuCrit: num('cpu-crit', 0, 100),
    memWarn: num('mem-warn', 0, 100),
    logFile: path.resolve(values.log),
    stress: values.stress,
    snapshotOnly: values['snapshot-only'],
  };
} catch (err) {
  console.error(`Ошибка: ${argError(err)}`);
  console.error('Справка: node os-monitor.js --help');
  process.exit(1);
}

// ------------------------------------------------------------ вспомогательное
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Запись аномалии: [YYYY-MM-DD HH:MM:SS] [ГРУППА] Предупреждение: ... */
function writeLog(message) {
  const line = `[${formatTimestamp()}] [${GROUP}] Предупреждение: ${message}\n`;
  try {
    fs.appendFileSync(opts.logFile, line);
  } catch (err) {
    console.error(`\nНе удалось записать в ${opts.logFile}: ${err.message}`);
  }
}

/** Нагрузка на все ядра: воркеры с бесконечным циклом (завершаются вместе с процессом). */
function startStress() {
  for (let i = 0; i < os.cpus().length; i++) new Worker('while (true) {}', { eval: true }).unref();
}

// Строка статуса: в терминале перерисовывается через \r, при перенаправлении — обычные строки
let lineOpen = false;
function draw(text, persist) {
  if (process.stdout.isTTY) {
    process.stdout.write(`\r\x1b[K${text}${persist ? '\n' : ''}`);
    lineOpen = !persist;
  } else {
    process.stdout.write(`${text}\n`);
  }
}

// ------------------------------------------------------------ основная логика
async function main() {
  // 1. Первичный сбор данных
  console.log('=== Первичный сбор данных (слепок системы) ===');
  console.log(JSON.stringify(collectSnapshot(os), null, 2));
  if (opts.snapshotOnly) return;

  if (opts.stress) {
    startStress();
    console.log(`\n[stress] Создана нагрузка на ${os.cpus().length} яд.`);
  }

  let warnings = 0;
  const stop = () => {
    if (lineOpen) process.stdout.write('\n');
    console.log(`Мониторинг остановлен. Предупреждений: ${warnings}`);
    process.exit(0);
  };
  process.on('SIGINT', stop); // Ctrl+C
  process.on('SIGTERM', stop);

  // 2. Расчёт загрузки CPU за интервал: два замера os.cpus()
  console.log('\n=== Расчёт загрузки CPU (два замера os.cpus(), интервал 1000 мс) ===');
  const first = cpuTotals(os.cpus());
  await sleep(1000);
  let prev = cpuTotals(os.cpus());
  const calc = cpuLoadBetween(first, prev);
  console.log(`Замер 1: busy=${first.busy} мс, idle=${first.idle} мс, total=${first.total} мс`);
  console.log(`Замер 2: busy=${prev.busy} мс, idle=${prev.idle} мс, total=${prev.total} мс`);
  console.log(`Разница: busy_diff=${calc.busyDiff}, total_diff=${calc.totalDiff}`);
  console.log(`Загрузка = busy_diff / total_diff * 100 = ${calc.load.toFixed(1)}%`);

  // 3. Периодический мониторинг
  console.log(`\nМониторинг (группа ${GROUP}). Ctrl+C для выхода.`);
  setInterval(() => {
    const curr = cpuTotals(os.cpus());
    const { load } = cpuLoadBetween(prev, curr);
    prev = curr;

    const mem = getMemoryInfo(os);
    const { level, messages } = evaluate(
      { cpuLoad: load, freeMemPercent: mem.freePercent },
      { cpuWarn: opts.cpuWarn, cpuCrit: opts.cpuCrit, memWarn: opts.memWarn }
    );

    const marker = level === 'crit' ? ' ⚠⚠' : level === 'warn' ? ' ⚠' : '';
    const line = `CPU: ${load.toFixed(1)}% | RAM: ${mem.usedPercent.toFixed(1)}% (${formatGB(mem.freeBytes)} ГБ свободно)${marker}`;

    if (level !== 'ok') {
      warnings += 1;
      messages.forEach(writeLog);
    }
    // Строки с аномалиями остаются на экране (история), обычные — перерисовываются
    draw(line, level !== 'ok');
  }, opts.intervalMs);
}

main();
