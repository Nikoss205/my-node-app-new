#!/usr/bin/env node
'use strict';

/**
 * Задание 2 (средний уровень): опции и флаги на библиотеке commander.
 */
const fs = require('node:fs');
const path = require('node:path');
const { Command, Help } = require('commander');
const { REPORT_TYPES, render } = require('../src/report');
const { SUPPORTED_FORMATS, convert } = require('../src/convert');
const pkg = require('../package.json');

const program = new Command();

// Показываем значения по умолчанию по-русски: (по умолчанию: "html").
// Настройка задаётся ДО создания подкоманд — они наследуют конфигурацию справки.
program.configureHelp({
  optionDescription: (option) =>
    Help.prototype.optionDescription.call(program.createHelp(), option).replace('(default:', '(по умолчанию:'),
});

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version(pkg.version, '-V, --version', 'output the version number')
  .option('-v, --verbose', 'подробный вывод');

/** Выход с ошибкой: сообщение -> stderr, код возврата 1. */
function fail(...lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

// ---------------------------------------------------------------- generate
program
  .command('generate')
  .description('сгенерировать отчёт')
  .option('-t, --type <type>', 'тип отчёта', 'html')
  .option('-o, --output <path>', 'путь для сохранения')
  .option('-f, --force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((opts) => {
    const verbose = program.opts().verbose;
    const log = (msg) => verbose && console.log(`[VERBOSE] ${msg}`);

    // Валидация значения опции
    if (!REPORT_TYPES.includes(opts.type)) {
      fail(`Ошибка: недопустимый тип отчёта "${opts.type}".`, `Допустимые значения: ${REPORT_TYPES.join(', ')}`);
    }
    const output = opts.output || `./output.${opts.type}`;

    log('Запуск генерации отчёта...');
    log(`Тип отчёта: ${opts.type}`);
    log(`Путь сохранения: ${output}`);

    if (opts.dryRun) {
      console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${opts.type}`);
      console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
      console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
      return;
    }

    if (fs.existsSync(output) && !opts.force) {
      fail(`Ошибка: файл "${output}" уже существует.`, 'Используйте --force для перезаписи.');
    }

    fs.writeFileSync(output, render(opts.type));
    console.log(`Отчёт успешно сгенерирован: ${output}`);
  });

// ----------------------------------------------------------------- convert
program
  .command('convert')
  .description('конвертировать файл')
  .option('-i, --input <path>', 'входной файл (json или csv)')
  .option('-o, --output <path>', 'путь для сохранения (по умолчанию: рядом с входным файлом)')
  .option('-f, --format <format>', 'целевой формат: json или csv (по умолчанию: противоположный входному)')
  .option('--force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((opts) => {
    const verbose = program.opts().verbose;
    const log = (msg) => verbose && console.log(`[VERBOSE] ${msg}`);

    if (!opts.input) fail('Ошибка: не указан входной файл.', 'Используйте: my-cli convert --input <путь>');
    if (!fs.existsSync(opts.input)) fail(`Ошибка: файл "${opts.input}" не найден.`);

    const from = path.extname(opts.input).slice(1).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(from)) {
      fail(`Ошибка: неподдерживаемый формат входного файла "${from}".`, `Допустимые значения: ${SUPPORTED_FORMATS.join(', ')}`);
    }
    const to = (opts.format || (from === 'json' ? 'csv' : 'json')).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(to)) {
      fail(`Ошибка: недопустимый формат "${to}".`, `Допустимые значения: ${SUPPORTED_FORMATS.join(', ')}`);
    }
    const output = opts.output || path.join(path.dirname(opts.input), `${path.basename(opts.input, path.extname(opts.input))}.${to}`);

    log(`Вход: ${opts.input} (${from})`);
    log(`Выход: ${output} (${to})`);

    if (opts.dryRun) {
      console.log(`[DRY-RUN] Будет выполнена конвертация ${from} -> ${to}`);
      console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
      console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
      return;
    }
    if (fs.existsSync(output) && !opts.force) {
      fail(`Ошибка: файл "${output}" уже существует.`, 'Используйте --force для перезаписи.');
    }

    let result;
    try {
      result = convert(fs.readFileSync(opts.input, 'utf8'), from, to);
    } catch (e) {
      fail(`Ошибка: не удалось прочитать "${opts.input}": ${e.message}`);
    }
    fs.writeFileSync(output, result);
    console.log(`Файл сконвертирован: ${output}`);
  });

program.parse(process.argv);
