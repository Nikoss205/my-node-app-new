#!/usr/bin/env node
'use strict';

/**
 * Задание 3: наследование от EventEmitter. Класс DatabaseConnection моделирует работу с БД.
 *
 *   node events-class.js           — демонстрация (ошибка без слушателя показана через try/catch)
 *   node events-class.js --crash   — реальное падение процесса из-за события error без слушателя
 */
const EventEmitter = require('node:events');
const { records } = require('./src/format');

const GROUP = 'ББМО-01-23';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class DatabaseConnection extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    // Учебная «таблица» в памяти: 50 студентов
    this.students = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Студент ${i + 1}` }));
  }

  /** Подключение: connecting -> (пауза) -> connect */
  async connect() {
    this.emit('connecting');
    await sleep(50);
    this.connected = true;
    this.emit('connect');
    return this;
  }

  /** Выполнение запроса: эмитит query с SQL и результатом. Ошибки — через событие error. */
  async query(sql) {
    if (!this.connected) {
      this.error('Нет соединения с БД');
      return null;
    }
    await sleep(30);
    const verb = sql.trim().split(/\s+/)[0].toUpperCase();
    let result;
    if (verb === 'SELECT') {
      result = { rows: [...this.students], message: records(this.students.length) };
    } else if (verb === 'INSERT') {
      this.students.push({ id: this.students.length + 1, name: `Студент ${this.students.length + 1}` });
      result = { affected: 1, message: `${records(1)} добавлена` };
    } else {
      this.error(`Неподдерживаемый запрос: ${verb}`);
      return null;
    }
    this.emit('query', sql, result);
    return result;
  }

  /** Закрытие: closing -> (пауза) -> close */
  async close() {
    this.emit('closing');
    await sleep(20);
    this.connected = false;
    this.emit('close');
  }

  /**
   * Эмитит событие error. Событие "error" особенное:
   * если на него нет ни одного слушателя, emit('error') выбрасывает исключение и роняет процесс.
   */
  error(message) {
    this.emit('error', new Error(message));
  }
}

async function main() {
  console.log(`=== DatabaseConnection (группа ${GROUP}) ===`);

  const db = new DatabaseConnection();

  // Подписка на все события и логирование каждого из них
  db.on('connecting', () => console.log('[EVENT] Подключение к БД...'));
  db.on('connect', () => console.log('[EVENT] Соединение установлено'));
  db.on('query', (sql, result) => {
    console.log(`[EVENT] Выполнение запроса: ${sql}`);
    console.log(`[EVENT] Результат: ${result.message}`);
  });
  db.on('closing', () => console.log('[EVENT] Закрытие соединения'));
  db.on('close', () => console.log('[EVENT] Соединение закрыто'));
  db.on('error', (err) => console.log(`[EVENT] Ошибка: ${err.message}`));

  // Последовательность операций
  await db.connect();
  await db.query('SELECT * FROM students');
  await db.query('INSERT INTO students');
  await db.close();

  // «Ошибка как событие»: с обработчиком error программа продолжает работать
  console.log('\n=== Демонстрация ошибки ===');
  db.error('Connection timeout');
  await db.query('SELECT * FROM students'); // соединение закрыто -> тоже событие error, а не исключение

  // Без слушателя error emit('error') выбрасывает исключение
  console.log('\n=== Ошибка без слушателя error ===');
  const bare = new DatabaseConnection();
  try {
    bare.error('Connection timeout');
  } catch (err) {
    console.log(`Выброшено исключение: ${err.message}`);
  }
  console.log('(без слушателя error — процесс упал бы с исключением)');

  if (process.argv.includes('--crash')) {
    console.log(`\n[${GROUP}] Режим --crash: эмитим error без слушателя и без try/catch...`);
    bare.error('Connection timeout'); // Uncaught Error -> процесс завершится с кодом 1
  } else {
    console.log('Чтобы увидеть настоящее падение, запустите: node events-class.js --crash');
  }
}

main();
