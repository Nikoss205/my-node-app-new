// Лабораторная работа №21. Задание 3 (Продвинутый уровень)
// pipe() и pipeline(): безопасная обработка ошибок и очистка ресурсов

const fs = require('fs');
const path = require('path');
const { Transform, pipeline } = require('stream');

const INPUT = path.join(__dirname, 'input.txt');
const MISSING = path.join(__dirname, 'missing.txt'); // этого файла не существует
const OUT_PIPE = path.join(__dirname, 'output-pipe.txt');
const OUT_PIPE_ERR = path.join(__dirname, 'output-pipe-error.txt');
const OUT_PIPELINE = path.join(__dirname, 'output-pipeline.txt');
const OUT_PIPELINE_ERR = path.join(__dirname, 'output-pipeline-error.txt');
const OUT_CHAIN = path.join(__dirname, 'output-chain.txt');

const sameContent = (a, b) => fs.readFileSync(a).equals(fs.readFileSync(b));

// ---------- 1. pipe(): успешное копирование ----------
function demoPipe() {
  return new Promise((resolve) => {
    console.log('=== Демонстрация pipe() ===');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipe.txt');

    const reader = fs.createReadStream(INPUT);
    const writer = fs.createWriteStream(OUT_PIPE);

    reader.on('error', (err) => console.log(`✖ Ошибка чтения: ${err.message}`));
    writer.on('error', (err) => console.log(`✖ Ошибка записи: ${err.message}`));
    writer.on('finish', () => {
      console.log('✔ Копирование завершено');
      console.log(`Размер: ${fs.statSync(OUT_PIPE).size} байт`);
      console.log(
        sameContent(INPUT, OUT_PIPE)
          ? '✔ Содержимое input.txt и output-pipe.txt совпадает'
          : '✖ Содержимое файлов различается'
      );
      resolve();
    });

    reader.pipe(writer);
  });
}

// ---------- 2. pipe(): ошибка (несуществующий файл) ----------
function demoPipeError() {
  return new Promise((resolve) => {
    console.log('\n=== Демонстрация pipe() с ошибкой ===');
    console.log('Чтение: missing.txt');

    const reader = fs.createReadStream(MISSING);
    const writer = fs.createWriteStream(OUT_PIPE_ERR);

    reader.on('error', (err) => {
      console.log(`✖ Ошибка: ${err.message}`);

      // Даём время убедиться, что pipe() сам ничего не закроет
      setTimeout(() => {
        console.log(
          `Состояние целевого потока: destroyed = ${writer.destroyed}, ended = ${writer.writableEnded}`
        );
        if (!writer.destroyed) {
          console.log('⚠ Внимание: pipe() не закрыл целевой поток!');
          console.log('⚠ Возможна утечка ресурсов (файловый дескриптор остаётся открытым).');
        }
        // Закрываем вручную, чтобы наш скрипт не оставил утечку
        writer.destroy();
        console.log('(Поток закрыт вручную через destroy())');
        resolve();
      }, 300);
    });

    reader.pipe(writer);
  });
}

// ---------- 3. pipeline(): успешное копирование ----------
function demoPipeline() {
  return new Promise((resolve) => {
    console.log('\n=== Демонстрация pipeline() ===');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipeline.txt');

    pipeline(fs.createReadStream(INPUT), fs.createWriteStream(OUT_PIPELINE), (err) => {
      // Единый колбэк: вызывается и при успехе, и при ошибке
      if (err) {
        console.log(`✖ Ошибка: ${err.message}`);
      } else {
        console.log('✔ Копирование завершено');
        console.log(`Размер: ${fs.statSync(OUT_PIPELINE).size} байт`);
        console.log(
          sameContent(INPUT, OUT_PIPELINE)
            ? '✔ Содержимое input.txt и output-pipeline.txt совпадает'
            : '✖ Содержимое файлов различается'
        );
      }
      resolve();
    });
  });
}

// ---------- 4. pipeline(): ошибка (несуществующий файл) ----------
function demoPipelineError() {
  return new Promise((resolve) => {
    console.log('\n=== Демонстрация pipeline() с ошибкой ===');
    console.log('Чтение: missing.txt');

    const reader = fs.createReadStream(MISSING);
    const writer = fs.createWriteStream(OUT_PIPELINE_ERR);

    pipeline(reader, writer, (err) => {
      if (err) {
        console.log(`✖ Ошибка: ${err.message}`);
        console.log(
          `Состояние потоков: источник destroyed = ${reader.destroyed}, приёмник destroyed = ${writer.destroyed}`
        );
        if (reader.destroyed && writer.destroyed) {
          console.log('✔ Все потоки автоматически закрыты');
          console.log('✔ Утечек нет');
        }
      }
      resolve();
    });
  });
}

// ---------- 5. Цепочка потоков: source.pipe(t1).pipe(t2).pipe(destination) ----------
// Фабрика Transform-потоков для текста. name нужен только для вывода в консоль.
function textTransform(name, fn) {
  return new Transform({
    decodeStrings: false, // не превращаем строки обратно в Buffer на входе
    transform(chunk, encoding, callback) {
      const text = chunk.toString('utf8');
      const result = fn(text);
      console.log(`[${name}] "${text.split('\n')[0].slice(0, 35)}" → "${result.split('\n')[0].slice(0, 35)}"`);
      callback(null, result);
    },
  });
}

function demoChain() {
  return new Promise((resolve) => {
    console.log('\n=== Цепочка потоков ===');
    console.log('input.txt → uppercase → reverse → output-chain.txt');

    const source = fs.createReadStream(INPUT, { encoding: 'utf8' });
    const upperCase = textTransform('UPPERCASE', (s) => s.toUpperCase());
    // reverse: переворачиваем каждую строку по символам
    const reverse = textTransform('REVERSE', (s) =>
      s.split('\n').map((line) => [...line].reverse().join('')).join('\n')
    );
    const destination = fs.createWriteStream(OUT_CHAIN);

    [source, upperCase, reverse, destination].forEach((stream) =>
      stream.on('error', (err) => console.log(`✖ Ошибка в цепочке: ${err.message}`))
    );

    destination.on('finish', () => {
      console.log('✔ Обработка завершена');
      resolve();
    });

    source.pipe(upperCase).pipe(reverse).pipe(destination);
  });
}

// ---------- Вывод содержимого выходных файлов ----------
function showOutputs() {
  console.log('\n=== Содержимое выходных файлов ===');
  const files = [
    { file: OUT_PIPE, lines: 3 },
    { file: OUT_PIPELINE, lines: 3 },
    { file: OUT_CHAIN, lines: 5 },
  ];
  for (const { file, lines } of files) {
    const text = fs.readFileSync(file, 'utf8');
    console.log(`\n--- ${path.basename(file)} (${Buffer.byteLength(text)} байт) ---`);
    console.log(text.split('\n').slice(0, lines).join('\n'));
    console.log('...');
  }
}

async function main() {
  await demoPipe();
  await demoPipeError();
  await demoPipeline();
  await demoPipelineError();
  await demoChain();
  showOutputs();

  // Удаляем пустые файлы, созданные в сценариях с ошибкой
  fs.rmSync(OUT_PIPE_ERR, { force: true });
  fs.rmSync(OUT_PIPELINE_ERR, { force: true });
}

main().catch((err) => console.error('[ERROR]', err.message));
