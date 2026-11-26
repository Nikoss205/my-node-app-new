// Лабораторная работа №21. Задание 2 (Средний уровень)
// Создание Writable-потока, запись данных и обработка backpressure

const { Writable } = require('stream');
const { once } = require('events');

class ConsoleWriter extends Writable {
  constructor(options) {
    super(options);
    this.writtenChunks = 0;
  }

  // Вызывается для каждого чанка
  _write(chunk, encoding, callback) {
    // Имитируем медленную обработку (например, запись на диск)
    setTimeout(() => {
      console.log(`[WRITE] ${chunk.toString()}`);
      this.writtenChunks++;
      callback(); // сообщаем потоку, что чанк обработан
    }, 200);
  }
}

// highWaterMark: 16 — очень маленький буфер (16 байт), чтобы backpressure был виден
const writer = new ConsoleWriter({ highWaterMark: 16 });

writer.on('drain', () => {
  console.log('[DRAIN] Буфер освобождён, продолжаем запись');
});

writer.on('finish', () => {
  console.log('[FINISH] Все данные записаны');
  console.log(`Всего записано чанков: ${writer.writtenChunks}`);
});

writer.on('error', (err) => {
  console.error('[ERROR]', err.message);
});

// Записывает элементы по одному и соблюдает backpressure:
// если write() вернул false — ждём событие 'drain', потом продолжаем
async function writeAll(stream, items) {
  for (const item of items) {
    console.log(`Записываем: "${item}"`);
    const canContinue = stream.write(item);
    console.log(
      `write() вернул: ${canContinue}` + (canContinue ? '' : '  ← буфер переполнен!')
    );
    if (!canContinue) {
      await once(stream, 'drain'); // ждём освобождения буфера
    }
  }
}

async function main() {
  console.log('=== Демонстрация Writable-потока ===');

  console.log('\n--- Часть 1: строки из задания (каждая больше 16 байт) ---');
  await writeAll(writer, [
    'Группа: ББМО-01-23',
    'Студент: Шикель Никита Владимирович',
    'Лабораторная работа: №21',
    'Тема: Потоки в Node.js',
  ]);

  console.log('\n--- Часть 2: много коротких чанков подряд (по 7 байт) ---');
  const burst = Array.from({ length: 8 }, (_, i) => `Chunk ${i + 1}`);
  await writeAll(writer, burst);

  writer.end(); // завершаем запись -> событие 'finish'
}

main().catch((err) => console.error('[ERROR]', err.message));
