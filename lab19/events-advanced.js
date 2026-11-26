#!/usr/bin/env node
'use strict';

/**
 * Задание 4: newListener, removeListener, система плагинов, утечка слушателей, async-слушатели.
 *
 *  - newListener    эмитится ПЕРЕД добавлением слушателя
 *  - removeListener эмитится ПОСЛЕ удаления слушателя
 */
const EventEmitter = require('node:events');

const GROUP = 'ББМО-01-23';
const TAG = '[BBMO-01-23]'; // префикс логов для асинхронной части
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------ система плагинов
class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
  }

  register(plugin) {
    this.plugins.set(plugin.name, plugin);
    this.emit('plugin:registered', plugin);
    plugin.install(this); // плагин подписывается на свои события
    return this;
  }

  unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;
    plugin.uninstall(this); // плагин отписывается (сработает removeListener)
    this.plugins.delete(name);
    this.emit('plugin:removed', plugin);
    return true;
  }
}

class LoggerPlugin {
  constructor() {
    this.name = 'LoggerPlugin';
    this.handler = (message) => console.log(`[LoggerPlugin] ${message}`);
  }
  install(manager) { manager.on('log', this.handler); }
  uninstall(manager) { manager.removeListener('log', this.handler); }
}

class AlertPlugin {
  constructor() {
    this.name = 'AlertPlugin';
    this.handler = (message) => console.log(`[AlertPlugin] ВНИМАНИЕ: ${message}`);
  }
  install(manager) { manager.on('alert', this.handler); }
  uninstall(manager) { manager.removeListener('alert', this.handler); }
}

function pluginDemo() {
  console.log('=== Система плагинов ===');
  const manager = new PluginManager();

  // removeListener подписываем первым, чтобы newListener не логировал саму эту подписку
  manager.on('removeListener', (event) => console.log(`[removeListener] Удалён слушатель "${event}"`));
  manager.on('newListener', (event) => console.log(`[newListener] Добавлен слушатель "${event}"`));

  manager.on('plugin:registered', (plugin) => console.log(`[PLUGIN] Зарегистрирован: ${plugin.name}`));
  manager.on('plugin:removed', (plugin) => console.log(`[PLUGIN] Удалён: ${plugin.name}`));

  manager.register(new LoggerPlugin());
  manager.register(new AlertPlugin());

  manager.emit('log', 'плагины работают');
  manager.emit('alert', 'проверка оповещения');

  manager.unregister('LoggerPlugin');
  console.log(`Слушателей "log" после удаления плагина: ${manager.listenerCount('log')}`);
}

// ----------------------------------- очистка ресурсов через removeListener
async function resourceDemo() {
  console.log('\n=== Очистка ресурсов (newListener + removeListener) ===');
  const source = new EventEmitter();
  let timer = null;

  // Таймер запускается при первой подписке на "tick"
  source.on('newListener', (event) => {
    if (event === 'tick' && !timer) {
      timer = setInterval(() => source.emit('tick'), 30);
      console.log('[resource] первая подписка на "tick" — таймер запущен');
    }
  });
  // и останавливается, когда отписался последний слушатель
  source.on('removeListener', (event) => {
    if (event === 'tick' && source.listenerCount('tick') === 0) {
      clearInterval(timer);
      timer = null;
      console.log('[resource] подписчиков нет — таймер остановлен');
    }
  });

  let ticks = 0;
  const onTick = () => { ticks += 1; };
  source.on('tick', onTick);
  await sleep(100);
  source.removeListener('tick', onTick);
  console.log(`[resource] получено тиков: ${ticks > 0 ? 'есть' : 'нет'}`);
}

// ---------------------------------------------------------- утечка слушателей
function leakDemo() {
  console.log('\n=== Демонстрация утечки ===');
  const emitter = new EventEmitter();

  for (let i = 0; i < 10; i++) emitter.on('data', () => {});
  console.log(`Слушателей до: ${emitter.listenerCount('data')}`);

  // Подписки «по ошибке» накапливаются и никогда не удаляются.
  // На 11-м слушателе Node.js сам предупредит о возможной утечке (MaxListenersExceededWarning).
  const handlers = [];
  for (let i = 0; i < 1000; i++) {
    const handler = () => {};
    handlers.push(handler);
    emitter.on('data', handler);
  }
  console.log(`Слушателей после добавления 1000: ${emitter.listenerCount('data')}`);

  // Решение: удалять подписки, когда они больше не нужны
  handlers.forEach((handler) => emitter.removeListener('data', handler));
  console.log(`Слушателей после removeListener для 1000 подписок: ${emitter.listenerCount('data')}`);

  emitter.removeAllListeners('data');
  console.log(`Слушателей после removeAllListeners: ${emitter.listenerCount('data')}`);
}

// ------------------------------------------------------ асинхронные слушатели
async function asyncDemo() {
  console.log('\n=== Асинхронные слушатели ===');
  const log = (msg) => console.log(`${TAG} ${msg}`);

  // 1. emit не ждёт async-слушателя
  const emitter = new EventEmitter();
  emitter.on('job', async () => {
    await sleep(100);
    log('async-слушатель завершён через 100ms');
  });
  emitter.emit('job');
  log('emit вызван (не ждёт async-слушатель)');
  await sleep(150);

  // 2. setImmediate: отложенное выполнение тяжёлой части
  console.log('\n--- setImmediate ---');
  emitter.on('work', () => {
    log('2. слушатель начал работу (синхронно, внутри emit)');
    setImmediate(() => log('4. отложенная часть выполнена через setImmediate'));
  });
  log('1. до emit');
  emitter.emit('work');
  log('3. после emit');
  await sleep(20);

  // 3. Ошибки async-слушателей: captureRejections направляет отклонённый промис в событие error
  console.log('\n--- captureRejections ---');
  const safe = new EventEmitter({ captureRejections: true });
  safe.on('boom', async () => {
    throw new Error('async-слушатель упал');
  });
  safe.on('error', (err) => log(`ошибка async-слушателя поймана через событие error: ${err.message}`));
  safe.emit('boom');
  await sleep(20);
}

async function main() {
  console.log(`(группа ${GROUP})\n`);
  pluginDemo();
  await resourceDemo();
  leakDemo();
  await sleep(10); // даём Node.js вывести MaxListenersExceededWarning до следующего раздела
  await asyncDemo();
}

main();
