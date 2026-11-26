#!/usr/bin/env node
'use strict';

/**
 * Задание 2: процессор, память, средняя загрузка.
 *
 * Параметр --threshold <процент> задаёт порог предупреждения о нехватке памяти
 * (по умолчанию 20). Чтобы увидеть предупреждение на обычном компьютере,
 * запустите, например: node os-resources.js --threshold 90
 */
const { parseArgs } = require('node:util');
const { GROUP, formatGB } = require('./lib/format');
const { getCpuInfo, getMemoryInfo, getLoadAverage, isLowMemory } = require('./lib/collectors');

/** Понятное сообщение для ошибок разбора аргументов (parseArgs выдаёт английский текст). */
function argError(err) {
  if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') return 'неизвестный параметр командной строки';
  if (err.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') return 'у параметра отсутствует значение';
  return err.message;
}

let threshold;
try {
  const { values } = parseArgs({ options: { threshold: { type: 'string', default: '20' } } });
  threshold = Number(values.threshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new Error('порог должен быть числом от 0 до 100');
} catch (err) {
  console.error(`Ошибка: ${argError(err)}`);
  console.error('Использование: node os-resources.js [--threshold <0-100>]');
  process.exit(1);
}

// --- Процессор ---
const cpu = getCpuInfo();
console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cpu.cores}`);
console.log(`Модель процессора: ${cpu.model}`);
if (cpu.avgSpeedMHz > 0) {
  cpu.speeds.forEach((mhz, i) => console.log(`  Ядро ${i}: ${mhz} МГц`));
  console.log(`Средняя частота: ${cpu.avgSpeedMHz} МГц`);
} else {
  // На виртуальных машинах и некоторых процессорах (например, Apple Silicon) ОС не сообщает частоту
  console.log('Средняя частота: недоступна (ОС не сообщает частоту ядер)');
}

// --- Память ---
const mem = getMemoryInfo();
console.log('\n=== Информация о памяти ===');
console.log(`Общий объём: ${formatGB(mem.totalBytes)} ГБ`);
console.log(`Свободно: ${formatGB(mem.freeBytes)} ГБ`);
console.log(`Использовано: ${formatGB(mem.usedBytes)} ГБ (${mem.usedPercent.toFixed(1)}%)`);

// --- Средняя загрузка ---
const load = getLoadAverage();
console.log('\n=== Средняя загрузка системы (1, 5, 15 мин) ===');
if (load.available) {
  console.log(`[${load.values.join(', ')}]`);
} else {
  console.log('Недоступно на Windows (os.loadavg() всегда возвращает [0, 0, 0])');
}

// --- Адаптивный вывод ---
console.log(`\nГруппа: ${GROUP}`);
if (isLowMemory(mem, threshold)) {
  console.log(`⚠ Предупреждение: свободной памяти меньше ${threshold}% (сейчас ${mem.freePercent.toFixed(1)}%)`);
} else {
  console.log('Память в норме');
}
