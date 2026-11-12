#!/usr/bin/env node
'use strict';

/**
 * Задание 4 (сложный уровень): chalk + ora + cli-progress,
 * разделение stdout (данные) и stderr (логи), принцип "Silence is Golden".
 */
const { Command } = require('commander');
const { processCommand, checkCommand, colorsCommand } = require('../src/commands');
const pkg = require('../package.json');

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version(pkg.version, '-V, --version');

program
  .command('process')
  .description('обработать файлы (данные -> stdout/файл, логи -> stderr)')
  .option('-f, --files <files...>', 'список файлов для обработки')
  .option('-o, --output <path>', 'куда сохранить результат ("-" = stdout)')
  .option('-q, --quiet', 'без спиннеров и прогресс-баров')
  .option('--progress', 'всегда показывать прогресс-бар')
  .option('--delay <ms>', 'искусственная задержка на файл, мс (чтобы увидеть спиннер)', '0')
  .action(processCommand);

program
  .command('check')
  .description('проверить наличие файлов (при успехе молчит, только код возврата)')
  .option('-f, --files <files...>', 'список файлов')
  .action(checkCommand);

program
  .command('colors')
  .description('показать цветной вывод: успех / предупреждение / ошибка / информация')
  .action(colorsCommand);

program.parseAsync(process.argv).catch((err) => {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
});
