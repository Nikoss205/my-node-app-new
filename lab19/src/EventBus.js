'use strict';

const EventEmitter = require('node:events');

const GROUP = 'ББМО-01-23';

/**
 * EventBus: EventEmitter с приоритетами, wildcard-подпиской, once-слушателями,
 * изоляцией ошибок слушателей и метриками.
 *
 * Идея реализации: слушатели хранятся самим EventEmitter (поэтому работают listenerCount,
 * listeners, removeListener, события newListener/removeListener), а каждая подписка
 * оборачивается в функцию-обёртку с полями priority и seq (порядковый номер добавления).
 * Свой только emit(): он сортирует обёртки по приоритету и вызывает их в try/catch.
 */
class EventBus extends EventEmitter {
  constructor({ group = GROUP } = {}) {
    super();
    this.group = group;
    this._seq = 0; //                 порядковый номер подписки (для одинаковых приоритетов)
    this._any = []; //                wildcard-слушатели: { fn, seq }
    this._counts = new Map(); //      событие -> число вызовов emit
    this._errors = new Map(); //      событие -> число ошибок в слушателях
    this._lastAt = new Map(); //      событие -> время последнего вызова
    this._total = 0;
    this._lastEventAt = null;
  }

  // ------------------------------------------------------------ подписка
  /** Подписка с приоритетом: чем выше число, тем раньше вызовется слушатель (по умолчанию 0). */
  on(event, listener, priority = 0) {
    return this._add(event, listener, priority, false);
  }

  addListener(event, listener, priority = 0) {
    return this.on(event, listener, priority);
  }

  /** Одноразовая подписка: слушатель удаляется перед первым вызовом. */
  once(event, listener, priority = 0) {
    return this._add(event, listener, priority, true);
  }

  /** Отписка. Работает и для once-слушателей, и по исходной функции (не по обёртке). */
  off(event, listener) {
    return this.removeListener(event, listener);
  }

  /** Wildcard: слушатель вызывается при ЛЮБОМ событии и получает (имя события, ...аргументы). */
  onAny(listener) {
    if (typeof listener !== 'function') throw new TypeError('Слушатель должен быть функцией');
    this._any.push({ fn: listener, seq: ++this._seq });
    return this;
  }

  offAny(listener) {
    const index = this._any.findIndex((item) => item.fn === listener);
    if (index !== -1) this._any.splice(index, 1);
    return this;
  }

  _add(event, listener, priority, once) {
    if (typeof listener !== 'function') throw new TypeError('Слушатель должен быть функцией');
    if (!Number.isFinite(priority)) throw new TypeError('Приоритет должен быть числом');

    const bus = this;
    let fired = false;
    const entry = function (...args) {
      if (once) {
        if (fired) return undefined; // защита от повторного вызова при вложенном emit
        fired = true;
        bus.removeListener(event, entry);
      }
      return listener.apply(bus, args);
    };
    entry.listener = listener; //  так EventEmitter понимает removeListener(event, исходная_функция)
    entry.priority = priority;
    entry.seq = ++this._seq;
    return super.on(event, entry);
  }

  // ------------------------------------------------------------ вызов
  /**
   * Вызывает слушателей: сначала wildcard, затем обычные по убыванию приоритета
   * (при равных приоритетах — в порядке добавления). Возвращает true, если слушатели были.
   * Исключение в слушателе не мешает остальным: оно превращается в событие "error".
   */
  emit(event, ...args) {
    this._record(event);

    const listeners = this.rawListeners(event).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0) || (a.seq || 0) - (b.seq || 0)
    );
    const wildcard = this._any.slice();

    // Как и у обычного EventEmitter: необработанное событие error — это исключение
    if (event === 'error' && listeners.length === 0 && wildcard.length === 0) {
      throw args[0] instanceof Error ? args[0] : new Error(`Необработанное событие error: ${String(args[0])}`);
    }

    for (const { fn } of wildcard) this._invoke(event, fn, [event, ...args]);
    for (const fn of listeners) this._invoke(event, fn, args);
    return listeners.length + wildcard.length > 0;
  }

  _invoke(event, fn, args) {
    try {
      const result = fn.apply(this, args);
      // async-слушатель: ошибка придёт позже, через отклонённый промис
      if (result && typeof result.then === 'function') result.then(undefined, (err) => this._fail(event, err));
    } catch (err) {
      this._fail(event, err);
    }
  }

  /**
   * Ошибка в слушателе: учитываем в метриках и эмитим событие "error" (err, имя_события).
   * Если слушателей error нет (или упал сам слушатель error) — пишем в stderr, чтобы не уронить процесс.
   */
  _fail(event, err) {
    const error = err instanceof Error ? err : new Error(String(err));
    this._errors.set(event, (this._errors.get(event) || 0) + 1);
    if (event === 'error' || this.listenerCount('error') === 0) {
      console.error(`[ERROR] [${this.group}] Ошибка в слушателе "${event}": ${error.message}`);
      return;
    }
    this.emit('error', error, event);
  }

  // ------------------------------------------------------------ метрики
  _record(event) {
    const now = new Date();
    this._counts.set(event, (this._counts.get(event) || 0) + 1);
    this._lastAt.set(event, now);
    this._total += 1;
    this._lastEventAt = now;
  }

  /** Снимок метрик: счётчики вызовов, ошибки, время последнего вызова, число слушателей. */
  getMetrics() {
    const events = {};
    const lastCall = {};
    const errors = {};
    const listeners = {};
    for (const [name, count] of this._counts) {
      events[String(name)] = count;
      lastCall[String(name)] = this._lastAt.get(name).toISOString();
    }
    for (const [name, count] of this._errors) errors[String(name)] = count;
    for (const name of this.eventNames()) listeners[String(name)] = this.listenerCount(name);

    return {
      group: this.group,
      events,
      total: this._total,
      listeners,
      errors,
      lastCall,
      lastEventAt: this._lastEventAt ? this._lastEventAt.toISOString() : null,
      wildcardListeners: this._any.length,
    };
  }

  resetMetrics() {
    this._counts.clear();
    this._errors.clear();
    this._lastAt.clear();
    this._total = 0;
    this._lastEventAt = null;
  }
}

module.exports = { EventBus, GROUP };
