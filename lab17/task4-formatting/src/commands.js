'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { colorOut, log, plural } = require('./format');
const { isDecorated, createSpinner, createProgress } = require('./ui');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function exists(file) {
  try {
    await fsp.access(file, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/** «Обработка» файла: считаем байты, строки и слова. */
async function analyzeFile(file) {
  const text = await fsp.readFile(file, 'utf8');
  return {
    file,
    bytes: Buffer.byteLength(text),
    lines: text === '' ? 0 : text.split(/\r?\n/).length,
    words: (text.match(/\S+/g) || []).length,
  };
}

function requireFiles(opts) {
  if (!opts.files || opts.files.length === 0) {
    log.error('Не указаны файлы. Используйте: --files <файл...>');
    process.exitCode = 1;
    return false;
  }
  return true;
}

// ------------------------------------------------------------------ process
async function processCommand(opts) {
  if (!requireFiles(opts)) return;

  const decorated = isDecorated(opts);
  const delay = Number(opts.delay) || 0;

  // 1. Поиск файлов
  const finding = createSpinner('Поиск файлов...', decorated).start();
  await sleep(delay);
  const checks = await Promise.all(opts.files.map(async (f) => [f, await exists(f)]));
  const found = checks.filter(([, ok]) => ok).map(([f]) => f);
  const missing = checks.filter(([, ok]) => !ok).map(([f]) => f);
  if (missing.length === 0) finding.succeed(`Файлы найдены (${found.length} шт.)`);
  else finding.stop();

  // 2. Обработка: спиннер для небольшого числа файлов, прогресс-бар для большого (или с --progress)
  const useBar = decorated && (found.length >= 5 || opts.progress);
  const working = createSpinner('Обработка файлов...', decorated && !useBar).start();
  const bar = createProgress(found.length, useBar);
  bar.start();

  const results = [];
  for (const file of found) {
    await sleep(delay);
    results.push(await analyzeFile(file));
    bar.increment();
  }
  bar.stop();

  // 3. Отчёт о ходе работы (stderr)
  if (missing.length === 0) {
    if (useBar) log.success('Обработка завершена');
    else working.succeed('Обработка завершена');
  } else {
    working.stop();
    if (decorated) results.forEach((r) => log.success(`Файл ${r.file} обработан`));
    missing.forEach((f) => log.error(`Файл ${f} не найден`));
    if (decorated) {
      log.warn(`Пропущено ${plural(missing.length, ['файл', 'файла', 'файлов'])}`);
    } else {
      log.warn(`Обработано ${plural(results.length, ['файл', 'файла', 'файлов'])} из ${opts.files.length} (отсутствует: ${missing.join(', ')})`);
    }
    process.exitCode = 1;
  }

  // 4. Результат (данные): в терминале по умолчанию — в файл output.json,
  //    при перенаправлении (> result.json, | jq) — в stdout. --output задаёт назначение явно ("-" = stdout).
  const json = JSON.stringify({ processed: results, skipped: missing }, null, 2) + '\n';
  const target = opts.output || (process.stdout.isTTY ? 'output.json' : '-');
  if (target === '-') {
    process.stdout.write(json);
  } else {
    await fsp.writeFile(target, json);
    if (decorated) console.log(`Результат сохранён: ${target}`);
  }
}

// -------------------------------------------------------------------- check
/** "Silence is Golden": при успехе ничего не выводит, только код возврата 0. */
async function checkCommand(opts) {
  if (!requireFiles(opts)) return;
  for (const file of opts.files) {
    if (!(await exists(file))) {
      log.error(`Файл ${file} не найден`);
      process.exitCode = 1;
    }
  }
}

// ------------------------------------------------------------------- colors
/** Демонстрация цветов. Пишет в stdout: при `> file` или `| cat` ANSI-коды исчезают. */
function colorsCommand() {
  console.log(colorOut.green('✔ Успех: операция выполнена'));
  console.log(colorOut.yellow('⚠ Предупреждение: файл будет перезаписан'));
  console.log(colorOut.red('✖ Ошибка: файл не найден'));
  console.log(colorOut.blue('ℹ Информация: обработано 3 файла'));
}

module.exports = { processCommand, checkCommand, colorsCommand };
