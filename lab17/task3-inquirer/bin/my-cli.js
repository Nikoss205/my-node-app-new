#!/usr/bin/env node
'use strict';

/**
 * Задание 3 (продвинутый уровень): интерактивный режим (inquirer) и неинтерактивный (флаги/stdin).
 */
const { Command } = require('commander');
const { PROJECT_TYPES, FEATURES } = require('../src/constants');
const { runInit } = require('../src/init');
const pkg = require('../package.json');

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version(pkg.version, '-V, --version');

const init = program
  .command('init')
  .description('инициализировать проект (интерактивно или через флаги)')
  .option('-n, --name <name>', 'название проекта')
  .option('-t, --type <type>', `тип проекта: ${Object.keys(PROJECT_TYPES).join(' | ')}`);

for (const [key, title] of Object.entries(FEATURES)) {
  init.option(`--${key}`, `добавить ${title}`);
}

init
  .option('--git', 'использовать Git')
  .option('--no-git', 'не использовать Git')
  .option('--token <token>', 'токен доступа')
  .option('--no-interactive', 'отключить интерактивные вопросы (для CI/CD)')
  .action(runInit);

program.parseAsync(process.argv).catch((err) => {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
});
