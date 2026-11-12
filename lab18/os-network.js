#!/usr/bin/env node
'use strict';

/**
 * Задание 3: сетевые интерфейсы и информация о пользователе.
 * MAC-адреса всегда маскируются: AA:BB:CC:**:**:**
 */
const { GROUP } = require('./lib/format');
const { getNetworkInfo, getUserInfo } = require('./lib/collectors');

// --- Сетевые интерфейсы ---
const net = getNetworkInfo();
console.log('=== Сетевые интерфейсы ===');
for (const iface of net.interfaces) {
  console.log(`Интерфейс: ${iface.name}`);
  iface.ipv4.forEach((ip) => console.log(`  IPv4: ${ip}`));
  iface.ipv6.forEach((ip) => console.log(`  IPv6: ${ip}`));
  console.log(`  MAC: ${iface.mac}`);
  console.log(`  Внутренний: ${iface.internal ? 'да' : 'нет'}`);
}
console.log(`Всего интерфейсов: ${net.total}`);
console.log(net.primary ? `Основной интерфейс: ${net.primary.name} (${net.primary.address})` : 'Основной интерфейс: не найден (нет внешнего IPv4)');

// --- Пользователь ---
const user = getUserInfo();
console.log('\n=== Информация о пользователе ===');
console.log(`Имя пользователя: ${user.username}`);
console.log(`UID: ${user.isUnix ? user.uid : 'недоступно (Windows)'}`);
console.log(`GID: ${user.isUnix ? user.gid : 'недоступно (Windows)'}`);
console.log(`Домашняя директория: ${user.homedir}`);
console.log(`Оболочка по умолчанию: ${user.shell || 'не определена'}`);

// --- Проверка безопасности для группы ---
console.log(`\nГруппа: ${GROUP}`);
if (!user.isUnix) {
  console.log('Проверка root: не применима (Windows, UID отсутствует)');
} else if (user.isRoot) {
  console.log('Проверка root: ДА');
  console.log('⚠ Предупреждение: скрипты не рекомендуется запускать от имени root');
} else {
  console.log('Проверка root: нет');
}
