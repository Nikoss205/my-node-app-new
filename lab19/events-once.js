#!/usr/bin/env node
'use strict';

/**
 * Задание 2: on, once, addListener и управление подписками.
 */
const EventEmitter = require('node:events');
const { times } = require('./src/format');

const GROUP = 'ББМО-01-23';

// ---------------------------------------------------------------- on и once
console.log('=== Сравнение on и once ===');
const ticker = new EventEmitter();
let onCalls = 0;
let onceCalls = 0;

ticker.on('tick', (n) => {
  onCalls += 1;
  console.log(`[tick #${n}] on-слушатель`);
});
ticker.once('tick', (n) => {
  onceCalls += 1;
  console.log(`[tick #${n}] once-слушатель`);
});

for (let n = 1; n <= 3; n++) ticker.emit('tick', n);

console.log(`on-слушатель вызван: ${times(onCalls)}`);
console.log(`once-слушатель вызван: ${times(onceCalls)}`);

// ------------------------------------------------------------- addListener
console.log('\n=== addListener — псевдоним on ===');
const aliasDemo = new EventEmitter();
aliasDemo.addListener('ping', () => console.log('[ping] слушатель, добавленный через addListener'));
aliasDemo.emit('ping');
console.log(`addListener === on: ${EventEmitter.prototype.addListener === EventEmitter.prototype.on}`);

// --------------------------------------------------- управление подписками
console.log('\n=== Управление подписками ===');
const manager = new EventEmitter();
function listenerA() {}
function listenerB() {}
function listenerC() {}

manager.on('data', listenerA);
manager.on('data', listenerB);
manager.on('data', listenerC);

console.log(`Слушателей до удаления: ${manager.listenerCount('data')}`);
console.log(`listeners("data"): [${manager.listeners('data').map((fn) => fn.name).join(', ')}]`);

manager.removeListener('data', listenerB); // удаляем конкретного слушателя
console.log(`Слушателей после удаления одного: ${manager.listenerCount('data')}`);
console.log(`listeners("data"): [${manager.listeners('data').map((fn) => fn.name).join(', ')}]`);

manager.removeAllListeners('data'); // удаляем всех слушателей события
console.log(`Слушателей после removeAllListeners: ${manager.listenerCount('data')}`);

// ------------------------------------------------------------ порядок вызова
console.log('\n=== Порядок вызова ===');
const order = new EventEmitter();
order.on('step', () => console.log(`1. Первый слушатель (группа ${GROUP})`));
order.on('step', () => console.log('2. Второй слушатель'));
order.on('step', () => console.log('3. Третий слушатель'));
order.emit('step'); // вызываются синхронно, в порядке добавления

console.log('\n=== prependListener (дополнительно) ===');
order.prependListener('step', () => console.log('0. Добавлен через prependListener — вызывается первым'));
order.emit('step');
