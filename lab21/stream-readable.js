// Лабораторная работа №21. Задание 1 (Базовый уровень)
// Создание простого Readable-потока и чтение данных в flowing-режиме

const { Readable } = require('stream');

class GroupInfoStream extends Readable {
  constructor(options) {
    super(options);
    this.chunks = [
      'Группа: ББМО-01-23',
      'Студент: Шикель Никита Владимирович',
      'Лабораторная работа: №21',
      'Тема: Потоки в Node.js',
    ];
    this.index = 0;
  }

  // Вызывается потоком, когда ему нужны новые данные
  _read(size) {
    // Небольшая задержка, чтобы было видно: данные приходят по частям
    setTimeout(() => {
      if (this.index < this.chunks.length) {
        this.push(this.chunks[this.index++]); // отдаём очередной чанк
      } else {
        this.push(null); // null = данных больше нет (конец потока)
      }
    }, 300);
  }
}

console.log('=== Демонстрация Readable-потока ===');

const readable = new GroupInfoStream({ encoding: 'utf8' });

let chunkCount = 0;
let totalBytes = 0;

// Подписка на 'data' переключает поток в flowing-режим
readable.on('data', (chunk) => {
  chunkCount++;
  totalBytes += Buffer.byteLength(chunk, 'utf8');
  console.log(`[CHUNK ${chunkCount}] ${chunk}`);
});

readable.on('end', () => {
  console.log('[END] Поток завершён');
  console.log(`Всего получено чанков: ${chunkCount}`);
  console.log(`Общий размер данных: ${totalBytes} байт`);
});

readable.on('error', (err) => {
  console.error('[ERROR]', err.message);
});
