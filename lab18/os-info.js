#!/usr/bin/env node
'use strict';

/**
 * Задание 1: базовая информация о платформе и архитектуре (модуль os).
 */
const { GROUP, formatUptime } = require('./lib/format');
const { getSystemInfo, describePlatform } = require('./lib/collectors');

const info = getSystemInfo();

console.log(`=== Информация о системе (группа ${GROUP}) ===`);
console.log(`Платформа: ${info.platform}`);
console.log(`Тип ОС: ${info.type}`);
console.log(`Архитектура: ${info.arch}`);
console.log(`Версия ОС: ${info.release}`);
console.log(`Имя хоста: ${info.hostname}`);
console.log(`Время работы: ${formatUptime(info.uptimeSec)} (${Math.floor(info.uptimeSec)} с)`);

// Условный вывод по платформе
console.log(describePlatform(info.platform));
