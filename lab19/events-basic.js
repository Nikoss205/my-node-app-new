#!/usr/bin/env node
'use strict';

/**
 * Задание 1: простой EventEmitter, подписка на события, возвращаемое значение emit().
 * Паттерн «Наблюдатель»: источник (emitter) не знает, кто на него подписан.
 */
const EventEmitter = require('node:events');

const GROUP = 'ББМО-01-23';

// 1. Создаём экземпляр EventEmitter
const emitter = new EventEmitter();

// 2. Регистрируем слушателей на несколько событий
emitter.on('greet', (name) => console.log(`[greet] Привет, ${name}!`));
emitter.on('info', () => console.log(`[info] Группа: ${GROUP}`));
emitter.on('bye', () => console.log('[bye] До свидания!'));

console.log('=== Демонстрация EventEmitter ===');

// 3. События эмитятся по очереди. emit() возвращает true, если у события были слушатели
const results = {
  greet: emitter.emit('greet', 'Никита'),
  info: emitter.emit('info'),
  bye: emitter.emit('bye'),
};

// 4. Возвращаемое значение emit(): false — слушателей не было, true — были
const unknownResult = emitter.emit('unknown');
console.log(`Событие "unknown" без слушателей: ${unknownResult}`);
console.log(`Событие "greet" со слушателями: ${results.greet}`);
